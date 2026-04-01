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
import { buildAiAssistedAgentResponse } from '../src/application/use-cases/build-ai-assisted-agent-response';

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
    return {
      syncedAt: '2026-03-30T06:29:25.901Z',
      items: [
        {
          id: '101',
          date: '2026-03-20',
          status: 'Aprovado',
          total: 4200.5,
          productsTotal: 3100,
          number: '87',
          contactId: '999',
          storeId: '5',
        },
      ],
    };
  }

  async write() {
    throw new Error('not used');
  }
}

class InMemoryServiceNoteHistoryCache implements BlingServiceNoteHistoryCache {
  async read() {
    return {
      syncedAt: '2026-03-30T06:34:40.209Z',
      items: [],
    };
  }

  async write() {
    throw new Error('not used');
  }
}

class FakeOpenAIBudgetAssistantGateway implements OpenAIBudgetAssistantGateway {
  public lastPayload: AiBudgetAssistantContextPayload | null = null;
  public extractedText: string | null = null;
  public extractedModelOverride: string | null = null;
  public interpretedModelOverride: string | null = null;

  async extractBudgetIntake(
    originalText: string,
    options?: { modelOverride?: string | null },
  ) {
    this.extractedText = originalText;
    this.extractedModelOverride = options?.modelOverride ?? null;

    return {
      type: 'budget_intake_extracted' as const,
      extraction: {
        customerQuery: 'cliente exemplo',
        materialQueries: ['cabo pp 3 x 1,5'],
        serviceHints: ['instalacao'],
        ambiguities: ['Validar metragem exata do cabo.'],
      },
    };
  }

  async interpretBudgetRequest(
    payload: AiBudgetAssistantContextPayload,
    options?: { modelOverride?: string | null },
  ) {
    this.lastPayload = payload;
    this.interpretedModelOverride = options?.modelOverride ?? null;

    return {
      type: 'budget_request_interpreted' as const,
      interpretation: {
        summaryTitle: 'Instalação de cabo para cliente',
        budgetDescription:
          'Orçamento para instalação de cabeamento e infraestrutura básica para o cliente localizado.',
        workDescription:
          'Instalação do cabo PP 3x1,5, conferência de trajeto e preparação para execução com validação final.',
        materialItems: [
          {
            description: 'Cabo PP 3x1,5mm',
            quantityText: 'quantidade a confirmar em campo',
            sourceQuery: 'cabo pp 3 x 1,5',
            catalogItemId: '1',
            catalogItemName: 'Cabo PP 3x1,5mm',
          },
          {
            description: 'Conectores compatíveis',
            quantityText: 'conforme quantidade final de pontos',
            sourceQuery: null as string | null,
            catalogItemId: null as string | null,
            catalogItemName: null as string | null,
          },
        ],
        serviceItems: [
          {
            description: 'Instalação do cabeamento',
            quantityText: '1 serviço',
            estimatedValueText: 'R$ 180 a R$ 320',
          },
        ],
        laborPriceResearch: {
          status: 'estimado' as const,
          summary:
            'Estimativa inicial fraca de mão de obra para apoiar o planejamento inicial.',
          estimatedLaborRange: 'R$ 180 a R$ 320',
          estimatedHours: '3 a 5 horas',
          basis: 'descricao do servico e materiais normalizados',
          confidence: 'baixo' as const,
        },
        pendingQuestions: ['Confirmar metragem do cabo no local.'],
        pointsOfAttention: ['Cliente localizado localmente e histórico disponível.'],
        suggestions: ['Confirmar quantidade e trajeto do cabo antes da aprovação.'],
        confidence: 'medio' as const,
        rationale: 'A solicitação tem material identificado, mas ainda falta detalhar quantidade.',
        expectedUserAction: 'Revisar a sugestao e confirmar os detalhes faltantes.',
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
        summary: 'Parecer de teste.',
        suggestedCommercialBody: input.proposalDraft,
        resolvedCustomer: null,
        resolvedMaterialItems: [],
        adjustmentNotes: [],
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
        summary: 'Reconciliação de teste.',
        materialItems: input.materialItems,
        adjustmentNotes: [],
        confidence: 'medio' as const,
      },
    };
  }
}

