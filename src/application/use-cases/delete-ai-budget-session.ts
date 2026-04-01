import type { AiBudgetSessionRepository } from '../repositories/ai-budget-session-repository';

interface DeleteAiBudgetSessionInput {
  sessionId: string;
}

interface DeleteAiBudgetSessionDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
}

export async function deleteAiBudgetSession(
  input: DeleteAiBudgetSessionInput,
  dependencies: DeleteAiBudgetSessionDependencies,
) {
  const deleted = await dependencies.aiBudgetSessionRepository.delete(
    input.sessionId,
  );

  if (!deleted) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  return {
    type: 'ai_budget_session_deleted' as const,
    sessionId: input.sessionId,
  };
}
