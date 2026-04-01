import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
} from '../repositories/ai-budget-session-repository';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type { OpenAIBudgetAssistantGateway } from '../gateways/openai-budget-assistant-gateway';
import { calculateMaterialFinancialSummary } from './calculate-material-financial-summary';
import { extractCustomerFromCommercialBody } from './extract-customer-from-commercial-body';
import { extractMaterialItemsFromCommercialBody } from './extract-material-items-from-commercial-body';
import { updateCommercialBodyMaterialSection } from './update-commercial-body-material-section';
import { updateAiBudgetWorkflowState } from './update-ai-budget-workflow-state';

interface UpdateAiBudgetProposalDraftInput {
  sessionId: string;
  commercialBody: string;
  reviewInstructions?: string;
  updatedAt?: Date;
}

interface UpdateAiBudgetProposalDraftDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
  productCatalogCache: BlingProductCatalogCache;
  openAIBudgetAssistantGateway: OpenAIBudgetAssistantGateway;
}

export async function updateAiBudgetProposalDraft(
  input: UpdateAiBudgetProposalDraftInput,
  dependencies: UpdateAiBudgetProposalDraftDependencies,
) {
  const session = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!session) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  if (session.status !== 'Proposta comercial pronta') {
    throw new Error(
      `AI budget session "${input.sessionId}" must be in proposal review before editing the commercial draft.`,
    );
  }

  const payload = asRecord(session.payload);
  const proposalDraft = asRecord(payload.proposalDraft);

  if (Object.keys(proposalDraft).length === 0) {
    throw new Error(
      `AI budget session "${input.sessionId}" must have a generated proposal draft before editing.`,
    );
  }

  const updatedAt = (input.updatedAt ?? new Date()).toISOString();
  const draftCommercialBody = input.commercialBody.trim();
  const reviewInstructions = (input.reviewInstructions ?? '').trim();
  const parsedMaterialItems = extractMaterialItemsFromCommercialBody(draftCommercialBody);
  const expandedMaterialCandidates = await buildExpandedMaterialCandidates(
    parsedMaterialItems,
    dependencies.productCatalogCache,
  );
  const payloadAiContext = asRecord(asRecord(payload.aiContext).payload);
  const currentResolvedCustomerName = asString(asRecord(payload.resolvedCustomer).name);
  const materialReconciliation =
    parsedMaterialItems.length > 0 && expandedMaterialCandidates.length > 0
      ? await dependencies.openAIBudgetAssistantGateway.reconcileProposalMaterials({
          originalText: session.originalText,
          proposalDraft: draftCommercialBody,
          customerName: currentResolvedCustomerName || session.customerQuery,
          materialItems: parsedMaterialItems,
          materialCandidates: expandedMaterialCandidates,
        })
      : null;
  const reconciledMaterialItems =
    materialReconciliation?.reconciliation.materialItems ?? parsedMaterialItems;
  const productCatalog = await dependencies.productCatalogCache.read();
  const financialSummary = calculateMaterialFinancialSummary({
    materialItems: reconciledMaterialItems,
    products: productCatalog?.items ?? [],
  });
  const commercialBody = updateCommercialBodyMaterialSection({
    commercialBody: draftCommercialBody,
    materialItems: reconciledMaterialItems,
  });
  const extractedCustomerQuery = extractCustomerFromCommercialBody(commercialBody);
  const aiResponse = asRecord(payload.aiResponse);
  const interpretation = asRecord(aiResponse.interpretation);
  const updatedSession: AiBudgetSessionRecord = {
    ...session,
    ...(extractedCustomerQuery ? { customerQuery: extractedCustomerQuery } : {}),
    updatedAt,
    payload: updateAiBudgetWorkflowState({
      ...payload,
      aiResponse: {
        ...aiResponse,
        interpretation: {
          ...interpretation,
          materialItems: reconciledMaterialItems,
        },
      },
      proposalDraft: {
        ...proposalDraft,
        ...(extractedCustomerQuery ? { customerQuery: extractedCustomerQuery } : {}),
        commercialBody,
        reviewInstructions,
        financialSummary,
        materialItems: reconciledMaterialItems,
        ...(materialReconciliation
          ? {
              materialReconciliation: {
                ...materialReconciliation.reconciliation,
                reconciledAt: updatedAt,
                scope: 'save',
              },
            }
          : {
              materialReconciliation: null,
            }),
        editedAt: updatedAt,
      },
    },
    updatedAt,
    {
      currentStage: 'proposal_draft_updated',
      currentStageLabel: 'Rascunho comercial atualizado',
      proposalDraftEditedAt: updatedAt,
      ...(reviewInstructions.length > 0
        ? { reviewInstructionsUpdatedAt: updatedAt }
        : {}),
      finalSelectionsUpdatedAt: updatedAt,
      availableData: {
        hasProposalDraft: true,
        hasReviewInstructions: reviewInstructions.length > 0,
        hasExpandedMaterialCandidates: expandedMaterialCandidates.length > 0,
        hasFinalResolvedMaterials: reconciledMaterialItems.length > 0,
        hasFinalResolvedCustomer:
          Boolean(extractedCustomerQuery) ||
          Boolean(currentResolvedCustomerName) ||
          Boolean(session.customerQuery),
      },
    }),
  };

  await dependencies.aiBudgetSessionRepository.save(updatedSession);

  return {
    type: 'ai_budget_proposal_draft_updated' as const,
    session: updatedSession,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function buildExpandedMaterialCandidates(
  materialItems: Array<{
    description: string;
    quantityText: string;
    sourceQuery: string | null;
    catalogItemId: string | null;
    catalogItemName: string | null;
  }>,
  productCatalogCache: BlingProductCatalogCache,
): Promise<
  Array<{
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
  }>
> {
  const catalog = await productCatalogCache.read();
  const products = catalog?.items ?? [];

  return materialItems
    .map((item) => {
      const query = item.description;
      const rankedCandidates = products
        .map((product) => ({
          product,
          score: scoreExpandedCatalogMatch(query, product.name),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, 10)
        .map(({ product }) => ({
          id: String(product.id),
          name: product.name,
          code: product.code,
          price: product.price,
          costPrice: product.costPrice,
          stockQuantity: product.stockQuantity,
          type: product.type,
          status: product.status,
        }));

      return {
        query,
        totalMatches: rankedCandidates.length,
        candidates: rankedCandidates,
      };
    })
    .filter((item) => item.candidates.length > 0);
}

function scoreExpandedCatalogMatch(query: string, candidateName: string): number {
  const queryTokens = extractTokens(query);
  const candidateTokens = extractTokens(candidateName);
  let score = 0;

  for (const token of queryTokens) {
    if (candidateTokens.includes(token)) {
      score += token.length >= 6 ? 3 : 2;
    }
  }

  if (
    queryTokens.some((token) => token === 'bucha') &&
    !candidateTokens.includes('bucha')
  ) {
    score -= 8;
  }

  if (
    queryTokens.some((token) => token.startsWith('abrac')) &&
    ['organizar', 'fios', 'cabos', 'chicote', 'enrrolar'].some((token) =>
      candidateTokens.includes(token),
    )
  ) {
    score -= 10;
  }

  return score;
}

function extractTokens(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token, index, list) => list.indexOf(token) === index);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
