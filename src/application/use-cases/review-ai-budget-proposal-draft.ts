import type { OpenAIBudgetAssistantGateway } from '../gateways/openai-budget-assistant-gateway';
import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
} from '../repositories/ai-budget-session-repository';
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
  const reviewRequestedAt = (input.reviewedAt ?? new Date()).toISOString();
  const requestedSession: AiBudgetSessionRecord = {
    ...session,
    updatedAt: reviewRequestedAt,
    payload: updateAiBudgetWorkflowState(
      payload,
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
