import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app/create-app';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemoryAiBudgetModelRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-model-repository';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';
import { InMemorySuspendedAnalysisRepository } from '../src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';
import { InMemoryBlingQuoteGateway } from '../src/infrastructure/integrations/bling/in-memory-bling-quote-gateway';
import type { BlingContactCatalogCache } from '../src/application/catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../src/application/catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../src/application/catalog/bling-service-note-history-cache';
import type { BlingProductGateway } from '../src/application/gateways/bling-product-gateway';
import type { BlingQuoteGateway } from '../src/application/gateways/bling-quote-gateway';
import type { OpenAIBudgetAssistantGateway } from '../src/application/gateways/openai-budget-assistant-gateway';

class FakeBlingProductGateway implements BlingProductGateway {
  async listProducts() {
    return { items: [], total: 0, appliedSearch: null };
  }
}

class FailingBlingQuoteGateway implements BlingQuoteGateway {
  async createQuote(): Promise<import('../src/application/gateways/bling-quote-gateway').BlingCreatedQuote> {
    throw new Error('Bling quote creation timed out after 15000ms.');
  }

  async updateQuote(): Promise<import('../src/application/gateways/bling-quote-gateway').BlingCreatedQuote> {
    throw new Error('Bling quote update timed out after 15000ms.');
  }

  async listQuotes() {
    return { items: [], total: 0 };
  }
}

class FakeOpenAIBudgetAssistantGateway implements OpenAIBudgetAssistantGateway {
  public lastReviewModelOverride: string | null = null;
  public lastExtractModelOverride: string | null = null;
  public lastInterpretModelOverride: string | null = null;

  async extractBudgetIntake(
    _originalText?: string,
    options?: { modelOverride?: string | null },
  ) {
    this.lastExtractModelOverride = options?.modelOverride ?? null;

    return {
      type: 'budget_intake_extracted' as const,
      extraction: {
        customerQuery: 'cliente exemplo',
        materialQueries: ['cabo pp 3 x 1,5'],
        serviceHints: ['instalacao'],
        ambiguities: [],
      },
    };
  }

  async interpretBudgetRequest(
    _payload?: unknown,
    options?: { modelOverride?: string | null },
  ) {
    this.lastInterpretModelOverride = options?.modelOverride ?? null;

    return {
      type: 'budget_request_interpreted' as const,
      interpretation: {
        summaryTitle: 'Resposta estruturada assistida IA',
        budgetDescription: 'Resposta estruturada assistida por IA.',
        workDescription: 'Execução prevista conforme contexto local.',
        materialItems: [
          {
            description: 'Material sugerido',
            quantityText: '1 unidade',
            sourceQuery: 'material sugerido',
            catalogItemId: '1',
            catalogItemName: 'Material do catalogo',
          },
        ],
        serviceItems: [
          {
            description: 'Serviço sugerido',
            quantityText: '1 serviço',
            estimatedValueText: 'R$ 180 a R$ 320',
          },
        ],
        laborPriceResearch: {
          status: 'estimado' as const,
          summary: 'Estimativa inicial fraca de mão de obra.',
          estimatedLaborRange: 'R$ 180 a R$ 320',
          estimatedHours: '3 a 5 horas',
          basis: 'descricao do trabalho e materiais normalizados',
          confidence: 'baixo' as const,
        },
        pendingQuestions: [],
        pointsOfAttention: [],
        suggestions: ['Sugestao de validacao final.'],
        confidence: 'medio' as const,
        rationale: 'Contexto local suficiente para resposta inicial.',
        expectedUserAction: 'Revisar e aprovar.',
      },
    };
  }

  async reviewProposalDraft(input: {
    originalText: string;
    proposalDraft: string;
    modelOverride?: string | null;
    reviewInstructions: string;
    customerName: string | null;
    budgetDescription: string;
    workDescription: string;
    materialItems: Array<{ description: string; quantityText: string }>;
    materialCandidates: Array<{ query: string }>;
    customerCandidates: Array<{ id: string }>;
    serviceItems: Array<{
      description: string;
      quantityText: string;
      estimatedValueText: string;
    }>;
    pointsOfAttention: string[];
    reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only';
  }) {
    this.lastReviewModelOverride = input.modelOverride ?? null;

    return {
      type: 'proposal_draft_reviewed' as const,
      review: {
        summary: 'Parecer assistido de teste.',
        suggestedCommercialBody: `${input.proposalDraft}\n\n[Ajustado]`,
        resolvedCustomer: {
          id: '999',
          name: 'Cliente Exemplo Ltda',
          code: 'CLI001',
          documentNumber: '12345678000199',
        },
        resolvedMaterialItems: [
          {
            description: 'Material do catalogo',
            quantityText: '1 unidade',
            sourceQuery: 'material sugerido',
            catalogItemId: '1',
            catalogItemName: 'Material do catalogo',
          },
        ],
        adjustmentNotes: ['Ajustar clareza comercial.'],
        confidence: 'medio' as const,
      },
    };
  }

