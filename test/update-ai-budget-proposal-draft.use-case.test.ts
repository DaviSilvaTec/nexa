import test from 'node:test';
import assert from 'node:assert/strict';

import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import type { OpenAIBudgetAssistantGateway } from '../src/application/gateways/openai-budget-assistant-gateway';
import { updateAiBudgetProposalDraft } from '../src/application/use-cases/update-ai-budget-proposal-draft';
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

  async reviewProposalDraft() {
    return {
      type: 'proposal_draft_reviewed' as const,
      review: {
        summary: '',
        suggestedCommercialBody: '',
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
          item.description.includes('Buchas 6')
            ? {
                ...item,
                catalogItemId: 'bucha-6',
                catalogItemName: 'BUCHA FIXAÇÃO 6MM P/ TIJOLO FURADO',
              }
            : item.description.includes('Abraçadeiras')
              ? {
                  ...item,
                  catalogItemId: null,
                  catalogItemName: null,
                }
              : item,
        ),
        adjustmentNotes: ['Itens conferidos no catálogo completo.'],
        confidence: 'medio' as const,
      },
    };
  }
}

class FakeProductCatalogCache implements BlingProductCatalogCache {
  async read() {
    return {
      syncedAt: '2026-04-01T00:00:00.000Z',
      items: [
        {
          id: 'bucha-6',
          name: 'BUCHA FIXAÇÃO 6MM P/ TIJOLO FURADO',
          code: 'BUC006',
          price: 0.2175,
          costPrice: 0.15,
          stockQuantity: 30,
          type: 'P',
          status: 'A',
        },
        {
          id: 'kit-bucha-6',
          name: 'kit 1000 parafuso 5,0x35 e 1000 bucha 6',
          code: 'KIT006',
          price: 214.965,
          costPrice: 143.31,
          stockQuantity: 0,
          type: 'P',
          status: 'A',
        },
        {
          id: 'abrac-cabos',
          name: '50 Abracadeiras Organizar Fios Enrrolar Cabos Chicote 15cm',
          code: 'ABR001',
          price: 89.97,
          costPrice: 29.99,
          stockQuantity: 1,
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

test('updates a generated proposal draft while the session is in proposal review', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'session-1',
    createdAt: '2026-03-31T12:00:00.000Z',
    updatedAt: '2026-03-31T12:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      proposalDraft: {
        generatedAt: '2026-03-31T12:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Cliente: Posto Alonso\n\nVersão inicial',
      },
    },
  });

  const result = await updateAiBudgetProposalDraft(
    {
      sessionId: 'session-1',
      commercialBody: 'Cliente: Posto Alonso\n\nVersão ajustada manualmente',
      updatedAt: new Date('2026-03-31T12:20:00.000Z'),
    },
        {
          aiBudgetSessionRepository: repository,
          productCatalogCache: new FakeProductCatalogCache(),
          openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
        },
      );

  assert.equal(result.type, 'ai_budget_proposal_draft_updated');
  assert.equal(
    (result.session.payload as { proposalDraft?: { commercialBody?: string } }).proposalDraft
      ?.commercialBody,
    'Cliente: Posto Alonso\n\nVersão ajustada manualmente',
  );
  assert.equal(result.session.customerQuery, 'Posto Alonso');
  assert.equal(
    (
      result.session.payload as { proposalDraft?: { customerQuery?: string } }
    ).proposalDraft?.customerQuery,
    'Posto Alonso',
  );
  assert.equal(
    (result.session.payload as { proposalDraft?: { editedAt?: string } }).proposalDraft
      ?.editedAt,
    '2026-03-31T12:20:00.000Z',
  );
});

test('rejects draft editing when the session is no longer in proposal review', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'session-2',
    createdAt: '2026-03-31T12:00:00.000Z',
    updatedAt: '2026-03-31T12:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Finalizada',
    payload: {
      proposalDraft: {
        generatedAt: '2026-03-31T12:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Versão final',
      },
    },
  });

  await assert.rejects(
    () =>
      updateAiBudgetProposalDraft(
        {
          sessionId: 'session-2',
          commercialBody: 'Tentativa inválida',
        },
        {
          aiBudgetSessionRepository: repository,
          productCatalogCache: new FakeProductCatalogCache(),
          openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
        },
      ),
    /must be in proposal review/i,
  );
});

