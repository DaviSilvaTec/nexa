import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../catalog/bling-service-note-history-cache';
import type { OpenAIBudgetAssistantGateway } from '../gateways/openai-budget-assistant-gateway';

interface BuildAiAssistedAgentResponseInput {
  originalText: string;
  materialLimitPerQuery?: number;
  quoteLimitPerContact?: number;
  defaultAiModel?: string | null;
}

interface BuildAiAssistedAgentResponseDependencies {
  contactCatalogCache: BlingContactCatalogCache;
  productCatalogCache: BlingProductCatalogCache;
  quoteHistoryCache: BlingQuoteHistoryCache;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
  openAIBudgetAssistantGateway: OpenAIBudgetAssistantGateway;
  onProgress?: (input: {
    phase:
      | 'extracting_intake'
      | 'building_context'
      | 'interpreting_request'
      | 'saving_session';
    userMessage: string;
  }) => Promise<void> | void;
}

export async function buildAiAssistedAgentResponse(
  input: BuildAiAssistedAgentResponseInput,
  dependencies: BuildAiAssistedAgentResponseDependencies,
) {
  await dependencies.onProgress?.({
    phase: 'extracting_intake',
    userMessage:
      'Estamos lendo sua solicitação e organizando a primeira interpretação do orçamento.',
  });
  const aiContext = {
    type: 'ai_budget_assistant_context_built' as const,
    payload: {
      task: 'interpret_budget_request' as const,
      originalText: input.originalText,
      customer: null,
      materialCandidates: [],
      materialFinancialSummary: {
        saleTotal: 0,
        costTotal: 0,
        grossProfit: 0,
        itemsWithCompleteBase: 0,
        alerts: [],
      },
      operatingRules: [
        'A primeira interação apenas organiza o orçamento inicial e não consolida cliente nem materiais finais.',
        'Nenhuma ação operacional deve ser executada sem aprovação explícita do usuário.',
        'A consolidação final de cliente e materiais acontecerá apenas na revisão obrigatória.',
      ],
    },
  };

  await dependencies.onProgress?.({
    phase: 'building_context',
    userMessage:
      'Estamos preparando apenas as regras da primeira interação, sem consultar a base local nesta etapa.',
  });

  await dependencies.onProgress?.({
    phase: 'interpreting_request',
    userMessage:
      'A IA está montando a primeira versão organizada do orçamento com base no texto recebido.',
  });
  const aiResponse = await dependencies.openAIBudgetAssistantGateway
    .interpretBudgetRequest(aiContext.payload, {
      modelOverride: normalizeAiModel(input.defaultAiModel),
    });
  const sanitizedAiResponse = {
    ...aiResponse,
    interpretation: {
      ...aiResponse.interpretation,
      materialItems: aiResponse.interpretation.materialItems.map((item) => ({
        ...item,
        // A primeira interação só organiza o orçamento e não fecha item de catálogo.
        catalogItemId: null,
        catalogItemName: null,
      })),
    },
  };
  const intakeExtraction = {
    type: 'budget_intake_extracted' as const,
    extraction: {
      customerQuery: sanitizedAiResponse.interpretation.customerQuery,
      materialQueries: sanitizedAiResponse.interpretation.materialItems
        .map((item) => item.description.trim())
        .filter((item) => item.length > 0),
      serviceHints: sanitizedAiResponse.interpretation.serviceItems
        .map((item) => item.description.trim())
        .filter((item) => item.length > 0),
      ambiguities: sanitizedAiResponse.interpretation.pendingQuestions,
    },
  };
  const localResponse = {
    type: 'local_agent_response_built' as const,
    response: {
      receivedText: input.originalText,
      structuredSuggestion:
        sanitizedAiResponse.interpretation.budgetDescription ||
        'Primeira interpretação inicial gerada.',
      possibleMissingItems: [],
      pointsOfAttention: sanitizedAiResponse.interpretation.pointsOfAttention,
      suggestions: sanitizedAiResponse.interpretation.suggestions,
      financialSummary: {
        saleTotal: 0,
        costTotal: 0,
        grossProfit: 0,
        itemsWithCompleteBase: 0,
      },
      baseUsed: ['texto original do usuário', 'interpretação inicial da IA'],
      confidence: sanitizedAiResponse.interpretation.confidence,
      status: 'Aguardando aprovacao' as const,
    },
  };

  await dependencies.onProgress?.({
    phase: 'saving_session',
    userMessage:
      'Estamos consolidando a resposta final e salvando a sessão para exibição.',
  });

  return {
    type: 'ai_assisted_agent_response_built' as const,
    intakeExtraction,
    aiContext,
    localResponse,
    aiResponse: sanitizedAiResponse,
  };
}

function normalizeAiModel(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';

  return normalized.length > 0 ? normalized : null;
}