test('builds an AI-assisted response using local context plus OpenAI interpretation', async () => {
  const openAIBudgetAssistantGateway = new FakeOpenAIBudgetAssistantGateway();

  const result = await buildAiAssistedAgentResponse(
    {
      originalText: 'Instalar cabo pp 3 x 1,5 para cliente exemplo',
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
      quoteHistoryCache: new InMemoryQuoteHistoryCache(),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
      openAIBudgetAssistantGateway,
    },
  );

  assert.equal(result.type, 'ai_assisted_agent_response_built');
  assert.equal(result.intakeExtraction.extraction.customerQuery, 'cliente exemplo');
  assert.equal(result.intakeExtraction.extraction.materialQueries[0], 'cabo pp 3 x 1,5');
  assert.equal(result.localResponse.response.status, 'Aguardando aprovacao');
  assert.equal(result.aiResponse.interpretation.confidence, 'medio');
  assert.equal(
    result.aiResponse.interpretation.summaryTitle,
    'Instalação de cabo para cliente',
  );
  assert.equal(
    result.aiResponse.interpretation.budgetDescription,
    'Orçamento para instalação de cabeamento e infraestrutura básica para o cliente localizado.',
  );
  assert.equal(
    result.aiResponse.interpretation.materialItems[0]?.description,
    'Cabo PP 3x1,5mm',
  );
  assert.equal(result.aiResponse.interpretation.materialItems[0]?.catalogItemId, '1');
  assert.equal(
    result.aiResponse.interpretation.materialItems[0]?.catalogItemName,
    'Cabo PP 3x1,5mm',
  );
  assert.equal(
    openAIBudgetAssistantGateway.lastPayload?.customer?.contact.name,
    'Cliente Exemplo Ltda',
  );
  assert.equal(
    openAIBudgetAssistantGateway.lastPayload?.materialCandidates[0]?.query,
    'cabo pp 3 x 1,5',
  );
  assert.equal(
    openAIBudgetAssistantGateway.extractedText,
    'Instalar cabo pp 3 x 1,5 para cliente exemplo',
  );
  assert.equal(openAIBudgetAssistantGateway.extractedModelOverride, null);
  assert.equal(openAIBudgetAssistantGateway.interpretedModelOverride, null);
});

test('sanitizes AI extraction before querying local context', async () => {
  class VerboseOpenAIBudgetAssistantGateway
    implements OpenAIBudgetAssistantGateway {
    public lastPayload: AiBudgetAssistantContextPayload | null = null;

    async extractBudgetIntake() {
      return {
        type: 'budget_intake_extracted' as const,
        extraction: {
          customerQuery:
            'Orçamento para o posto Alonso com instalação de duas câmeras IP',
          materialQueries: [
            'cabo de cobre para internet (marca Furukawa)',
            'conectores RJ45',
            'parafusos mm',
            'switch',
            'câmera IP',
          ],
          serviceHints: [],
          ambiguities: [],
        },
      };
    }

    async interpretBudgetRequest(payload: AiBudgetAssistantContextPayload) {
      this.lastPayload = payload;

      return {
        type: 'budget_request_interpreted' as const,
        interpretation: {
          summaryTitle: 'Instalação de câmeras no posto',
          budgetDescription: 'ok',
          workDescription: 'ok',
          materialItems: [],
          serviceItems: [],
          laborPriceResearch: {
            status: 'estimado' as const,
            summary: 'ok',
            estimatedLaborRange: 'R$ 100 a R$ 200',
            estimatedHours: '2 a 3 horas',
            basis: 'ok',
            confidence: 'baixo' as const,
          },
          pendingQuestions: [],
          pointsOfAttention: [],
          suggestions: [],
          confidence: 'medio' as const,
          rationale: 'ok',
          expectedUserAction: 'ok',
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
          summary: 'Parecer de teste.',
          suggestedCommercialBody: input.proposalDraft,
          resolvedCustomer: null,
          resolvedMaterialItems: [],
          adjustmentNotes: [],
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
          summary: 'Reconciliação de teste.',
          materialItems: input.materialItems,
          adjustmentNotes: [],
          confidence: 'medio' as const,
        },
      };
    }
  }

  const openAIBudgetAssistantGateway = new VerboseOpenAIBudgetAssistantGateway();

  const result = await buildAiAssistedAgentResponse(
    {
      originalText:
        'Orçamento do posto Alonso para duas câmeras IP 2MP com cabo Furukawa, parafusos 6 mm e switch de 4 portas.',
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
      quoteHistoryCache: new InMemoryQuoteHistoryCache(),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
      openAIBudgetAssistantGateway,
    },
  );

  assert.equal(result.intakeExtraction.extraction.customerQuery, 'posto Alonso');
  assert.deepEqual(result.intakeExtraction.extraction.materialQueries, [
    'cabo de rede furukawa',
    'conector rj45',
    'parafuso 6mm',
    'switch 4 portas',
    'camera ip 2mp',
  ]);
  assert.equal(openAIBudgetAssistantGateway.lastPayload?.customer, null);
  assert.equal(
    openAIBudgetAssistantGateway.lastPayload?.materialCandidates[0]?.query,
    'cabo de rede furukawa',
  );
});