test('reconciles materials again from the edited commercial body using the full local catalog', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'session-3',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      aiContext: {
        payload: {},
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
        },
      },
      proposalDraft: {
        generatedAt: '2026-04-01T00:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: `Cliente: Posto Alonso

Materiais previstos:
- Buchas 6 mm para fixação (20 unidades)
- Abraçadeiras para condução (15 unidades)`,
      },
    },
  });

  const result = await updateAiBudgetProposalDraft(
    {
      sessionId: 'session-3',
      commercialBody: `Cliente: Posto Alonso

Materiais previstos:
- Buchas 6 mm para fixação (20 unidades)
- Abraçadeiras para condução (15 unidades)`,
      updatedAt: new Date('2026-04-01T00:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      productCatalogCache: new FakeProductCatalogCache(),
      openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    },
  );

  const proposalDraft = (result.session.payload as {
    proposalDraft?: {
      materialItems?: Array<{ description: string; catalogItemId: string | null }>;
      materialReconciliation?: { scope?: string };
    };
  }).proposalDraft;

  assert.deepEqual(
    proposalDraft?.materialItems,
    [
      {
        description: 'Buchas 6 mm para fixação',
        quantityText: '20 unidades',
        sourceQuery: 'Buchas 6 mm para fixação',
        catalogItemId: 'bucha-6',
        catalogItemName: 'BUCHA FIXAÇÃO 6MM P/ TIJOLO FURADO',
      },
      {
        description: 'Abraçadeiras para condução',
        quantityText: '15 unidades',
        sourceQuery: 'Abraçadeiras para condução',
        catalogItemId: null,
        catalogItemName: null,
      },
    ],
  );
  assert.equal(proposalDraft?.materialReconciliation?.scope, 'save');
});

test('removes the materials section and clears reconciled material data when the operator deletes it', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'session-4',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      aiContext: {
        payload: {},
      },
      aiResponse: {
        interpretation: {
          materialItems: [
            {
              description: 'Buchas 6 mm para fixação',
              quantityText: '20 unidades',
              sourceQuery: 'Buchas 6 mm para fixação',
              catalogItemId: 'bucha-6',
              catalogItemName: 'BUCHA FIXAÇÃO 6MM P/ TIJOLO FURADO',
            },
          ],
        },
      },
      proposalDraft: {
        generatedAt: '2026-04-01T00:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: `Cliente: Posto Alonso

Materiais previstos:
- Buchas 6 mm para fixação (20 unidades)

Escopo do serviço:
Instalação.`,
        materialItems: [
          {
            description: 'Buchas 6 mm para fixação',
            quantityText: '20 unidades',
            sourceQuery: 'Buchas 6 mm para fixação',
            catalogItemId: 'bucha-6',
            catalogItemName: 'BUCHA FIXAÇÃO 6MM P/ TIJOLO FURADO',
          },
        ],
      },
    },
  });

  const result = await updateAiBudgetProposalDraft(
    {
      sessionId: 'session-4',
      commercialBody: `Cliente: Posto Alonso

Escopo do serviço:
Instalação.`,
      updatedAt: new Date('2026-04-01T00:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      productCatalogCache: new FakeProductCatalogCache(),
      openAIBudgetAssistantGateway: new FakeOpenAIBudgetAssistantGateway(),
    },
  );

  const proposalDraft = (result.session.payload as {
    proposalDraft?: {
      commercialBody?: string;
      materialItems?: unknown[];
      materialReconciliation?: unknown;
      financialSummary?: { saleTotal?: number; costTotal?: number; grossProfit?: number };
    };
    aiResponse?: { interpretation?: { materialItems?: unknown[] } };
  });

  assert.equal(
    proposalDraft.proposalDraft?.commercialBody,
    `Cliente: Posto Alonso

Escopo do serviço:
Instalação.`,
  );
  assert.deepEqual(proposalDraft.proposalDraft?.materialItems, []);
  assert.equal(proposalDraft.proposalDraft?.materialReconciliation, null);
  assert.deepEqual(proposalDraft.aiResponse?.interpretation?.materialItems, []);
  assert.equal(proposalDraft.proposalDraft?.financialSummary?.saleTotal, 0);
  assert.equal(proposalDraft.proposalDraft?.financialSummary?.costTotal, 0);
  assert.equal(proposalDraft.proposalDraft?.financialSummary?.grossProfit, 0);
});
