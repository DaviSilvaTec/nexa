import type { OpenAIBudgetAssistantGateway } from '../gateways/openai-budget-assistant-gateway';
import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
} from '../repositories/ai-budget-session-repository';
import { buildCustomerCandidates } from './build-customer-candidates';
import { buildExpandedMaterialCandidates } from './build-expanded-material-candidates';
import { updateAiBudgetWorkflowState } from './update-ai-budget-workflow-state';

interface ReviewAiBudgetProposalDraftInput {
  sessionId: string;
  reviewedAt?: Date;
  reviewModel?: string | null;
  reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only' | null;
}

interface ReviewAiBudgetProposalDraftDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
  openAIBudgetAssistantGateway: OpenAIBudgetAssistantGateway;
  contactCatalogCache: BlingContactCatalogCache;
  productCatalogCache: BlingProductCatalogCache;
}

export async function reviewAiBudgetProposalDraft(
  input: ReviewAiBudgetProposalDraftInput,
  dependencies: ReviewAiBudgetProposalDraftDependencies,
) {
  const session = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!session) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  if (session.status !== 'Proposta comercial pronta') {
    throw new Error(
      `AI budget session "${input.sessionId}" must be in proposal review before AI revision.`,
    );
  }

  const payload = asRecord(session.payload);
  const proposalDraft = asRecord(payload.proposalDraft);

  if (Object.keys(proposalDraft).length === 0) {
    throw new Error(
      `AI budget session "${input.sessionId}" must have a generated proposal draft before AI revision.`,
    );
  }

  const interpretation = asRecord(asRecord(payload.aiResponse).interpretation);
  const aiContextPayload = asRecord(asRecord(payload.aiContext).payload);
  const interpretationMaterialItems = asMaterialSelectionItems(interpretation.materialItems);
  const expandedMaterialCandidates = mergeMaterialCandidates(
    asMaterialCandidates(aiContextPayload.materialCandidates),
    await buildExpandedMaterialCandidates(
      interpretationMaterialItems,
      dependencies.productCatalogCache,
    ),
  );
  const customerCandidates = await buildCustomerCandidates(
    [
      asString(asRecord(payload.resolvedCustomer).name),
      asString(asRecord(proposalDraft).customerQuery),
      session.customerQuery,
    ],
    dependencies.contactCatalogCache,
  );
  const reviewRequestedAt = (input.reviewedAt ?? new Date()).toISOString();
  const requestedSession: AiBudgetSessionRecord = {
    ...session,
    updatedAt: reviewRequestedAt,
    payload: updateAiBudgetWorkflowState(
      {
        ...payload,
        materialCandidatesExpanded: expandedMaterialCandidates,
        customerCandidates,
      },
      reviewRequestedAt,
      {
        currentStage: 'proposal_review_requested',
        currentStageLabel: 'Revisão do rascunho solicitada',
        reviewRequestedAt,
        availableData: {
          hasProposalDraft: true,
          hasReviewInstructions:
            asString(proposalDraft.reviewInstructions).trim().length > 0,
        },
      },
    ),
  };

  await dependencies.aiBudgetSessionRepository.save(requestedSession);

  const review = await dependencies.openAIBudgetAssistantGateway.reviewProposalDraft({
    originalText: session.originalText,
    proposalDraft: asString(proposalDraft.commercialBody),
    reviewInstructions: asString(proposalDraft.reviewInstructions),
    modelOverride: normalizeReviewModel(input.reviewModel),
    reviewBehavior: normalizeReviewBehavior(input.reviewBehavior),
    customerName:
      asString(asRecord(payload.resolvedCustomer).name) || session.customerQuery,
    budgetDescription: asString(interpretation.budgetDescription),
    workDescription: asString(interpretation.workDescription),
    materialItems: asSectionItems(interpretation.materialItems),
    materialCandidates: expandedMaterialCandidates,
    customerCandidates,
    serviceItems: asSectionItems(interpretation.serviceItems),
    pointsOfAttention: asStringList(interpretation.pointsOfAttention),
  });

  const reviewedAt = reviewRequestedAt;
  const updatedSession: AiBudgetSessionRecord = {
    ...requestedSession,
    updatedAt: reviewedAt,
    payload: updateAiBudgetWorkflowState({
      ...asRecord(requestedSession.payload),
      proposalDraftReview: {
        ...review.review,
        reviewedAt,
      },
    },
    reviewedAt,
    {
      currentStage: 'proposal_review_completed',
      currentStageLabel: 'Revisão do rascunho concluída',
      reviewRequestedAt: reviewedAt,
      reviewCompletedAt: reviewedAt,
      availableData: {
        hasProposalDraft: true,
        hasReviewInstructions: asString(proposalDraft.reviewInstructions).trim().length > 0,
        hasReviewResult: true,
        hasExpandedMaterialCandidates: expandedMaterialCandidates.length > 0,
        hasCustomerCandidates: customerCandidates.length > 0,
      },
    }),
  };

  await dependencies.aiBudgetSessionRepository.save(updatedSession);

  return {
    type: 'ai_budget_proposal_draft_reviewed' as const,
    session: updatedSession,
    review: review.review,
  };
}

