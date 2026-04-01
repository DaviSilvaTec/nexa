import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
} from '../repositories/ai-budget-session-repository';

interface RejectAiBudgetProposalDraftReviewInput {
  sessionId: string;
  rejectedAt?: Date;
}

interface RejectAiBudgetProposalDraftReviewDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
}

export async function rejectAiBudgetProposalDraftReview(
  input: RejectAiBudgetProposalDraftReviewInput,
  dependencies: RejectAiBudgetProposalDraftReviewDependencies,
) {
  const session = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!session) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  if (session.status !== 'Proposta comercial pronta') {
    throw new Error(
      `AI budget session "${input.sessionId}" must be in proposal review before rejecting AI review adjustments.`,
    );
  }

  const payload = asRecord(session.payload);
  const proposalDraftReview = asRecord(payload.proposalDraftReview);

  if (Object.keys(proposalDraftReview).length === 0) {
    throw new Error(
      `AI budget session "${input.sessionId}" must have an AI draft review before rejecting adjustments.`,
    );
  }

  const rejectedAt = (input.rejectedAt ?? new Date()).toISOString();
  const { proposalDraftReview: _removedReview, ...restPayload } = payload;
  const updatedSession: AiBudgetSessionRecord = {
    ...session,
    updatedAt: rejectedAt,
    payload: {
      ...restPayload,
    },
  };

  await dependencies.aiBudgetSessionRepository.save(updatedSession);

  return {
    type: 'ai_budget_proposal_draft_review_rejected' as const,
    session: updatedSession,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}