  async reconcileProposalMaterials(input: {
    materialItems: Array<{
      description: string;
      quantityText: string;
      sourceQuery: string | null;
      catalogItemId: string | null;
      catalogItemName: string | null;
    }>;
  }) {
    return {
      type: 'proposal_materials_reconciled' as const,
      reconciliation: {
        summary: 'Materiais conciliados.',
        materialItems: input.materialItems,
        adjustmentNotes: ['Itens conferidos com a shortlist.'],
        confidence: 'medio' as const,
      },
    };
  }
}

class FailingReviewOpenAIBudgetAssistantGateway extends FakeOpenAIBudgetAssistantGateway {
  override reviewProposalDraft(_input: {
    originalText: string;
    proposalDraft: string;
    modelOverride?: string | null;
    reviewInstructions: string;
    customerName: string | null;
    budgetDescription: string;
    workDescription: string;
    materialItems: Array<{ description: string; quantityText: string }>;
    materialCandidates: Array<{ query: string }>;
    customerCandidates: Array<{ id: string }>;
    serviceItems: Array<{
      description: string;
      quantityText: string;
      estimatedValueText: string;
    }>;
    pointsOfAttention: string[];
    reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only';
  }) {
    return Promise.reject(
      new Error(
        'OpenAI budget assistant request was cancelled during proposal_draft_review.',
      ),
    );
  }
}

class InMemoryContactCatalogCache implements BlingContactCatalogCache {
  async read() {
    return {
      syncedAt: '2026-03-30T07:05:17.281Z',
      items: [
        {
          id: '999',
          name: 'Cliente Exemplo Ltda',
          code: 'CLI001',
          status: 'A',
          documentNumber: '12345678000199',
          phone: '(16) 3000-0000',
          mobilePhone: '(16) 99999-0000',
        },
      ],
    };
  }

  async write() {
    throw new Error('not used');
  }
}

class InMemoryProductCatalogCache implements BlingProductCatalogCache {
  async read() {
    return {
      syncedAt: '2026-03-30T06:17:49.286Z',
      items: [
        {
          id: '1',
          name: 'Cabo PP 3x1,5mm',
          code: 'CABOPP315',
          price: 12.5,
          costPrice: 7.2,
          stockQuantity: 15,
          type: 'P',
          status: 'A',
        },
      ],
    };
  }

  async write() {
    throw new Error('not used');
  }
}

class InMemoryQuoteHistoryCache implements BlingQuoteHistoryCache {
  async read() {
    return { syncedAt: '2026-03-30T06:29:25.901Z', items: [] };
  }

  async write() {
    throw new Error('not used');
  }
}

class InMemoryServiceNoteHistoryCache implements BlingServiceNoteHistoryCache {
  async read() {
    return { syncedAt: '2026-03-30T06:34:40.209Z', items: [] };
  }

  async write() {
    throw new Error('not used');
  }
}

test('builds an AI-assisted agent response through the HTTP API', async () => {
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: new InMemoryAiBudgetSessionRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const response = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Instalar cabo pp 3 x 1,5 para cliente exemplo',
    },
  });

  assert.equal(response.statusCode, 200);
  const json = response.json();
  assert.equal(json.type, 'ai_assisted_agent_response_built');
  assert.equal(json.intakeExtraction.extraction.customerQuery, 'cliente exemplo');
  assert.equal(json.localResponse.response.status, 'Aguardando aprovacao');
  assert.equal(typeof json.session.id, 'string');
  assert.equal(
    json.aiResponse.interpretation.budgetDescription,
    'Resposta estruturada assistida por IA.',
  );

  await app.close();
});

test('forwards the configured default AI model through the HTTP AI agent response route', async () => {
  const openAIGateway = new FakeOpenAIBudgetAssistantGateway();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: new InMemoryAiBudgetSessionRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: openAIGateway,
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const response = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Instalar cabo pp 3 x 1,5 para cliente exemplo',
      defaultAiModel: 'gpt-5.4-mini',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(openAIGateway.lastExtractModelOverride, 'gpt-5.4-mini');
  assert.equal(openAIGateway.lastInterpretModelOverride, 'gpt-5.4-mini');

  await app.close();
});

