import fs from 'node:fs/promises';
import path from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';

import { approveDraft } from '../application/use-cases/approve-draft';
import { analyzeLocalBudgetMaterials } from '../application/use-cases/analyze-local-budget-materials';
import { buildLocalAgentResponse } from '../application/use-cases/build-local-agent-response';
import { createAiBudgetModelFromSession } from '../application/use-cases/create-ai-budget-model-from-session';
import { createAiBudgetSession } from '../application/use-cases/create-ai-budget-session';
import { deleteAiBudgetSession } from '../application/use-cases/delete-ai-budget-session';
import { deleteAiBudgetModel } from '../application/use-cases/delete-ai-budget-model';
import { getAiBudgetSession } from '../application/use-cases/get-ai-budget-session';
import { getAiBudgetModel } from '../application/use-cases/get-ai-budget-model';
import { confirmAiBudgetProposal } from '../application/use-cases/confirm-ai-budget-proposal';
import { generateAiBudgetProposalDraft } from '../application/use-cases/generate-ai-budget-proposal-draft';
import { updateAiBudgetSessionStatus } from '../application/use-cases/update-ai-budget-session-status';
import { updateAiBudgetProposalDraft } from '../application/use-cases/update-ai-budget-proposal-draft';
import { reviewAiBudgetProposalDraft } from '../application/use-cases/review-ai-budget-proposal-draft';
import { startAiBudgetSessionFromModel } from '../application/use-cases/start-ai-budget-session-from-model';
import { acceptAiBudgetProposalDraftReview } from '../application/use-cases/accept-ai-budget-proposal-draft-review';
import { rejectAiBudgetProposalDraftReview } from '../application/use-cases/reject-ai-budget-proposal-draft-review';
import { appendAppLog } from '../infrastructure/observability/file-system-app-log';
import type { BlingQuoteGateway } from '../application/gateways/bling-quote-gateway';
import { buildLocalBudgetContext } from '../application/use-cases/build-local-budget-context';
import { confirmFinalApproval } from '../application/use-cases/confirm-final-approval';
import { createBlingQuote } from '../application/use-cases/create-bling-quote';
import { editDraft } from '../application/use-cases/edit-draft';
import { exchangeBlingAuthCode } from '../application/use-cases/exchange-bling-auth-code';
import { refreshBlingToken } from '../application/use-cases/refresh-bling-token';
import { listBlingProducts } from '../application/use-cases/list-bling-products';
import { listAiBudgetModels } from '../application/use-cases/list-ai-budget-models';
import { listAiBudgetSessions } from '../application/use-cases/list-ai-budget-sessions';
import { receiveMessage } from '../application/use-cases/receive-message';
import { resumeSuspendedAnalysis } from '../application/use-cases/resume-suspended-analysis';
import { searchLocalCommercialHistory } from '../application/use-cases/search-local-commercial-history';
import { searchLocalProductCatalog } from '../application/use-cases/search-local-product-catalog';
import {
  buildAppDependencies,
  type AppDependencies,
} from './build-app-dependencies';
import { loadLocalEnv } from '../config/load-local-env';
import { upsertLocalEnv } from '../config/upsert-local-env';
import { BlingHttpQuoteGateway } from '../infrastructure/integrations/bling/bling-http-quote-gateway';
import { BlingHttpProductGateway } from '../infrastructure/integrations/bling/bling-http-product-gateway';
import { InMemoryAiAgentOperationStore } from './ai-agent-operation-store';

