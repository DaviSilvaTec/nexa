export interface AiBudgetAssistantContextPayload {
  task: 'interpret_budget_request';
  originalText: string;
  customer:
    | {
        contact: {
          id: string;
          name: string;
          code: string | null;
          documentNumber: string | null;
          phone: string | null;
          mobilePhone: string | null;
        };
        history: {
          quoteCount: number;
          serviceNoteCount: number;
          latestQuoteDate: string | null;
          latestServiceNoteDate: string | null;
        };
        recentQuotes: Array<{
          id: string;
          number: string | null;
          date: string | null;
          status: string | null;
          total: number | null;
        }>;
        recentServiceNotes: Array<{
          id: string;
          number: string | null;
          issueDate: string | null;
          status: number | null;
          value: number | null;
        }>;
      }
    | null;
  materialCandidates: Array<{
    query: string;
    totalMatches: number;
    candidates: Array<{
      id: string;
      name: string;
      code: string | null;
      price: number | null;
      costPrice: number | null;
      stockQuantity: number | null;
      type: string | null;
      status: string | null;
    }>;
  }>;
  materialFinancialSummary: {
    saleTotal: number;
    costTotal: number;
    grossProfit: number;
    itemsWithCompleteBase: number;
    alerts: string[];
  };
  operatingRules: string[];
}

export interface OpenAIBudgetAssistantGateway {
  extractBudgetIntake(
    originalText: string,
    options?: {
      modelOverride?: string | null;
    },
  ): Promise<{
    type: 'budget_intake_extracted';
    extraction: {
      customerQuery: string | null;
      materialQueries: string[];
      serviceHints: string[];
      ambiguities: string[];
    };
  }>;

  interpretBudgetRequest(
    payload: AiBudgetAssistantContextPayload,
    options?: {
      modelOverride?: string | null;
    },
  ): Promise<{
    type: 'budget_request_interpreted';
    interpretation: {
      summaryTitle: string;
      budgetDescription: string;
      workDescription: string;
      materialItems: Array<{
        description: string;
        quantityText: string;
        sourceQuery: string | null;
        catalogItemId: string | null;
        catalogItemName: string | null;
      }>;
      serviceItems: Array<{
        description: string;
        quantityText: string;
        estimatedValueText: string;
      }>;
      laborPriceResearch: {
        status: 'pendente' | 'estimado';
        summary: string;
        estimatedLaborRange: string | null;
        estimatedHours: string | null;
        basis: string | null;
        confidence: 'alto' | 'medio' | 'baixo';
      };
      pendingQuestions: string[];
      pointsOfAttention: string[];
      suggestions: string[];
      confidence: 'alto' | 'medio' | 'baixo';
      rationale: string;
      expectedUserAction: string;
    };
  }>;

  reviewProposalDraft(input: {
    originalText: string;
    proposalDraft: string;
    reviewInstructions: string;
    modelOverride?: string | null;
    reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only';
    customerName: string | null;
    budgetDescription: string;
    workDescription: string;
    materialItems: Array<{
      description: string;
      quantityText: string;
    }>;
    materialCandidates: Array<{
      query: string;
      totalMatches: number;
      candidates: Array<{
        id: string;
        name: string;
        code: string | null;
        price: number | null;
        costPrice: number | null;
        stockQuantity: number | null;
        type: string | null;
        status: string | null;
      }>;
    }>;
    customerCandidates: Array<{
      id: string;
      name: string;
      code: string | null;
      documentNumber: string | null;
      phone: string | null;
      mobilePhone: string | null;
      score: number;
    }>;
    serviceItems: Array<{
      description: string;
      quantityText: string;
      estimatedValueText: string;
    }>;
    pointsOfAttention: string[];
  }): Promise<{
    type: 'proposal_draft_reviewed';
    review: {
      summary: string;
      suggestedCommercialBody: string;
      resolvedCustomer:
        | {
            id: string;
            name: string;
            code: string | null;
            documentNumber: string | null;
          }
        | null;
      resolvedMaterialItems: Array<{
        description: string;
        quantityText: string;
        sourceQuery: string | null;
        catalogItemId: string | null;
        catalogItemName: string | null;
      }>;
      adjustmentNotes: string[];
      confidence: 'alto' | 'medio' | 'baixo';
    };
  }>;

  reconcileProposalMaterials(input: {
    originalText: string;
    proposalDraft: string;
    customerName: string | null;
    materialItems: Array<{
      description: string;
      quantityText: string;
      sourceQuery: string | null;
      catalogItemId: string | null;
      catalogItemName: string | null;
    }>;
    materialCandidates: Array<{
      query: string;
      totalMatches: number;
      candidates: Array<{
        id: string;
        name: string;
        code: string | null;
        price: number | null;
        costPrice: number | null;
        stockQuantity: number | null;
        type: string | null;
        status: string | null;
      }>;
    }>;
  }): Promise<{
    type: 'proposal_materials_reconciled';
    reconciliation: {
      summary: string;
      materialItems: Array<{
        description: string;
        quantityText: string;
        sourceQuery: string | null;
        catalogItemId: string | null;
        catalogItemName: string | null;
      }>;
      adjustmentNotes: string[];
      confidence: 'alto' | 'medio' | 'baixo';
    };
  }>;
}
