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

interface AcceptAiBudgetProposalDraftReviewInput {
  sessionId: string;
  commercialBody: string;
  acceptedAt?: Date;
}

interface AcceptAiBudgetProposalDraftReviewDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
  openAIBudgetAssistantGateway: OpenAIBudgetAssistantGateway;
  productCatalogCache: BlingProductCatalogCache;
}

export async function acceptAiBudgetProposalDraftReview(
  input: AcceptAiBudgetProposalDraftReviewInput,
  dependencies: AcceptAiBudgetProposalDraftReviewDependencies,
) {
  const session = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!session) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  if (session.status !== 'Proposta comercial pronta') {
    throw new Error(
      `AI budget session "${input.sessionId}" must be in proposal review before accepting AI review adjustments.`,
    );
  }

  const payload = asRecord(session.payload);
  const proposalDraft = asRecord(payload.proposalDraft);
  const proposalDraftReview = asRecord(payload.proposalDraftReview);

  if (Object.keys(proposalDraft).length === 0) {
    throw new Error(
      `AI budget session "${input.sessionId}" must have a generated proposal draft before accepting AI review adjustments.`,
    );
  }

  if (Object.keys(proposalDraftReview).length === 0) {
    throw new Error(
      `AI budget session "${input.sessionId}" must have an AI draft review before accepting adjustments.`,
    );
  }

  const acceptedAt = (input.acceptedAt ?? new Date()).toISOString();
  const aiResponse = asRecord(payload.aiResponse);
  const interpretation = asRecord(aiResponse.interpretation);
  const aiContext = asRecord(payload.aiContext);
  const aiContextPayload = asRecord(aiContext.payload);
  const acceptedCommercialBody = input.commercialBody.trim();
  const currentMaterialItems = extractMaterialItemsFromCommercialBody(
    acceptedCommercialBody,
  );
  const materialCandidates = asMaterialCandidates(aiContextPayload.materialCandidates);
  const materialReconciliation =
    currentMaterialItems.length > 0 && materialCandidates.length > 0
      ? await dependencies.openAIBudgetAssistantGateway.reconcileProposalMaterials({
          originalText: session.originalText,
          proposalDraft: acceptedCommercialBody,
          customerName:
            asString(asRecord(payload.resolvedCustomer).name) || session.customerQuery,
          materialItems: currentMaterialItems,
          materialCandidates,
        })
      : null;
  const reconciledMaterialItems =
    materialReconciliation?.reconciliation.materialItems ?? currentMaterialItems;
  const productCatalog = await dependencies.productCatalogCache.read();
  const financialSummary = calculateMaterialFinancialSummary({
    materialItems: reconciledMaterialItems,
    products: productCatalog?.items ?? [],
  });
  const commercialBody = updateCommercialBodyMaterialSection({
    commercialBody: acceptedCommercialBody,
    materialItems: reconciledMaterialItems,
  });
  const extractedCustomerQuery = extractCustomerFromCommercialBody(commercialBody);
  const { proposalDraftReview: _removedReview, ...restPayload } = payload;
  const updatedSession: AiBudgetSessionRecord = {
    ...session,
    ...(extractedCustomerQuery ? { customerQuery: extractedCustomerQuery } : {}),
    updatedAt: acceptedAt,
    payload: {
      ...restPayload,
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
        financialSummary,
        materialItems: reconciledMaterialItems,
        ...(materialReconciliation
          ? {
              materialReconciliation: {
                ...materialReconciliation.reconciliation,
                reconciledAt: acceptedAt,
              },
            }
          : {
              materialReconciliation: null,
            }),
        editedAt: acceptedAt,
        reviewAcceptedAt: acceptedAt,
      },
    },
  };

  await dependencies.aiBudgetSessionRepository.save(updatedSession);

  return {
    type: 'ai_budget_proposal_draft_review_accepted' as const,
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

function asMaterialItems(
  value: unknown,
): Array<{
  description: string;
  quantityText: string;
  sourceQuery: string | null;
  catalogItemId: string | null;
  catalogItemName: string | null;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .map((item) => ({
      description: asString(item.description),
      quantityText: asString(item.quantityText),
      sourceQuery: asNullableString(item.sourceQuery),
      catalogItemId: asNullableString(item.catalogItemId),
      catalogItemName: asNullableString(item.catalogItemName),
    }))
    .filter((item) => item.description.length > 0);
}

function asMaterialCandidates(
  value: unknown,
): Array<{
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
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .map((item) => ({
      query: asString(item.query),
      totalMatches:
        typeof item.totalMatches === 'number' && Number.isFinite(item.totalMatches)
          ? item.totalMatches
          : 0,
      candidates: Array.isArray(item.candidates)
        ? item.candidates
            .map((candidate) => asRecord(candidate))
            .map((candidate) => ({
              id: asString(candidate.id),
              name: asString(candidate.name),
              code: asNullableString(candidate.code),
              price: asNullableNumber(candidate.price),
              costPrice: asNullableNumber(candidate.costPrice),
              stockQuantity: asNullableNumber(candidate.stockQuantity),
              type: asNullableString(candidate.type),
              status: asNullableString(candidate.status),
            }))
            .filter((candidate) => candidate.id.length > 0 && candidate.name.length > 0)
        : [],
    }))
    .filter((item) => item.query.length > 0 && item.candidates.length > 0);
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
