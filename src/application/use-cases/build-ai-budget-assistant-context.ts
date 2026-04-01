interface BuildAiBudgetAssistantContextInput {
  originalText: string;
  budgetContext: {
    type: 'local_budget_context_built';
    customer:
      | {
          contact: {
            id: string;
            name: string;
            code: string | null;
            status: string | null;
            documentNumber: string | null;
            phone: string | null;
            mobilePhone: string | null;
          };
          quotes: Array<{
            id: string;
            date: string | null;
            status: string | null;
            total: number | null;
            productsTotal: number | null;
            number: string | null;
            contactId: string | null;
            storeId: string | null;
          }>;
          serviceNotes: Array<{
            id: string;
            number: string | null;
            rpsNumber: string | null;
            series: string | null;
            status: number | null;
            issueDate: string | null;
            value: number | null;
            contactId: string | null;
            contactName: string | null;
            contactDocument: string | null;
            contactEmail: string | null;
            link: string | null;
            verificationCode: string | null;
          }>;
          summary: {
            quoteCount: number;
            serviceNoteCount: number;
            latestQuoteDate: string | null;
            latestServiceNoteDate: string | null;
          };
        }
      | null;
    materials: Array<{
      query: string;
      matches: Array<{
        id: string;
        name: string;
        code: string | null;
        price: number | null;
        costPrice: number | null;
        stockQuantity: number | null;
        type: string | null;
        status: string | null;
      }>;
      totalMatches: number;
    }>;
  };
  materialAnalysis: {
    type: 'local_budget_materials_analyzed';
    summary: {
      matchedItems: Array<{
        id: string;
        name: string;
        code: string | null;
        price: number | null;
        costPrice: number | null;
        stockQuantity: number | null;
        type: string | null;
        status: string | null;
        sourceQuery: string;
      }>;
      financial: {
        totals: {
          sale: number;
          cost: number;
          grossProfit: number;
        };
        itemsWithCompleteBase: number;
        itemsMissingSalePrice: Array<{
          id: string;
          name: string;
          sourceQuery: string;
        }>;
        itemsMissingCostPrice: Array<{
          id: string;
          name: string;
          sourceQuery: string;
        }>;
      };
      alerts: string[];
    };
  };
}

type BuildAiBudgetAssistantContextResult = {
  type: 'ai_budget_assistant_context_built';
  payload: {
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
  };
};

export async function buildAiBudgetAssistantContext(
  input: BuildAiBudgetAssistantContextInput,
): Promise<BuildAiBudgetAssistantContextResult> {
  return {
    type: 'ai_budget_assistant_context_built',
    payload: {
      task: 'interpret_budget_request',
      originalText: input.originalText,
      customer: input.budgetContext.customer
        ? {
            contact: {
              id: input.budgetContext.customer.contact.id,
              name: input.budgetContext.customer.contact.name,
              code: input.budgetContext.customer.contact.code,
              documentNumber: input.budgetContext.customer.contact.documentNumber,
              phone: input.budgetContext.customer.contact.phone,
              mobilePhone: input.budgetContext.customer.contact.mobilePhone,
            },
            history: {
              quoteCount: input.budgetContext.customer.summary.quoteCount,
              serviceNoteCount: input.budgetContext.customer.summary.serviceNoteCount,
              latestQuoteDate: input.budgetContext.customer.summary.latestQuoteDate,
              latestServiceNoteDate:
                input.budgetContext.customer.summary.latestServiceNoteDate,
            },
            recentQuotes: input.budgetContext.customer.quotes.map((quote) => ({
              id: quote.id,
              number: quote.number,
              date: quote.date,
              status: quote.status,
              total: quote.total,
            })),
            recentServiceNotes: input.budgetContext.customer.serviceNotes.map(
              (serviceNote) => ({
                id: serviceNote.id,
                number: serviceNote.number,
                issueDate: serviceNote.issueDate,
                status: serviceNote.status,
                value: serviceNote.value,
              }),
            ),
          }
        : null,
      materialCandidates: input.budgetContext.materials.map((material) => ({
        query: material.query,
        totalMatches: material.totalMatches,
        candidates: material.matches,
      })),
      materialFinancialSummary: {
        saleTotal: input.materialAnalysis.summary.financial.totals.sale,
        costTotal: input.materialAnalysis.summary.financial.totals.cost,
        grossProfit: input.materialAnalysis.summary.financial.totals.grossProfit,
        itemsWithCompleteBase:
          input.materialAnalysis.summary.financial.itemsWithCompleteBase,
        alerts: input.materialAnalysis.summary.alerts,
      },
      operatingRules: [
        'Nunca executar criacao de orçamento ou qualquer acao operacional sem aprovacao explicita do usuario.',
        'Itens inferidos ou sugeridos nunca devem ser tratados como confirmados sem validacao do usuario.',
        'Usar o contexto local e historico como referencia principal antes de sugerir materiais, estrutura ou ajustes.',
        'Resumo financeiro de materiais serve como apoio operacional e nao como decisao contabil definitiva.',
      ],
    },
  };
}
