import type { AiBudgetSessionRepository } from '../repositories/ai-budget-session-repository';

interface ListAiBudgetSessionsInput {
  limit?: number;
}

interface ListAiBudgetSessionsDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
}

export async function listAiBudgetSessions(
  input: ListAiBudgetSessionsInput,
  dependencies: ListAiBudgetSessionsDependencies,
) {
  const sessions = await dependencies.aiBudgetSessionRepository.listRecent(
    input.limit,
  );

  return {
    type: 'ai_budget_sessions_listed' as const,
    sessions,
  };
}
