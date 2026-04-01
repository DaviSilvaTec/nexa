import { randomUUID } from 'node:crypto';

import type { AiBudgetModelRepository } from '../repositories/ai-budget-model-repository';
import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
} from '../repositories/ai-budget-session-repository';
import { updateAiBudgetWorkflowState } from './update-ai-budget-workflow-state';

interface StartAiBudgetSessionFromModelInput {
  modelId: string;
  mode: 'use' | 'edit';
  createdAt?: Date;
}

interface StartAiBudgetSessionFromModelDependencies {
  aiBudgetModelRepository: AiBudgetModelRepository;
  aiBudgetSessionRepository: AiBudgetSessionRepository;
}

export async function startAiBudgetSessionFromModel(
  input: StartAiBudgetSessionFromModelInput,
  dependencies: StartAiBudgetSessionFromModelDependencies,
) {
  const model = await dependencies.aiBudgetModelRepository.findById(input.modelId);

  if (!model) {
    throw new Error(`AI budget model "${input.modelId}" was not found.`);
  }

  if (input.mode === 'edit' && !model.blingQuoteId) {
    throw new Error(
      `AI budget model "${input.modelId}" does not reference a Bling quote for editing.`,
    );
  }

  const modelPayload = asRecord(model.payload);
  const proposalDraft = asRecord(modelPayload.proposalDraft);
  const localResponse = asRecord(modelPayload.localResponse);
  const localResponseBody = asRecord(localResponse.response);
  const timestamp = (input.createdAt ?? new Date()).toISOString();

  const payload: Record<string, unknown> = {
    ...modelPayload,
    proposalDraft: {
      ...proposalDraft,
      loadedFromModelAt: timestamp,
      loadedFromModelMode: input.mode,
    },
    localResponse:
      Object.keys(localResponseBody).length > 0
        ? {
            ...localResponse,
            response: {
              ...localResponseBody,
              status: 'Proposta comercial pronta',
            },
          }
        : localResponse,
  };

  delete payload.proposalDraftReview;
  delete payload.proposalConfirmation;
  delete payload.blingQuote;

  if (input.mode === 'edit') {
    payload.blingQuoteReference = {
      id: model.blingQuoteId,
      number: model.blingQuoteNumber,
      sourceModelId: model.id,
    };
  } else {
    delete payload.blingQuoteReference;
  }

  const session: AiBudgetSessionRecord = {
    id: randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    originalText: model.draftText,
    customerQuery: model.customerQuery,
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: updateAiBudgetWorkflowState(payload, timestamp, {
      currentStage: input.mode === 'edit'
        ? 'model_edit_loaded'
        : 'model_loaded_for_use',
      currentStageLabel:
        input.mode === 'edit'
          ? 'Modelo carregado para edição'
          : 'Modelo carregado para uso',
      loadedFromModelAt: timestamp,
      loadedFromModelMode: input.mode,
      proposalDraftGeneratedAt: timestamp,
      finalSelectionsUpdatedAt: timestamp,
      availableData: {
        hasProposalDraft: Object.keys(proposalDraft).length > 0,
        hasReviewInstructions:
          typeof proposalDraft.reviewInstructions === 'string' &&
          proposalDraft.reviewInstructions.trim().length > 0,
        hasReviewResult: false,
        hasFinalResolvedCustomer: Boolean(model.customerQuery),
        hasFinalResolvedMaterials:
          Array.isArray(proposalDraft.materialItems) &&
          proposalDraft.materialItems.length > 0,
      },
    }),
  };

  await dependencies.aiBudgetSessionRepository.save(session);

  return {
    type: 'ai_budget_session_started_from_model' as const,
    session,
    mode: input.mode,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}