export function createApp(dependencies?: Partial<AppDependencies>): FastifyInstance {
  const app = Fastify();
  const appDependencies = buildAppDependencies(
    dependencies ? { overrides: dependencies } : {},
  );
  const aiAgentOperationStore = new InMemoryAiAgentOperationStore();

  app.addHook('onRequest', async (request) => {
    await appendAppLog({
      source: 'http',
      event: 'requisicao_recebida',
      requestId: request.id,
      method: request.method,
      url: request.url,
      body: sanitizeLogValue(request.body),
      query: sanitizeLogValue(request.query),
    }).catch(() => {});
  });

  app.addHook('onResponse', async (request, reply) => {
    await appendAppLog({
      source: 'http',
      event: 'resposta_enviada',
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
    }).catch(() => {});
  });

  app.setErrorHandler(async (error, request, reply) => {
    await appendAppLog({
      source: 'http',
      event: 'requisicao_falhou',
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode || 500,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }).catch(() => {});

    throw error;
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'alltec-nexa',
  }));

  app.get('/local/settings/bling-token', async () => ({
    type: 'bling_token_status_loaded',
    tokenStatus: readBlingTokenStatus(),
  }));

  app.post('/local/settings/bling-token/refresh', async (request, reply) => {
    try {
      const tokenStatus = await refreshConfiguredBlingAccessToken(
        appDependencies,
      );

      return {
        type: 'bling_token_refreshed_and_persisted',
        tokenStatus,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Bling token could not be refreshed.';

      return reply.code(409).send({ error: message });
    }
  });

  app.get('/app', async (_request, reply) => {
    const filePath = path.resolve(process.cwd(), 'public/app.html');
    const content = await fs.readFile(filePath, 'utf-8');

    return reply.type('text/html; charset=utf-8').send(content);
  });

  app.get('/auth/bling/callback', async (request, reply) => {
    const query = request.query as {
      code?: string;
      state?: string;
    };

    if (!query.code) {
      return reply.code(400).send({
        error: 'Missing "code" query parameter.',
      });
    }

    return exchangeBlingAuthCode(
      {
        code: query.code,
        redirectUri: appDependencies.blingRedirectUri,
      },
      {
        blingOAuthGateway: appDependencies.blingOAuthGateway,
      },
    );
  });

  app.post('/messages', async (request, reply) => {
    const body = request.body as {
      channelId: string;
      text: string;
      receivedAt: string;
    };

    const result = await receiveMessage(
      {
        channelId: body.channelId,
        text: body.text,
        receivedAt: new Date(body.receivedAt),
      },
      appDependencies,
    );

    const statusCode = result.type === 'conversation_started' ? 201 : 200;
    return reply.code(statusCode).send(result);
  });

  app.get('/bling/products', async (request) => {
    const query = request.query as {
      search?: string;
      limit?: string;
    };
    const { productGateway } = await ensureFreshBlingGateways(appDependencies);

    return listBlingProducts(
      {
        ...(query.search ? { search: query.search } : {}),
        limit: query.limit ? Number(query.limit) : 20,
      },
      {
        blingProductGateway: productGateway,
      },
    );
  });

  app.get('/local/commercial-history/search', async (request) => {
    const query = request.query as {
      q?: string;
      contactLimit?: string;
      quoteLimitPerContact?: string;
    };

    return searchLocalCommercialHistory(
      {
        query: query.q ?? '',
        ...(query.contactLimit
          ? { contactLimit: Number(query.contactLimit) }
          : {}),
        ...(query.quoteLimitPerContact
          ? { quoteLimitPerContact: Number(query.quoteLimitPerContact) }
          : {}),
      },
      {
        contactCatalogCache: appDependencies.contactCatalogCache,
        quoteHistoryCache: appDependencies.quoteHistoryCache,
        serviceNoteHistoryCache: appDependencies.serviceNoteHistoryCache,
      },
    );
  });

  app.get('/local/products/search', async (request) => {
    const query = request.query as {
      q?: string;
      limit?: string;
    };

    return searchLocalProductCatalog(
      {
        query: query.q ?? '',
        ...(query.limit ? { limit: Number(query.limit) } : {}),
      },
      {
        productCatalogCache: appDependencies.productCatalogCache,
      },
    );
  });

  app.post('/local/budget-context', async (request) => {
    const body = request.body as {
      customerQuery: string;
      materialQueries: string[];
      materialLimitPerQuery?: number;
      quoteLimitPerContact?: number;
    };

    return buildLocalBudgetContext(
      {
        customerQuery: body.customerQuery,
        materialQueries: body.materialQueries,
        ...(body.materialLimitPerQuery !== undefined
          ? { materialLimitPerQuery: body.materialLimitPerQuery }
          : {}),
        ...(body.quoteLimitPerContact !== undefined
          ? { quoteLimitPerContact: body.quoteLimitPerContact }
          : {}),
      },
      {
        contactCatalogCache: appDependencies.contactCatalogCache,
        productCatalogCache: appDependencies.productCatalogCache,
        quoteHistoryCache: appDependencies.quoteHistoryCache,
        serviceNoteHistoryCache: appDependencies.serviceNoteHistoryCache,
      },
    );
  });

  app.post('/local/budget-analysis', async (request) => {
    const body = request.body as {
      customerQuery: string;
      materialQueries: string[];
      materialLimitPerQuery?: number;
      quoteLimitPerContact?: number;
    };

    const context = await buildLocalBudgetContext(
      {
        customerQuery: body.customerQuery,
        materialQueries: body.materialQueries,
        ...(body.materialLimitPerQuery !== undefined
          ? { materialLimitPerQuery: body.materialLimitPerQuery }
          : {}),
        ...(body.quoteLimitPerContact !== undefined
          ? { quoteLimitPerContact: body.quoteLimitPerContact }
          : {}),
      },
      {
        contactCatalogCache: appDependencies.contactCatalogCache,
        productCatalogCache: appDependencies.productCatalogCache,
        quoteHistoryCache: appDependencies.quoteHistoryCache,
        serviceNoteHistoryCache: appDependencies.serviceNoteHistoryCache,
      },
    );

    const materialAnalysis = await analyzeLocalBudgetMaterials({
      materials: context.materials,
    });

    return {
      type: 'local_budget_analysis_built',
      context,
      materialAnalysis,
    };
  });

  app.post('/local/agent-response', async (request) => {
    const body = request.body as {
      originalText: string;
      customerQuery: string;
      materialQueries: string[];
      materialLimitPerQuery?: number;
      quoteLimitPerContact?: number;
    };

    const context = await buildLocalBudgetContext(
      {
        customerQuery: body.customerQuery,
        materialQueries: body.materialQueries,
        ...(body.materialLimitPerQuery !== undefined
          ? { materialLimitPerQuery: body.materialLimitPerQuery }
          : {}),
        ...(body.quoteLimitPerContact !== undefined
          ? { quoteLimitPerContact: body.quoteLimitPerContact }
          : {}),
      },
      {
        contactCatalogCache: appDependencies.contactCatalogCache,
        productCatalogCache: appDependencies.productCatalogCache,
        quoteHistoryCache: appDependencies.quoteHistoryCache,
        serviceNoteHistoryCache: appDependencies.serviceNoteHistoryCache,
      },
    );

    const materialAnalysis = await analyzeLocalBudgetMaterials({
      materials: context.materials,
    });

    return buildLocalAgentResponse({
      originalText: body.originalText,
      budgetContext: context,
      materialAnalysis,
    });
  });

  app.post('/local/ai-agent-response', async (request, reply) => {
    const body = request.body as {
      sessionId?: string;
      originalText: string;
      materialLimitPerQuery?: number;
      quoteLimitPerContact?: number;
      defaultAiModel?: string;
    };

    try {
      return await createAiBudgetSession(
        {
          ...(body.sessionId ? { sessionId: body.sessionId } : {}),
          originalText: body.originalText,
          ...(body.materialLimitPerQuery !== undefined
            ? { materialLimitPerQuery: body.materialLimitPerQuery }
            : {}),
          ...(body.quoteLimitPerContact !== undefined
            ? { quoteLimitPerContact: body.quoteLimitPerContact }
            : {}),
          ...(body.defaultAiModel !== undefined
            ? { defaultAiModel: body.defaultAiModel }
            : {}),
        },
        {
          contactCatalogCache: appDependencies.contactCatalogCache,
          productCatalogCache: appDependencies.productCatalogCache,
          quoteHistoryCache: appDependencies.quoteHistoryCache,
          serviceNoteHistoryCache: appDependencies.serviceNoteHistoryCache,
          openAIBudgetAssistantGateway: appDependencies.openAIBudgetAssistantGateway,
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
        },
      );
    } catch (error) {
      if (body.sessionId) {
        return reply.code(404).send({
          error:
            error instanceof Error
              ? error.message
              : 'AI budget session was not found.',
        });
      }

      throw error;
    }
  });

  app.post('/local/ai-agent-response/start', async (request, reply) => {
    const body = request.body as {
      sessionId?: string;
      originalText: string;
      materialLimitPerQuery?: number;
      quoteLimitPerContact?: number;
      defaultAiModel?: string;
    };
    const operation = aiAgentOperationStore.create({
      userMessage:
        'Recebemos sua solicitação. O NEXA vai iniciar a análise em instantes.',
    });

    void (async () => {
      try {
        const payload = await createAiBudgetSession(
          {
            ...(body.sessionId ? { sessionId: body.sessionId } : {}),
            originalText: body.originalText,
            ...(body.materialLimitPerQuery !== undefined
              ? { materialLimitPerQuery: body.materialLimitPerQuery }
              : {}),
            ...(body.quoteLimitPerContact !== undefined
              ? { quoteLimitPerContact: body.quoteLimitPerContact }
              : {}),
            ...(body.defaultAiModel !== undefined
              ? { defaultAiModel: body.defaultAiModel }
              : {}),
          },
          {
            contactCatalogCache: appDependencies.contactCatalogCache,
            productCatalogCache: appDependencies.productCatalogCache,
            quoteHistoryCache: appDependencies.quoteHistoryCache,
            serviceNoteHistoryCache: appDependencies.serviceNoteHistoryCache,
            openAIBudgetAssistantGateway: appDependencies.openAIBudgetAssistantGateway,
            aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
            onProgress: (progress) => {
              aiAgentOperationStore.update(operation.id, progress);
            },
          },
        );

        aiAgentOperationStore.complete(operation.id, payload);
      } catch (error) {
        aiAgentOperationStore.fail(
          operation.id,
          error instanceof Error ? error.message : 'Falha desconhecida ao processar a solicitação.',
        );
      }
    })();

    return reply.code(202).send({
      type: 'ai_agent_operation_started',
      operationId: operation.id,
      status: operation.status,
      phase: operation.phase,
      userMessage: operation.userMessage,
      startedAt: operation.startedAt,
    });
  });

  app.get('/local/ai-operations/:operationId', async (request, reply) => {
    const params = request.params as { operationId: string };
    const operation = aiAgentOperationStore.get(params.operationId);

    if (!operation) {
      return reply.code(404).send({
        error: `AI agent operation "${params.operationId}" was not found.`,
      });
    }

    return {
      type: 'ai_agent_operation_status',
      operation,
    };
  });

  app.get('/local/ai-sessions', async (request) => {
    const query = request.query as { limit?: string };

    return listAiBudgetSessions(
      {
        ...(query.limit ? { limit: Number(query.limit) } : {}),
      },
      {
        aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
      },
    );
  });

  app.get('/local/ai-models', async (request) => {
    const query = request.query as {
      limit?: string;
    };

    return listAiBudgetModels(
      {
        limit: query.limit ? Number(query.limit) : 20,
      },
      {
        aiBudgetModelRepository: appDependencies.aiBudgetModelRepository,
      },
    );
  });

  app.get('/local/ai-sessions/:sessionId', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      return await getAiBudgetSession(
        {
          sessionId: params.sessionId,
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
        },
      );
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : 'AI budget session was not found.',
      });
    }
  });

  app.get('/local/ai-models/:modelId', async (request, reply) => {
    const params = request.params as { modelId: string };

    try {
      return await getAiBudgetModel(
        {
          modelId: params.modelId,
        },
        {
          aiBudgetModelRepository: appDependencies.aiBudgetModelRepository,
        },
      );
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : 'AI budget model was not found.',
      });
    }
  });

  app.post('/local/ai-models/:modelId/start', async (request, reply) => {
    const params = request.params as { modelId: string };
    const body = request.body as { mode?: 'use' | 'edit' };

    try {
      return await startAiBudgetSessionFromModel(
        {
          modelId: params.modelId,
          mode: body.mode === 'edit' ? 'edit' : 'use',
        },
        {
          aiBudgetModelRepository: appDependencies.aiBudgetModelRepository,
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'AI budget model could not be started.';

      return reply.code(/does not reference a Bling quote/.test(message) ? 409 : 404).send({
        error: message,
      });
    }
  });

  app.delete('/local/ai-sessions/:sessionId', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      return await deleteAiBudgetSession(
        {
          sessionId: params.sessionId,
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
        },
      );
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : 'AI budget session was not found.',
      });
    }
  });

  app.delete('/local/ai-models/:modelId', async (request) => {
    const params = request.params as { modelId: string };

    return deleteAiBudgetModel(
      {
        modelId: params.modelId,
      },
      {
        aiBudgetModelRepository: appDependencies.aiBudgetModelRepository,
      },
    );
  });

  app.post('/local/ai-sessions/:sessionId/approve', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      return await updateAiBudgetSessionStatus(
        {
          sessionId: params.sessionId,
          status: 'Aprovado para proposta',
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
        },
      );
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : 'AI budget session was not found.',
      });
    }
  });

  app.post('/local/ai-sessions/:sessionId/review', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      return await updateAiBudgetSessionStatus(
        {
          sessionId: params.sessionId,
          status: 'Aguardando aprovacao',
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
        },
      );
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : 'AI budget session was not found.',
      });
    }
  });

  app.post('/local/ai-sessions/:sessionId/cancel', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      return await updateAiBudgetSessionStatus(
        {
          sessionId: params.sessionId,
          status: 'Cancelado',
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
        },
      );
    } catch (error) {
      return reply.code(404).send({
        error: error instanceof Error ? error.message : 'AI budget session was not found.',
      });
    }
  });

  app.post('/local/ai-sessions/:sessionId/proposal-draft', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      return await generateAiBudgetProposalDraft(
        {
          sessionId: params.sessionId,
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
          productCatalogCache: appDependencies.productCatalogCache,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI budget proposal draft could not be generated.';

      const statusCode = /must be approved/.test(message) ? 409 : 404;
      return reply.code(statusCode).send({ error: message });
    }
  });

  app.post('/local/ai-sessions/:sessionId/proposal-draft/save', async (request, reply) => {
    const params = request.params as { sessionId: string };
    const body = request.body as {
      commercialBody?: string;
      reviewInstructions?: string;
    };

    try {
      return await updateAiBudgetProposalDraft(
        {
          sessionId: params.sessionId,
          commercialBody: body.commercialBody ?? '',
          reviewInstructions: body.reviewInstructions ?? '',
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
          productCatalogCache: appDependencies.productCatalogCache,
          openAIBudgetAssistantGateway: appDependencies.openAIBudgetAssistantGateway,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI budget proposal draft could not be updated.';

      const statusCode = /must be in proposal review|must have a generated proposal draft/.test(
        message,
      )
        ? 409
        : 404;
      return reply.code(statusCode).send({ error: message });
    }
  });

  app.post('/local/ai-sessions/:sessionId/proposal-draft/review', async (request, reply) => {
    const params = request.params as { sessionId: string };
    const body = request.body as {
      reviewModel?: string;
      reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only';
    } | undefined;

    try {
      return await reviewAiBudgetProposalDraft(
        {
          sessionId: params.sessionId,
          reviewModel: body?.reviewModel ?? null,
          reviewBehavior: body?.reviewBehavior ?? 'manual',
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
          openAIBudgetAssistantGateway: appDependencies.openAIBudgetAssistantGateway,
          contactCatalogCache: appDependencies.contactCatalogCache,
          productCatalogCache: appDependencies.productCatalogCache,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI budget proposal draft could not be reviewed.';

      const statusCode = /must be in proposal review|must have a generated proposal draft/.test(
        message,
      )
        ? 409
        : /OpenAI budget assistant request|response could not be parsed|did not include output_text/i.test(
              message,
            )
          ? 502
          : 404;
      return reply.code(statusCode).send({ error: message });
    }
  });

  app.post('/local/ai-sessions/:sessionId/proposal-draft/review/accept', async (request, reply) => {
    const params = request.params as { sessionId: string };
    const body = request.body as {
      commercialBody?: string;
    };

    try {
      return await acceptAiBudgetProposalDraftReview(
        {
          sessionId: params.sessionId,
          commercialBody: body.commercialBody ?? '',
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
          openAIBudgetAssistantGateway: appDependencies.openAIBudgetAssistantGateway,
          productCatalogCache: appDependencies.productCatalogCache,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI budget proposal draft review could not be accepted.';

      const statusCode =
        /must be in proposal review|must have a generated proposal draft|must have an AI draft review/.test(
          message,
        )
          ? 409
          : 404;
      return reply.code(statusCode).send({ error: message });
    }
  });

  app.post('/local/ai-sessions/:sessionId/proposal-draft/review/reject', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      return await rejectAiBudgetProposalDraftReview(
        {
          sessionId: params.sessionId,
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI budget proposal draft review could not be rejected.';

      const statusCode =
        /must be in proposal review|must have an AI draft review/.test(message)
          ? 409
          : 404;
      return reply.code(statusCode).send({ error: message });
    }
  });

  app.post('/local/ai-sessions/:sessionId/save-as-model', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      return await createAiBudgetModelFromSession(
        {
          sessionId: params.sessionId,
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
          aiBudgetModelRepository: appDependencies.aiBudgetModelRepository,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI budget model could not be created from session.';

      const statusCode = /must be finalized|must have a proposal draft/.test(message)
        ? 409
        : 404;
      return reply.code(statusCode).send({ error: message });
    }
  });

  app.post('/local/ai-sessions/:sessionId/confirm-proposal', async (request, reply) => {
    const params = request.params as { sessionId: string };

    try {
      const { quoteGateway } = await ensureFreshBlingGateways(appDependencies);

      return await confirmAiBudgetProposal(
        {
          sessionId: params.sessionId,
        },
        {
          aiBudgetSessionRepository: appDependencies.aiBudgetSessionRepository,
          blingQuoteGateway: quoteGateway,
          contactCatalogCache: appDependencies.contactCatalogCache,
          productCatalogCache: appDependencies.productCatalogCache,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'AI budget proposal could not be confirmed.';

      const statusCode = /must have a generated proposal draft/.test(message)
        ? 409
        : /does not have a resolved Bling contact/i.test(message)
          ? 409
        : /Bling quote creation|timed out/i.test(message)
          ? 502
          : 404;
      return reply.code(statusCode).send({ error: message });
    }
  });

  app.post('/drafts/:conversationId/edit', async (request) => {
    const params = request.params as { conversationId: string };
    const body = request.body as {
      channelId: string;
      structuredText: string;
      editedAt: string;
    };

    return editDraft(
      {
        channelId: body.channelId,
        conversationId: params.conversationId,
        structuredText: body.structuredText,
        editedAt: new Date(body.editedAt),
      },
      {
        conversationRepository: appDependencies.conversationRepository,
      },
    );
  });

  app.post('/drafts/:conversationId/approve', async (request) => {
    const params = request.params as { conversationId: string };
    const body = request.body as {
      channelId: string;
      approvedAt: string;
      versionNumber?: number;
    };

    return approveDraft(
      {
        channelId: body.channelId,
        conversationId: params.conversationId,
        approvedAt: new Date(body.approvedAt),
        ...(body.versionNumber !== undefined
          ? { versionNumber: body.versionNumber }
          : {}),
      },
      {
        conversationRepository: appDependencies.conversationRepository,
      },
    );
  });

  app.post('/conversations/:conversationId/confirm-final-approval', async (request) => {
    const params = request.params as { conversationId: string };
    const body = request.body as {
      channelId: string;
      confirmedAt: string;
    };

    return confirmFinalApproval(
      {
        channelId: body.channelId,
        conversationId: params.conversationId,
        confirmedAt: new Date(body.confirmedAt),
      },
      {
        conversationRepository: appDependencies.conversationRepository,
      },
    );
  });

  app.post('/conversations/:conversationId/create-bling-quote', async (request, reply) => {
    const params = request.params as { conversationId: string };
    const body = request.body as {
      requestedAt: string;
    };

    const result = await createBlingQuote(
      {
        conversationId: params.conversationId,
        requestedAt: new Date(body.requestedAt),
      },
      {
        conversationRepository: appDependencies.conversationRepository,
        blingQuoteGateway: appDependencies.blingQuoteGateway,
      },
    );

    return reply.code(201).send(result);
  });

  app.post('/suspended-analyses/:suspendedAnalysisId/resume', async (request) => {
    const params = request.params as { suspendedAnalysisId: string };
    const body = request.body as {
      channelId: string;
      resumedAt: string;
    };

    return resumeSuspendedAnalysis(
      {
        channelId: body.channelId,
        suspendedAnalysisId: params.suspendedAnalysisId,
        resumedAt: new Date(body.resumedAt),
      },
      {
        conversationRepository: appDependencies.conversationRepository,
        suspendedAnalysisRepository: appDependencies.suspendedAnalysisRepository,
      },
    );
  });

  return app;
}

async function ensureFreshBlingGateways(
  appDependencies: AppDependencies,
): Promise<{
  quoteGateway: BlingQuoteGateway;
  productGateway: AppDependencies['blingProductGateway'];
}> {
  if (
    !(appDependencies.blingQuoteGateway instanceof BlingHttpQuoteGateway) ||
    !(appDependencies.blingProductGateway instanceof BlingHttpProductGateway)
  ) {
    return {
      quoteGateway: appDependencies.blingQuoteGateway,
      productGateway: appDependencies.blingProductGateway,
    };
  }

  const env = readRuntimeEnv();
  const tokenStatus = readBlingTokenStatus(env);

  if (!env.BLING_API_BASE_URL || !env.BLING_ACCESS_TOKEN) {
    return {
      quoteGateway: appDependencies.blingQuoteGateway,
      productGateway: appDependencies.blingProductGateway,
    };
  }

  if (
    tokenStatus.status === 'expired' ||
    tokenStatus.status === 'expiring_soon' ||
    tokenStatus.status === 'unknown'
  ) {
    const refreshed = await refreshConfiguredBlingAccessToken(appDependencies);

    return {
      quoteGateway: new BlingHttpQuoteGateway({
        baseUrl: refreshed.apiBaseUrl,
        accessToken: refreshed.accessToken,
      }),
      productGateway: new BlingHttpProductGateway({
        baseUrl: refreshed.apiBaseUrl,
        accessToken: refreshed.accessToken,
      }),
    };
  }

  return {
    quoteGateway: new BlingHttpQuoteGateway({
      baseUrl: env.BLING_API_BASE_URL,
      accessToken: env.BLING_ACCESS_TOKEN,
    }),
    productGateway: new BlingHttpProductGateway({
      baseUrl: env.BLING_API_BASE_URL,
      accessToken: env.BLING_ACCESS_TOKEN,
    }),
  };
}

async function refreshConfiguredBlingAccessToken(
  appDependencies: AppDependencies,
) {
  const env = readRuntimeEnv();
  const refreshToken = env.BLING_REFRESH_TOKEN;
  const apiBaseUrl = env.BLING_API_BASE_URL;

  if (!refreshToken || !apiBaseUrl) {
    throw new Error(
      'Bling token refresh is not configured. Set BLING_API_BASE_URL and BLING_REFRESH_TOKEN.',
    );
  }

  const result = await refreshBlingToken(
    {
      refreshToken,
    },
    {
      blingOAuthGateway: appDependencies.blingOAuthGateway,
    },
  );

  const expiresAt = new Date(
    Date.now() + result.tokens.expiresIn * 1000,
  ).toISOString();

  await upsertLocalEnv({
    BLING_ACCESS_TOKEN: result.tokens.accessToken,
    BLING_REFRESH_TOKEN: result.tokens.refreshToken,
    BLING_ACCESS_TOKEN_EXPIRES_AT: expiresAt,
  });

  process.env.BLING_ACCESS_TOKEN = result.tokens.accessToken;
  process.env.BLING_REFRESH_TOKEN = result.tokens.refreshToken;
  process.env.BLING_ACCESS_TOKEN_EXPIRES_AT = expiresAt;

  await appendAppLog({
    source: 'bling',
    event: 'token_renovado',
    expiresAt,
  }).catch(() => {});

  return {
    configured: true,
    status: 'valid',
    apiBaseUrl,
    accessToken: result.tokens.accessToken,
    refreshToken: result.tokens.refreshToken,
    expiresAt,
    expiresInMinutes: Math.max(0, Math.round(result.tokens.expiresIn / 60)),
    refreshAvailable: true,
  } as const;
}

function readRuntimeEnv(): Record<string, string | undefined> {
  return {
    ...loadLocalEnv(),
    ...process.env,
  };
}

function readBlingTokenStatus(
  env: Record<string, string | undefined> = readRuntimeEnv(),
) {
  const accessToken = env.BLING_ACCESS_TOKEN ?? null;
  const refreshToken = env.BLING_REFRESH_TOKEN ?? null;
  const apiBaseUrl = env.BLING_API_BASE_URL ?? null;
  const expiresAt = env.BLING_ACCESS_TOKEN_EXPIRES_AT ?? null;

  if (!apiBaseUrl || !accessToken) {
    return {
      configured: false,
      status: 'unconfigured',
      expiresAt: null,
      expiresInMinutes: null,
      refreshAvailable: Boolean(refreshToken),
    } as const;
  }

  if (!expiresAt) {
    return {
      configured: true,
      status: 'unknown',
      expiresAt: null,
      expiresInMinutes: null,
      refreshAvailable: Boolean(refreshToken),
    } as const;
  }

  const expiresDate = new Date(expiresAt);
  if (Number.isNaN(expiresDate.getTime())) {
    return {
      configured: true,
      status: 'unknown',
      expiresAt,
      expiresInMinutes: null,
      refreshAvailable: Boolean(refreshToken),
    } as const;
  }

  const diffMs = expiresDate.getTime() - Date.now();
  const expiresInMinutes = Math.round(diffMs / 60000);

  return {
    configured: true,
    status:
      diffMs <= 0
        ? 'expired'
        : diffMs <= 5 * 60 * 1000
          ? 'expiring_soon'
          : 'valid',
    expiresAt,
    expiresInMinutes,
    refreshAvailable: Boolean(refreshToken),
  } as const;
}

function sanitizeLogValue(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value ?? null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, current]) => [
        key,
        /authorization|api[_-]?key|token|secret/i.test(key)
          ? '[REDACTED]'
          : sanitizeLogValue(current),
      ]),
    );
  }

  return value;
}