function normalizeReviewModel(value: string | null | undefined): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';

  return normalized.length > 0 ? normalized : null;
}

function normalizeReviewBehavior(
  value: 'manual' | 'double-check' | 'suggestion-only' | null | undefined,
): 'manual' | 'double-check' | 'suggestion-only' {
  if (value === 'double-check' || value === 'suggestion-only') {
    return value;
  }

  return 'manual';
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

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter(Boolean);
}

function asSectionItems(
  value: unknown,
): Array<{ description: string; quantityText: string; estimatedValueText: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .map((item) => ({
      description: asString(item.description),
      quantityText: asString(item.quantityText),
      estimatedValueText: asString(item.estimatedValueText),
    }))
    .filter((item) => item.description.length > 0);
}

function asMaterialSelectionItems(
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
        typeof item.totalMatches === 'number' ? item.totalMatches : 0,
      candidates: Array.isArray(item.candidates)
        ? item.candidates
            .map((candidate) => asRecord(candidate))
            .map((candidate) => ({
              id: asString(candidate.id),
              name: asString(candidate.name),
              code: asNullableString(candidate.code),
              price:
                typeof candidate.price === 'number' ? candidate.price : null,
              costPrice:
                typeof candidate.costPrice === 'number' ? candidate.costPrice : null,
              stockQuantity:
                typeof candidate.stockQuantity === 'number'
                  ? candidate.stockQuantity
                  : null,
              type: asNullableString(candidate.type),
              status: asNullableString(candidate.status),
            }))
            .filter((candidate) => candidate.id.length > 0 && candidate.name.length > 0)
        : [],
    }))
    .filter((item) => item.query.length > 0 && item.candidates.length > 0);
}

function mergeMaterialCandidates(
  baseCandidates: Array<{
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
  }>,
  expandedCandidates: Array<{
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
  }>,
) {
  const merged = new Map<string, (typeof baseCandidates)[number]>();

  for (const group of [...baseCandidates, ...expandedCandidates]) {
    const key = normalizeText(group.query);
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...group,
        candidates: [...group.candidates],
      });
      continue;
    }

    const candidateMap = new Map(
      existing.candidates.map((candidate) => [candidate.id, candidate]),
    );

    for (const candidate of group.candidates) {
      if (!candidateMap.has(candidate.id)) {
        candidateMap.set(candidate.id, candidate);
      }
    }

    merged.set(key, {
      query: existing.query,
      totalMatches: candidateMap.size,
      candidates: Array.from(candidateMap.values()).slice(0, 12),
    });
  }

  return Array.from(merged.values());
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
