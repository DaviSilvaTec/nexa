import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
} from '../repositories/ai-budget-session-repository';

interface UpdateAiBudgetSessionStatusInput {
  sessionId: string;
  status: string;
  updatedAt?: Date;
}

interface UpdateAiBudgetSessionStatusDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
}

export async function updateAiBudgetSessionStatus(
  input: UpdateAiBudgetSessionStatusInput,
  dependencies: UpdateAiBudgetSessionStatusDependencies,
) {
  const existingSession = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!existingSession) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  const updatedSession: AiBudgetSessionRecord = {
    ...existingSession,
    updatedAt: (input.updatedAt ?? new Date()).toISOString(),
    status: input.status,
    payload: updatePayloadStatus(existingSession.payload, input.status),
  };

  await dependencies.aiBudgetSessionRepository.save(updatedSession);

  return {
    type: 'ai_budget_session_status_updated' as const,
    session: updatedSession,
  };
}

function updatePayloadStatus(payload: unknown, status: string): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const record = payload as Record<string, unknown>;
  const localResponse = asRecord(record.localResponse);
  const response = asRecord(localResponse?.response);

  if (!localResponse || !response) {
    return payload;
  }

  return {
    ...record,
    localResponse: {
      ...localResponse,
      response: {
        ...response,
        status,
      },
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
}