test('forwards the configured default AI model to intake extraction and interpretation', async () => {
  const openAIBudgetAssistantGateway = new FakeOpenAIBudgetAssistantGateway();

  await buildAiAssistedAgentResponse(
    {
      originalText: 'Instalar cabo pp 3 x 1,5 para cliente exemplo',
      defaultAiModel: 'gpt-5.4-mini',
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
      quoteHistoryCache: new InMemoryQuoteHistoryCache(),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
      openAIBudgetAssistantGateway,
    },
  );

  assert.equal(openAIBudgetAssistantGateway.extractedModelOverride, 'gpt-5.4-mini');
  assert.equal(openAIBudgetAssistantGateway.interpretedModelOverride, 'gpt-5.4-mini');
});

test('merges standalone brand tokens into compatible material queries', async () => {
  class BrandOpenAIBudgetAssistantGateway
    implements OpenAIBudgetAssistantGateway {
    public lastPayload: AiBudgetAssistantContextPayload | null = null;

    async extractBudgetIntake() {
      return {
        type: 'budget_intake_extracted' as const,
        extraction: {
          customerQuery: 'posto Alonso: instalação de duas câmeras IP',
          materialQueries: [
            'cabo de rede',
            'furukawa',
            'conector rj45',
          ],
          serviceHints: [],
          ambiguities: [],
        },
      };
    }

    async interpretBudgetRequest(payload: AiBudgetAssistantContextPayload) {
      this.lastPayload = payload;

      return {
        type: 'budget_request_interpreted' as const,
        interpretation: {
          summaryTitle: 'Instalação de câmeras no posto',
          budgetDescription: 'ok',
          workDescription: 'ok',
          materialItems: [],
          serviceItems: [],
          laborPriceResearch: {
            status: 'estimado' as const,
            summary: 'ok',
            estimatedLaborRange: 'R$ 100 a R$ 200',
            estimatedHours: '2 a 3 horas',
            basis: 'ok',
            confidence: 'baixo' as const,
          },
          pendingQuestions: [],
          pointsOfAttention: [],
          suggestions: [],
          confidence: 'medio' as const,
          rationale: 'ok',
          expectedUserAction: 'ok',
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
          summary: 'Parecer de teste.',
          suggestedCommercialBody: input.proposalDraft,
          resolvedCustomer: null,
          resolvedMaterialItems: [],
          adjustmentNotes: [],
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
          summary: 'Reconciliação de teste.',
          materialItems: input.materialItems,
          adjustmentNotes: [],
          confidence: 'medio' as const,
        },
      };
    }
  }

  const openAIBudgetAssistantGateway = new BrandOpenAIBudgetAssistantGateway();

  const result = await buildAiAssistedAgentResponse(
    {
      originalText:
        'Orçamento do posto Alonso com cabo de rede Furukawa e conector RJ45.',
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
      quoteHistoryCache: new InMemoryQuoteHistoryCache(),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
      openAIBudgetAssistantGateway,
    },
  );

  assert.equal(result.intakeExtraction.extraction.customerQuery, 'posto Alonso');
  assert.deepEqual(result.intakeExtraction.extraction.materialQueries, [
    'cabo de rede furukawa',
    'conector rj45',
  ]);
});