test('starts and exposes an async AI agent operation status', async () => {
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: new InMemoryAiBudgetSessionRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const started = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response/start',
    payload: {
      originalText: 'Instalar cabo pp 3 x 1,5 para cliente exemplo',
    },
  });

  assert.equal(started.statusCode, 202);
  assert.equal(started.json().type, 'ai_agent_operation_started');

  await new Promise((resolve) => setTimeout(resolve, 10));

  const status = await app.inject({
    method: 'GET',
    url: `/local/ai-operations/${started.json().operationId}`,
  });

  assert.equal(status.statusCode, 200);
  assert.equal(
    ['running', 'completed'].includes(status.json().operation.status),
    true,
  );

  await app.close();
});

test('lists and loads persisted AI budget sessions through the HTTP API', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Instalar cabo pp 3 x 1,5 para cliente exemplo',
    },
  });

  const createdJson = created.json();
  const sessionId = createdJson.session.id as string;

  const listed = await app.inject({
    method: 'GET',
    url: '/local/ai-sessions',
  });

  assert.equal(listed.statusCode, 200);
  assert.equal(listed.json().sessions[0].id, sessionId);

  const loaded = await app.inject({
    method: 'GET',
    url: `/local/ai-sessions/${sessionId}`,
  });

  assert.equal(loaded.statusCode, 200);
  assert.equal(loaded.json().session.id, sessionId);

  const deleted = await app.inject({
    method: 'DELETE',
    url: `/local/ai-sessions/${sessionId}`,
  });

  assert.equal(deleted.statusCode, 200);
  assert.equal(deleted.json().type, 'ai_budget_session_deleted');
  assert.equal(deleted.json().sessionId, sessionId);

  const missing = await app.inject({
    method: 'GET',
    url: `/local/ai-sessions/${sessionId}`,
  });

  assert.equal(missing.statusCode, 404);

  await app.close();
});

test('updates an existing AI budget session through the HTTP API when sessionId is provided', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  const updated = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      sessionId,
      originalText: 'Texto revisado',
    },
  });

  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().session.id, sessionId);

  const loaded = await app.inject({
    method: 'GET',
    url: `/local/ai-sessions/${sessionId}`,
  });

  assert.equal(loaded.statusCode, 200);
  assert.equal(loaded.json().session.originalText, 'Texto revisado');

  await app.close();
});

test('updates AI budget session status through the HTTP API', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  const approved = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().session.status, 'Aprovado para proposta');

  const cancelled = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/cancel`,
  });

  assert.equal(cancelled.statusCode, 200);
  assert.equal(cancelled.json().session.status, 'Cancelado');

  await app.close();
});

test('generates a proposal draft through the HTTP API for an approved session', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  const generated = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  assert.equal(generated.statusCode, 200);
  assert.equal(generated.json().type, 'ai_budget_proposal_draft_generated');
  assert.equal(generated.json().session.status, 'Proposta comercial pronta');
  assert.equal(typeof generated.json().proposalDraft.commercialBody, 'string');

  await app.close();
});

test('forwards the selected review model through the proposal draft review route', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const openAIGateway = new FakeOpenAIBudgetAssistantGateway();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: openAIGateway,
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  const reviewed = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/review`,
    payload: {
      reviewModel: 'gpt-5.4',
    },
  });

  assert.equal(reviewed.statusCode, 200);
  assert.equal(openAIGateway.lastReviewModelOverride, 'gpt-5.4');

  await app.close();
});

test('reopens an AI budget session for review through the HTTP API', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  const reopened = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/review`,
  });

  assert.equal(reopened.statusCode, 200);
  assert.equal(reopened.json().session.status, 'Aguardando aprovacao');

  await app.close();
});

test('confirms a generated proposal draft through the HTTP API', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  const confirmed = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/confirm-proposal`,
  });

  assert.equal(confirmed.statusCode, 200);
  assert.equal(confirmed.json().session.status, 'Finalizada');
  assert.equal(confirmed.json().blingQuote.id, 'bling-quote-1');
  assert.equal(
    typeof confirmed.json().session.payload.proposalConfirmation.confirmedAt,
    'string',
  );

  await app.close();
});

