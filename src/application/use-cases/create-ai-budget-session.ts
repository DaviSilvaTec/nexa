import { randomUUID } from 'node:crypto';

import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../catalog/bling-service-note-history-cache';
import type { OpenAIBudgetAssistantGateway } from '../gateways/openai-budget-assistant-gateway';
import type { AiBudgetSessionRepository } from '../repositories/ai-budget-session-repository';
import { buildAiAssistedAgentResponse } from './build-ai-assisted-agent-response';
import { updateAiBudgetWorkflowState } from './update-ai-budget-workflow-state';

interface CreateAiBudgetSessionInput {
  sessionId?: string;
  originalText: string;
  materialLimitPerQuery?: number;
  quoteLimitPerContact?: number;
  defaultAiModel?: string | null;
  createdAt?: Date;
}

interface CreateAiBudgetSessionDependencies {
  contactCatalogCache: BlingContactCatalogCache;
  productCatalogCache: BlingProductCatalogCache;
  quoteHistoryCache: BlingQuoteHistoryCache;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
  openAIBudgetAssistantGateway: OpenAIBudgetAssistantGateway;
  aiBudgetSessionRepository: AiBudgetSessionRepository;
  onProgress?: (input: {
    phase:
      | 'extracting_intake'
      | 'building_context'
      | 'interpreting_request'
      | 'saving_session';
    userMessage: string;
  }) => Promise<void> | void;
}

export async function createAiBudgetSession(
  input: CreateAiBudgetSessionInput,
  dependencies: CreateAiBudgetSessionDependencies,
) {
  const existingSession = input.sessionId
    ? await dependencies.aiBudgetSessionRepository.findById(input.sessionId)
    : null;

  if (input.sessionId && !existingSession) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  const response = await buildAiAssistedAgentResponse(
    {
      originalText: input.originalText,
      ...(input.materialLimitPerQuery !== undefined
        ? { materialLimitPerQuery: input.materialLimitPerQuery }
        : {}),
      ...(input.quoteLimitPerContact !== undefined
        ? { quoteLimitPerContact: input.quoteLimitPerContact }
        : {}),
      ...(input.defaultAiModel !== undefined
        ? { defaultAiModel: input.defaultAiModel }
        : {}),
    },
    {
      contactCatalogCache: dependencies.contactCatalogCache,
      productCatalogCache: dependencies.productCatalogCache,
      quoteHistoryCache: dependencies.quoteHistoryCache,
      serviceNoteHistoryCache: dependencies.serviceNoteHistoryCache,
      openAIBudgetAssistantGateway: dependencies.openAIBudgetAssistantGateway,
      ...(dependencies.onProgress
        ? {
            onProgress: dependencies.onProgress,
          }
        : {}),
    },
  );

  const timestamp = (input.createdAt ?? new Date()).toISOString();
  const resolvedCustomer = extractResolvedCustomer(response);
  const session = {
    id: existingSession?.id ?? randomUUID(),
    createdAt: existingSession?.createdAt ?? timestamp,
    updatedAt: timestamp,
    originalText: input.originalText,
    customerQuery: response.intakeExtraction.extraction.customerQuery,
    confidence: response.aiResponse.interpretation.confidence,
    status: response.localResponse.response.status,
    payload: updateAiBudgetWorkflowState(
      {
      ...response,
      ...(resolvedCustomer ? { resolvedCustomer } : {}),
      },
      timestamp,
      {
        currentStage: 'initial_interpretation_completed',
        currentStageLabel: 'Interpretação inicial concluída',
        originalTextCapturedAt: timestamp,
        firstInterpretationCompletedAt: timestamp,
        availableData: {
          hasOriginalText: input.originalText.trim().length > 0,
          hasInitialInterpretation: true,
          hasCustomerCandidates:
            Boolean(response.aiContext.payload.customer) ||
            response.intakeExtraction.extraction.customerQuery !== null,
          hasExpandedMaterialCandidates:
            response.aiContext.payload.materialCandidates.length > 0,
        },
      },
    ),
  } as const;

  await dependencies.aiBudgetSessionRepository.save(session);

  return {
    ...response,
    session: {
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      customerQuery: session.customerQuery,
      confidence: session.confidence,
      status: session.status,
    },
  };
}

function extractResolvedCustomer(response: {
  aiContext?: {
    payload?: {
      customer?: {
        contact?: {
          id?: string;
          name?: string;
          code?: string | null;
          documentNumber?: string | null;
          phone?: string | null;
          mobilePhone?: string | null;
        };
      } | null;
    };
  };
}) {
  const contact = response.aiContext?.payload?.customer?.contact;

  if (!contact?.id || !contact?.name) {
    return null;
  }

  return {
    id: contact.id,
    name: contact.name,
    code: contact.code ?? null,
    documentNumber: contact.documentNumber ?? null,
    phone: contact.phone ?? null,
    mobilePhone: contact.mobilePhone ?? null,
  };
}
