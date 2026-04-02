import test from 'node:test';
import assert from 'node:assert/strict';

import type { BlingContactCatalogCache } from '../src/application/catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../src/application/catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../src/application/catalog/bling-service-note-history-cache';
import type {
  AiBudgetAssistantContextPayload,
  OpenAIBudgetAssistantGateway,
} from '../src/application/gateways/openai-budget-assistant-gateway';
import { createAiBudgetSession } from '../src/application/use-cases/create-ai-budget-session';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';

class InMemoryContactCatalogCache implements BlingContactCatalogCache {
  async read() {
    return {
      syncedAt: '2026-03-30T06:00:00.000Z',
      items: [
        {
          id: 'contact-1',
          name: 'Posto Alonso',
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
          name: 'CAMERA IP 2MP',
          code: 'CAM2MP',
          price: 200,
          costPrice: 120,
          stockQuantity: 2,
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

class FakeOpenAIBudgetAssistantGateway implements OpenAIBudgetAssistantGateway {
  async extractBudgetIntake() {
    return {
      type: 'budget_intake_extracted' as const,
      extraction: {
        customerQuery: 'posto alonso',
        materialQueries: ['camera ip 2mp'],
        serviceHints: [],
        ambiguities: [],
      },
    };
  }

  async interpretBudgetRequest(_payload: AiBudgetAssistantContextPayload) {
    return {
      type: 'budget_request_interpreted' as const,
      interpretation: {
        customerQuery: 'posto alonso',
        summaryTitle: 'Instalação de câmeras no posto',
        budgetDescription: 'Orçamento assistido salvo.',
        workDescription: 'Fluxo salvo em sessão.',
        materialItems: [
          {
            description: 'Camera IP 2MP',
            quantityText: '2 unidades',
            sourceQuery: 'camera ip 2mp',
            catalogItemId: '1',
            catalogItemName: 'CAMERA IP 2MP',
          },
        ],
        serviceItems: [],
        laborPriceResearch: {
          status: 'estimado' as const,
          summary: 'Estimativa inicial fraca de mão de obra.',
          estimatedLaborRange: 'R$ 250 a R$ 420',
          estimatedHours: '4 a 6 horas',
          basis: 'descricao do trabalho e materiais normalizados',
          confidence: 'baixo' as const,
        },
        pendingQuestions: [],
        pointsOfAttention: [],
        suggestions: [],
        confidence: 'medio' as const,
        rationale: 'ok',
        expectedUserAction: 'Revisar.',
      },
    };
  }

  async reviewProposalDraft(input: {
    proposalDraft: string;
    originalText: string;
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
    modelOverride?: string | null;
    reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only';
  }) {
    return {
      type: 'proposal_draft_reviewed' as const,
      review: {
        summary: 'Parecer em teste.',
        suggestedCommercialBody: input.proposalDraft,
        resolvedCustomer: null,
        resolvedMaterialItems: [],
        adjustmentNotes: [],
        confidence: 'baixo' as const,
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
        summary: 'Reconciliação em teste.',
        materialItems: input.materialItems,
        adjustmentNotes: [],
        confidence: 'baixo' as const,
      },
    };
  }
}

test('creates and persists an AI budget session from the assisted flow', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  const result = await createAiBudgetSession(
    {
      originalText: 'Instalar duas câmeras IP no posto Alonso',
      createdAt: new Date('2026-03-30T13:45:00.000Z'),
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
      quoteHistoryCache: new InMemoryQuoteHistoryCache(),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
      openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
      aiBudgetSessionRepository: repository,
    },
  );

  assert.equal(result.type, 'ai_assisted_agent_response_built');
  assert.match(result.session.id, /-/);
  assert.equal(result.session.createdAt, '2026-03-30T13:45:00.000Z');
  assert.equal(result.session.customerQuery, 'posto alonso');
  assert.equal(result.session.confidence, 'medio');

  const stored = await repository.findById(result.session.id);
  assert.equal(stored?.originalText, 'Instalar duas câmeras IP no posto Alonso');
  assert.equal(stored?.customerQuery, 'posto alonso');
  assert.equal(
    ((stored?.payload as { aiResponse?: { interpretation?: { summaryTitle?: string } } })
      .aiResponse?.interpretation?.summaryTitle),
    'Instalação de câmeras no posto',
  );
  assert.equal(
    (stored?.payload as { resolvedCustomer?: unknown }).resolvedCustomer,
    undefined,
  );
  assert.deepEqual(
    (
      stored?.payload as {
        workflowState?: {
          currentStage?: string;
          hasOriginalText?: boolean;
          hasInitialInterpretation?: boolean;
          hasExpandedMaterialCandidates?: boolean;
        };
      }
    ).workflowState,
    {
      currentStage: 'initial_interpretation_completed',
      currentStageLabel: 'Interpretação inicial concluída',
      lastPersistedAt: '2026-03-30T13:45:00.000Z',
      originalTextCapturedAt: '2026-03-30T13:45:00.000Z',
      firstInterpretationCompletedAt: '2026-03-30T13:45:00.000Z',
      proposalDraftGeneratedAt: null,
      proposalDraftEditedAt: null,
      reviewInstructionsUpdatedAt: null,
      reviewRequestedAt: null,
      reviewCompletedAt: null,
      reviewAcceptedAt: null,
      reviewRejectedAt: null,
      finalSelectionsUpdatedAt: null,
      confirmationCompletedAt: null,
      loadedFromModelAt: null,
      loadedFromModelMode: null,
      hasOriginalText: true,
      hasInitialInterpretation: true,
      hasProposalDraft: false,
      hasReviewInstructions: false,
      hasReviewResult: false,
      hasExpandedMaterialCandidates: false,
      hasCustomerCandidates: true,
      hasFinalResolvedCustomer: false,
      hasFinalResolvedMaterials: false,
      hasConfirmation: false,
    },
  );
});

test('updates an existing AI budget session when sessionId is provided', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'sess-1',
    createdAt: '2026-03-30T13:45:00.000Z',
    updatedAt: '2026-03-30T13:45:00.000Z',
    originalText: 'Texto original antigo',
    customerQuery: 'posto alonso',
    confidence: 'baixo',
    status: 'Aguardando aprovacao',
    payload: { stale: true },
  });

  const result = await createAiBudgetSession(
    {
      sessionId: 'sess-1',
      originalText: 'Texto original revisado',
      createdAt: new Date('2026-03-30T14:00:00.000Z'),
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
      quoteHistoryCache: new InMemoryQuoteHistoryCache(),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
      openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
      aiBudgetSessionRepository: repository,
    },
  );

  assert.equal(result.session.id, 'sess-1');
  assert.equal(result.session.createdAt, '2026-03-30T13:45:00.000Z');
  assert.equal(result.session.updatedAt, '2026-03-30T14:00:00.000Z');

  const stored = await repository.findById('sess-1');
  assert.equal(stored?.originalText, 'Texto original revisado');
  assert.equal(stored?.createdAt, '2026-03-30T13:45:00.000Z');
  assert.equal(stored?.updatedAt, '2026-03-30T14:00:00.000Z');
});