test('reviews a generated proposal draft through the HTTP API', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  const reviewed = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/review`,
  });

  assert.equal(reviewed.statusCode, 200);
  assert.equal(reviewed.json().type, 'ai_budget_proposal_draft_reviewed');
  assert.equal(reviewed.json().review.summary, 'Parecer assistido de teste.');
  assert.match(reviewed.json().review.suggestedCommercialBody, /\[Ajustado\]/);

  await app.close();
});

test('accepts an AI-reviewed proposal draft through the HTTP API', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/review`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/save`,
    payload: {
      commercialBody:
        'Cliente: Cliente Exemplo Ltda\n\nMateriais previstos:\n- Material sugerido (1 unidade)\n\nVersão em ajuste',
    },
  });

  const accepted = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/review/accept`,
    payload: {
      commercialBody:
        'Cliente: Cliente Exemplo Ltda\n\nMateriais previstos:\n- Material sugerido (1 unidade)\n\nVersão final aceita',
    },
  });

  assert.equal(accepted.statusCode, 200);
  assert.equal(accepted.json().type, 'ai_budget_proposal_draft_review_accepted');
  assert.match(
    accepted.json().session.payload.proposalDraft.commercialBody,
    /Materiais previstos:/,
  );
  assert.deepEqual(
    accepted.json().session.payload.proposalDraft.materialItems.map((item: { description: string }) => item.description),
    ['Material sugerido'],
  );
  assert.equal('proposalDraftReview' in accepted.json().session.payload, false);

  await app.close();
});

test('returns 502 when proposal draft review fails due to OpenAI integration error', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FailingReviewOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  const reviewed = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/review`,
  });

  assert.equal(reviewed.statusCode, 502);
  assert.match(
    reviewed.json().error,
    /cancelled during proposal_draft_review/i,
  );

  await app.close();
});

test('rejects an AI-reviewed proposal draft through the HTTP API', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/review`,
  });

  const rejected = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/review/reject`,
  });

  assert.equal(rejected.statusCode, 200);
  assert.equal(rejected.json().type, 'ai_budget_proposal_draft_review_rejected');
  assert.equal(
    'proposalDraftReview' in rejected.json().session.payload,
    false,
  );

  await app.close();
});

test('rejects proposal confirmation when the proposal draft was not generated', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  const confirmed = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/confirm-proposal`,
  });

  assert.equal(confirmed.statusCode, 409);
  assert.match(
    confirmed.json().error,
    /must have a generated proposal draft before confirmation/,
  );

  await app.close();
});

test('updates a generated proposal draft through the HTTP API', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  const saved = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft/save`,
    payload: {
      commercialBody: 'Versão ajustada manualmente',
      reviewInstructions: 'Corrigir a redação e remover um item opcional.',
    },
  });

  assert.equal(saved.statusCode, 200);
  assert.equal(
    saved.json().session.payload.proposalDraft.commercialBody,
    'Versão ajustada manualmente',
  );
  assert.equal(
    saved.json().session.payload.proposalDraft.reviewInstructions,
    'Corrigir a redação e remover um item opcional.',
  );

  await app.close();
});

test('returns 502 when proposal confirmation fails while sending to Bling', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: repository,
    blingQuoteGateway: new FailingBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });

  const confirmed = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/confirm-proposal`,
  });

  assert.equal(confirmed.statusCode, 502);
  assert.match(confirmed.json().error, /timed out/i);

  await app.close();
});

test('saves a finalized session as model and removes it from the session list', async () => {
  const sessionRepository = new InMemoryAiBudgetSessionRepository();
  const modelRepository = new InMemoryAiBudgetModelRepository();
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    aiBudgetSessionRepository: sessionRepository,
    aiBudgetModelRepository: modelRepository,
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const created = await app.inject({
    method: 'POST',
    url: '/local/ai-agent-response',
    payload: {
      originalText: 'Texto inicial',
    },
  });

  const sessionId = created.json().session.id as string;

  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/approve`,
  });
  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/proposal-draft`,
  });
  await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/confirm-proposal`,
  });

  const savedAsModel = await app.inject({
    method: 'POST',
    url: `/local/ai-sessions/${sessionId}/save-as-model`,
  });

  assert.equal(savedAsModel.statusCode, 200);
  assert.equal(savedAsModel.json().deletedSessionId, sessionId);
  assert.equal(await sessionRepository.findById(sessionId), null);

  const listedModels = await app.inject({
    method: 'GET',
    url: '/local/ai-models',
  });

  assert.equal(listedModels.statusCode, 200);
  assert.equal(listedModels.json().models.length, 1);
  assert.equal(listedModels.json().models[0].blingQuoteNumber, '1001');

  const startedFromModel = await app.inject({
    method: 'POST',
    url: `/local/ai-models/${listedModels.json().models[0].id}/start`,
    payload: {
      mode: 'edit',
    },
  });

  assert.equal(startedFromModel.statusCode, 200);
  assert.equal(startedFromModel.json().session.status, 'Proposta comercial pronta');
  assert.equal(
    startedFromModel.json().session.payload.blingQuoteReference.number,
    '1001',
  );

  await app.close();
});
