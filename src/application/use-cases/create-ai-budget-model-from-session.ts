import { randomUUID } from 'node:crypto';

import type { AiBudgetModelRepository } from '../repositories/ai-budget-model-repository';
import type { AiBudgetSessionRepository } from '../repositories/ai-budget-session-repository';

interface CreateAiBudgetModelFromSessionInput {
  sessionId: string;
  createdAt?: Date;
}

interface CreateAiBudgetModelFromSessionDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
  aiBudgetModelRepository: AiBudgetModelRepository;
}

export async function createAiBudgetModelFromSession(
  input: CreateAiBudgetModelFromSessionInput,
  dependencies: CreateAiBudgetModelFromSessionDependencies,
) {
  const session = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!session) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  if (session.status !== 'Finalizada') {
    throw new Error(
      `AI budget session "${input.sessionId}" must be finalized before becoming a model.`,
    );
  }

  const payload = asRecord(session.payload);
  const proposalDraft = asRecord(payload.proposalDraft);
  const blingQuote = asRecord(payload.blingQuote);
  const blingQuoteReference = asRecord(payload.blingQuoteReference);

  if (Object.keys(proposalDraft).length === 0) {
    throw new Error(
      `AI budget session "${input.sessionId}" must have a proposal draft before becoming a model.`,
    );
  }

  const timestamp = (input.createdAt ?? new Date()).toISOString();
  const draftText = asString(proposalDraft.commercialBody) || session.originalText;
  const title =
    asString(proposalDraft.title) ||
    `Modelo - ${session.customerQuery ?? 'Cliente não identificado'}`;

  const model = {
    id: randomUUID(),
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    customerQuery: session.customerQuery,
    sourceSessionId: session.id,
    previewText: draftText.slice(0, 120),
    blingQuoteId: asString(blingQuote.id) || asString(blingQuoteReference.id) || null,
    blingQuoteNumber:
      resolveBlingQuoteNumber(blingQuote, blingQuoteReference),
    draftText,
    payload: {
      ...payload,
      originalText: session.originalText,
      sourceSession: {
        id: session.id,
        customerQuery: session.customerQuery,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    },
  } as const;

  await dependencies.aiBudgetModelRepository.save(model);
  await dependencies.aiBudgetSessionRepository.delete(session.id);

  return {
    type: 'ai_budget_model_created_from_session' as const,
    model,
    deletedSessionId: session.id,
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

function resolveBlingQuoteNumber(
  blingQuote: Record<string, unknown>,
  blingQuoteReference: Record<string, unknown>,
): string | null {
  const currentNumber = asString(blingQuote.number);

  if (currentNumber && currentNumber !== '0') {
    return currentNumber;
  }

  const referenceNumber = asString(blingQuoteReference.number);
  return referenceNumber || currentNumber || null;
}
