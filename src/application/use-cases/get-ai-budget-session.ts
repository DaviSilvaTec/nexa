import type { AiBudgetSessionRepository } from '../repositories/ai-budget-session-repository';

interface GetAiBudgetSessionInput {
  sessionId: string;
}

interface GetAiBudgetSessionDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
}

export async function getAiBudgetSession(
  input: GetAiBudgetSessionInput,
  dependencies: GetAiBudgetSessionDependencies,
) {
  const session = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!session) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  return {
    type: 'ai_budget_session_loaded' as const,
    session,
  };
}
