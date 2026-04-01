import { randomUUID } from 'node:crypto';

export type AiAgentOperationStatus = 'running' | 'completed' | 'failed';

export interface AiAgentOperationRecord {
  id: string;
  status: AiAgentOperationStatus;
  phase:
    | 'queued'
    | 'extracting_intake'
    | 'building_context'
    | 'interpreting_request'
    | 'saving_session'
    | 'completed'
    | 'failed';
  userMessage: string;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  payload: unknown;
  error: string | null;
}

export class InMemoryAiAgentOperationStore {
  private readonly operations = new Map<string, AiAgentOperationRecord>();

  create(input?: { userMessage?: string; startedAt?: Date }) {
    const timestamp = (input?.startedAt ?? new Date()).toISOString();
    const operation: AiAgentOperationRecord = {
      id: randomUUID(),
      status: 'running',
      phase: 'queued',
      userMessage:
        input?.userMessage ?? 'Recebemos sua solicitação e vamos iniciar a análise.',
      startedAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
      payload: null,
      error: null,
    };

    this.operations.set(operation.id, operation);
    return operation;
  }

  get(id: string) {
    return this.operations.get(id) ?? null;
  }

  update(
    id: string,
    input: {
      phase: AiAgentOperationRecord['phase'];
      userMessage: string;
      updatedAt?: Date;
    },
  ) {
    const current = this.operations.get(id);

    if (!current) {
      return null;
    }

    const updated: AiAgentOperationRecord = {
      ...current,
      phase: input.phase,
      userMessage: input.userMessage,
      updatedAt: (input.updatedAt ?? new Date()).toISOString(),
    };

    this.operations.set(id, updated);
    return updated;
  }

  complete(id: string, payload: unknown, completedAt?: Date) {
    const current = this.operations.get(id);

    if (!current) {
      return null;
    }

    const timestamp = (completedAt ?? new Date()).toISOString();
    const updated: AiAgentOperationRecord = {
      ...current,
      status: 'completed',
      phase: 'completed',
      userMessage: 'Análise concluída. O retorno final do NEXA está pronto.',
      updatedAt: timestamp,
      completedAt: timestamp,
      payload,
      error: null,
    };

    this.operations.set(id, updated);
    return updated;
  }

  fail(id: string, error: string, failedAt?: Date) {
    const current = this.operations.get(id);

    if (!current) {
      return null;
    }

    const timestamp = (failedAt ?? new Date()).toISOString();
    const updated: AiAgentOperationRecord = {
      ...current,
      status: 'failed',
      phase: 'failed',
      userMessage:
        'Não foi possível concluir a análise agora. Revise a mensagem de erro e tente novamente.',
      updatedAt: timestamp,
      completedAt: timestamp,
      payload: null,
      error,
    };

    this.operations.set(id, updated);
    return updated;
  }
}
