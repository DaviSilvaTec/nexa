import test from 'node:test';
import assert from 'node:assert/strict';

import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import type { OpenAIBudgetAssistantGateway } from '../src/application/gateways/openai-budget-assistant-gateway';
import { acceptAiBudgetProposalDraftReview } from '../src/application/use-cases/accept-ai-budget-proposal-draft-review';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';

class FakeOpenAIBudgetAssistantGateway implements OpenAIBudgetAssistantGateway {
  async extractBudgetIntake() {
    return {
      type: 'budget_intake_extracted' as const,
      extraction: {
        customerQuery: null,
        materialQueries: [],
        serviceHints: [],
        ambiguities: [],
      },
    };
  }

  async interpretBudgetRequest() {
    return {
      type: 'budget_request_interpreted' as const,
      interpretation: {
        customerQuery: null,
        summaryTitle: 'Resumo',
        budgetDescription: '',
        workDescription: '',
        materialItems: [],
        serviceItems: [],
        laborPriceResearch: {
          status: 'estimado' as const,
          summary: '',
          estimatedLaborRange: null,
          estimatedHours: null,
          basis: null,
          confidence: 'baixo' as const,
        },
        pendingQuestions: [],
        pointsOfAttention: [],
        suggestions: [],
        confidence: 'baixo' as const,
        rationale: '',
        expectedUserAction: '',
      },
    };
  }

  async reviewProposalDraft(_input: {
    originalText: string;
    proposalDraft: string;
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
        summary: 'Resumo',
        suggestedCommercialBody: '',
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
        summary: 'Materiais reconciliados.',
        materialItems: input.materialItems.map((item) =>
          item.description.includes('Caixa de passagem')
            ? {
                ...item,
                catalogItemId: '2',
                catalogItemName: 'Caixa de passagem 20x20',
              }
            : item.description.includes('Cabo PP')
              ? {
                  ...item,
                  catalogItemId: '1',
                  catalogItemName: 'Cabo PP 3x1,5mm',
                }
              : item,
        ),
        adjustmentNotes: ['Itens conciliados com a shortlist.'],
        confidence: 'medio' as const,
      },
    };
  }
}

class FakeProductCatalogCache implements BlingProductCatalogCache {
  async read() {
    return {
      syncedAt: '2026-03-31T00:00:00.000Z',
      items: [
        {
          id: '1',
          name: 'Cabo PP 3x1,5mm',
          code: 'CABO',
          price: 12,
          costPrice: 8,
          stockQuantity: 10,
          type: 'P',
          status: 'A',
        },
        {
          id: '2',
          name: 'Caixa de passagem 20x20',
          code: 'CX2020',
          price: 25,
          costPrice: 15,
          stockQuantity: 10,
          type: 'P',
          status: 'A',
        },
      ],
    };
  }

  async write() {}
}

test('accepts the edited review text and reconciles materials from the accepted body', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'session-1',
    createdAt: '2026-03-31T15:00:00.000Z',
    updatedAt: '2026-03-31T15:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      proposalDraft: {
        generatedAt: '2026-03-31T15:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Cliente: Posto Alonso\n\nVersão anterior',
      },
      proposalDraftReview: {
        reviewedAt: '2026-03-31T15:12:00.000Z',
        summary: 'Sugestão disponível.',
        suggestedCommercialBody: 'Versão revisada',
        adjustmentNotes: ['Melhorar abertura comercial.'],
        confidence: 'medio',
      },
      aiContext: {
        payload: {
          materialCandidates: [
            {
              query: 'cabo pp',
              totalMatches: 1,
              candidates: [
                {
                  id: '1',
                  name: 'Cabo PP 3x1,5mm',
                  code: 'CABO',
                  price: 12,
                  costPrice: 8,
                  stockQuantity: 10,
                  type: 'P',
                  status: 'A',
                },
              ],
            },
          ],
        },
      },
      aiResponse: {
        interpretation: {
          materialItems: [
            {
              description: 'Cabo PP 3x1,5mm',
              quantityText: '10 metros',
              sourceQuery: 'cabo pp',
              catalogItemId: '1',
              catalogItemName: 'Cabo PP 3x1,5mm',
            },
          ],
        },
      },
    },
  });

  const result = await acceptAiBudgetProposalDraftReview(
    {
      sessionId: 'session-1',
      commercialBody:
        'Cliente: Posto Alonso\n\nVersão revisada aceita\n\nMateriais previstos:\n- Caixa de passagem 20x20 (1 unidade)',
      acceptedAt: new Date('2026-03-31T15:15:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
      productCatalogCache: new FakeProductCatalogCache(),
    },
  );

  assert.equal(result.type, 'ai_budget_proposal_draft_review_accepted');
  assert.equal(
    (result.session.payload as { proposalDraft?: { commercialBody?: string } }).proposalDraft
      ?.commercialBody,
    'Cliente: Posto Alonso\n\nVersão revisada aceita\n\nMateriais previstos:\n- Caixa de passagem 20x20 (1 unidade)',
  );
  assert.equal(
    (result.session.payload as { proposalDraft?: { reviewAcceptedAt?: string } }).proposalDraft
      ?.reviewAcceptedAt,
    '2026-03-31T15:15:00.000Z',
  );
  assert.equal(result.session.customerQuery, 'Posto Alonso');
  assert.equal(
    (
      result.session.payload as { proposalDraft?: { customerQuery?: string } }
    ).proposalDraft?.customerQuery,
    'Posto Alonso',
  );
  assert.equal(
    (
      result.session.payload as {
        workflowState?: {
          currentStage?: string;
          hasReviewResult?: boolean;
          hasFinalResolvedMaterials?: boolean;
        };
      }
    ).workflowState?.currentStage,
    'proposal_review_accepted',
  );
  assert.equal(
    (
      result.session.payload as {
        workflowState?: { hasReviewResult?: boolean };
      }
    ).workflowState?.hasReviewResult,
    false,
  );
  assert.deepEqual(
    (
      result.session.payload as {
        aiResponse?: { interpretation?: { materialItems?: Array<{ description?: string }> } };
      }
    ).aiResponse?.interpretation?.materialItems?.map((item) => item.description),
    ['Caixa de passagem 20x20'],
  );
  assert.equal(
    'proposalDraftReview' in (result.session.payload as Record<string, unknown>),
    false,
  );
  assert.equal(
    (
      result.session.payload as {
        proposalDraft?: { financialSummary?: { saleTotal?: number; costTotal?: number } };
      }
    ).proposalDraft?.financialSummary?.saleTotal,
    25,
  );
  assert.equal(
    (
      result.session.payload as {
        proposalDraft?: { financialSummary?: { saleTotal?: number; costTotal?: number } };
      }
    ).proposalDraft?.financialSummary?.costTotal,
    15,
  );
});
