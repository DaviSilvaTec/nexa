interface BuildLocalAgentResponseInput {
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

type BuildLocalAgentResponseResult = {
  type: 'local_agent_response_built';
  response: {
    receivedText: string;
    structuredSuggestion: string;
    possibleMissingItems: string[];
    pointsOfAttention: string[];
    suggestions: string[];
    financialSummary: {
      saleTotal: number;
      costTotal: number;
      grossProfit: number;
      itemsWithCompleteBase: number;
    };
    baseUsed: string[];
    confidence: 'alto' | 'medio' | 'baixo';
    status: 'Aguardando aprovacao';
  };
};

export async function buildLocalAgentResponse(
  input: BuildLocalAgentResponseInput,
): Promise<BuildLocalAgentResponseResult> {
  const customerName = input.budgetContext.customer?.contact.name;
  const matchedMaterialNames = input.materialAnalysis.summary.matchedItems.map(
    (item) => item.name,
  );

  const structuredLines = [
    customerName ? `Cliente identificado: ${customerName}.` : 'Cliente ainda nao identificado localmente.',
    matchedMaterialNames.length > 0
      ? `Materiais candidatos localizados: ${matchedMaterialNames.join(', ')}.`
      : 'Nenhum material local validado ate o momento.',
  ];

  const suggestions = input.materialAnalysis.summary.matchedItems.map(
    (item) =>
      `Usar "${item.name}" como referencia local para a consulta "${item.sourceQuery}".`,
  );

  const pointsOfAttention = [
    ...input.materialAnalysis.summary.alerts,
    ...(input.budgetContext.customer
      ? []
      : ['Contato ainda nao confirmado no catalogo local.']),
  ];

  const possibleMissingItems = input.budgetContext.materials
    .filter((material) => material.totalMatches === 0)
    .map((material) => material.query);

  const baseUsed = [
    'catalogo local de contatos',
    'historico local de propostas comerciais',
    'historico local de notas de servico',
    'catalogo local de produtos',
  ];

  const confidence = pointsOfAttention.length > 0
    ? 'baixo'
    : input.budgetContext.customer && matchedMaterialNames.length > 0
      ? 'medio'
      : 'baixo';

  return {
    type: 'local_agent_response_built',
    response: {
      receivedText: input.originalText,
      structuredSuggestion: structuredLines.join(' '),
      possibleMissingItems,
      pointsOfAttention,
      suggestions,
      financialSummary: {
        saleTotal: input.materialAnalysis.summary.financial.totals.sale,
        costTotal: input.materialAnalysis.summary.financial.totals.cost,
        grossProfit: input.materialAnalysis.summary.financial.totals.grossProfit,
        itemsWithCompleteBase:
          input.materialAnalysis.summary.financial.itemsWithCompleteBase,
      },
      baseUsed,
      confidence,
      status: 'Aguardando aprovacao',
    },
  };
}
