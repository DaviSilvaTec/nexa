import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../catalog/bling-service-note-history-cache';
import type { OpenAIBudgetAssistantGateway } from '../gateways/openai-budget-assistant-gateway';
import { analyzeLocalBudgetMaterials } from './analyze-local-budget-materials';
import { buildAiBudgetAssistantContext } from './build-ai-budget-assistant-context';
import { buildLocalAgentResponse } from './build-local-agent-response';
import { buildLocalBudgetContext } from './build-local-budget-context';
import { normalizeAiBudgetIntake } from './normalize-ai-budget-intake';

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
      'Estamos lendo sua solicitação e identificando cliente, materiais e contexto inicial.',
  });
  const rawIntakeExtraction = await dependencies.openAIBudgetAssistantGateway
    .extractBudgetIntake(input.originalText, {
      modelOverride: normalizeAiModel(input.defaultAiModel),
    });
  const intakeExtraction = {
    type: rawIntakeExtraction.type,
    extraction: normalizeAiBudgetIntake({
      originalText: input.originalText,
      ...rawIntakeExtraction.extraction,
    }),
  };

  await dependencies.onProgress?.({
    phase: 'building_context',
    userMessage:
      'Agora estamos cruzando o texto com a base local e organizando o contexto do orçamento.',
  });
  const budgetContext = await buildLocalBudgetContext(
    {
      customerQuery: intakeExtraction.extraction.customerQuery ?? '',
      materialQueries: intakeExtraction.extraction.materialQueries,
      ...(input.materialLimitPerQuery !== undefined
        ? { materialLimitPerQuery: input.materialLimitPerQuery }
        : {}),
      ...(input.quoteLimitPerContact !== undefined
        ? { quoteLimitPerContact: input.quoteLimitPerContact }
        : {}),
    },
    {
      contactCatalogCache: dependencies.contactCatalogCache,
      productCatalogCache: dependencies.productCatalogCache,
      quoteHistoryCache: dependencies.quoteHistoryCache,
      serviceNoteHistoryCache: dependencies.serviceNoteHistoryCache,
    },
  );

  const materialAnalysis = await analyzeLocalBudgetMaterials({
    materials: budgetContext.materials,
  });

  const aiContext = await buildAiBudgetAssistantContext({
    originalText: input.originalText,
    budgetContext,
    materialAnalysis,
  });

  await dependencies.onProgress?.({
    phase: 'interpreting_request',
    userMessage:
      'A IA está montando a interpretação final do orçamento com base no contexto encontrado.',
  });
  const aiResponse = await dependencies.openAIBudgetAssistantGateway
    .interpretBudgetRequest(aiContext.payload, {
      modelOverride: normalizeAiModel(input.defaultAiModel),
    });

  const localResponse = await buildLocalAgentResponse({
    originalText: input.originalText,
    budgetContext,
    materialAnalysis,
  });

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
    aiResponse,
  };
}

function normalizeAiModel(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';

  return normalized.length > 0 ? normalized : null;
}
