interface WorkflowStatePatch {
  currentStage?: string;
  currentStageLabel?: string;
  originalTextCapturedAt?: string;
  firstInterpretationCompletedAt?: string;
  proposalDraftGeneratedAt?: string;
  proposalDraftEditedAt?: string;
  reviewInstructionsUpdatedAt?: string;
  reviewRequestedAt?: string;
  reviewCompletedAt?: string;
  reviewAcceptedAt?: string;
  reviewRejectedAt?: string;
  finalSelectionsUpdatedAt?: string;
  confirmationCompletedAt?: string;
  loadedFromModelAt?: string;
  loadedFromModelMode?: 'use' | 'edit';
  availableData?: Partial<WorkflowAvailableData>;
}

interface WorkflowAvailableData {
  hasOriginalText: boolean;
  hasInitialInterpretation: boolean;
  hasProposalDraft: boolean;
  hasReviewInstructions: boolean;
  hasReviewResult: boolean;
  hasExpandedMaterialCandidates: boolean;
  hasCustomerCandidates: boolean;
  hasFinalResolvedCustomer: boolean;
  hasFinalResolvedMaterials: boolean;
  hasConfirmation: boolean;
}

interface WorkflowState extends WorkflowAvailableData {
  currentStage: string;
  currentStageLabel: string;
  lastPersistedAt: string | null;
  originalTextCapturedAt: string | null;
  firstInterpretationCompletedAt: string | null;
  proposalDraftGeneratedAt: string | null;
  proposalDraftEditedAt: string | null;
  reviewInstructionsUpdatedAt: string | null;
  reviewRequestedAt: string | null;
  reviewCompletedAt: string | null;
  reviewAcceptedAt: string | null;
  reviewRejectedAt: string | null;
  finalSelectionsUpdatedAt: string | null;
  confirmationCompletedAt: string | null;
  loadedFromModelAt: string | null;
  loadedFromModelMode: 'use' | 'edit' | null;
}

const DEFAULT_AVAILABLE_DATA: WorkflowAvailableData = {
  hasOriginalText: false,
  hasInitialInterpretation: false,
  hasProposalDraft: false,
  hasReviewInstructions: false,
  hasReviewResult: false,
  hasExpandedMaterialCandidates: false,
  hasCustomerCandidates: false,
  hasFinalResolvedCustomer: false,
  hasFinalResolvedMaterials: false,
  hasConfirmation: false,
};

export function updateAiBudgetWorkflowState(
  payload: unknown,
  persistedAt: string,
  patch: WorkflowStatePatch,
): Record<string, unknown> {
  const payloadRecord = asRecord(payload);
  const currentState = normalizeWorkflowState(payloadRecord.workflowState);

  const nextState: WorkflowState = {
    ...currentState,
    ...(patch.currentStage ? { currentStage: patch.currentStage } : {}),
    ...(patch.currentStageLabel ? { currentStageLabel: patch.currentStageLabel } : {}),
    ...(patch.originalTextCapturedAt
      ? { originalTextCapturedAt: patch.originalTextCapturedAt }
      : {}),
    ...(patch.firstInterpretationCompletedAt
      ? { firstInterpretationCompletedAt: patch.firstInterpretationCompletedAt }
      : {}),
    ...(patch.proposalDraftGeneratedAt
      ? { proposalDraftGeneratedAt: patch.proposalDraftGeneratedAt }
      : {}),
    ...(patch.proposalDraftEditedAt
      ? { proposalDraftEditedAt: patch.proposalDraftEditedAt }
      : {}),
    ...(patch.reviewInstructionsUpdatedAt
      ? { reviewInstructionsUpdatedAt: patch.reviewInstructionsUpdatedAt }
      : {}),
    ...(patch.reviewRequestedAt ? { reviewRequestedAt: patch.reviewRequestedAt } : {}),
    ...(patch.reviewCompletedAt ? { reviewCompletedAt: patch.reviewCompletedAt } : {}),
    ...(patch.reviewAcceptedAt ? { reviewAcceptedAt: patch.reviewAcceptedAt } : {}),
    ...(patch.reviewRejectedAt ? { reviewRejectedAt: patch.reviewRejectedAt } : {}),
    ...(patch.finalSelectionsUpdatedAt
      ? { finalSelectionsUpdatedAt: patch.finalSelectionsUpdatedAt }
      : {}),
    ...(patch.confirmationCompletedAt
      ? { confirmationCompletedAt: patch.confirmationCompletedAt }
      : {}),
    ...(patch.loadedFromModelAt ? { loadedFromModelAt: patch.loadedFromModelAt } : {}),
    ...(patch.loadedFromModelMode
      ? { loadedFromModelMode: patch.loadedFromModelMode }
      : {}),
    ...(patch.availableData ? patch.availableData : {}),
    lastPersistedAt: persistedAt,
  };

  return {
    ...payloadRecord,
    workflowState: nextState,
  };
}

function normalizeWorkflowState(value: unknown): WorkflowState {
  const record = asRecord(value);

  return {
    ...DEFAULT_AVAILABLE_DATA,
    currentStage: asString(record.currentStage) || 'new',
    currentStageLabel: asString(record.currentStageLabel) || 'Novo orçamento',
    lastPersistedAt: asNullableString(record.lastPersistedAt),
    originalTextCapturedAt: asNullableString(record.originalTextCapturedAt),
    firstInterpretationCompletedAt: asNullableString(record.firstInterpretationCompletedAt),
    proposalDraftGeneratedAt: asNullableString(record.proposalDraftGeneratedAt),
    proposalDraftEditedAt: asNullableString(record.proposalDraftEditedAt),
    reviewInstructionsUpdatedAt: asNullableString(record.reviewInstructionsUpdatedAt),
    reviewRequestedAt: asNullableString(record.reviewRequestedAt),
    reviewCompletedAt: asNullableString(record.reviewCompletedAt),
    reviewAcceptedAt: asNullableString(record.reviewAcceptedAt),
    reviewRejectedAt: asNullableString(record.reviewRejectedAt),
    finalSelectionsUpdatedAt: asNullableString(record.finalSelectionsUpdatedAt),
    confirmationCompletedAt: asNullableString(record.confirmationCompletedAt),
    loadedFromModelAt: asNullableString(record.loadedFromModelAt),
    loadedFromModelMode:
      record.loadedFromModelMode === 'use' || record.loadedFromModelMode === 'edit'
        ? record.loadedFromModelMode
        : null,
    hasOriginalText: asBoolean(record.hasOriginalText),
    hasInitialInterpretation: asBoolean(record.hasInitialInterpretation),
    hasProposalDraft: asBoolean(record.hasProposalDraft),
    hasReviewInstructions: asBoolean(record.hasReviewInstructions),
    hasReviewResult: asBoolean(record.hasReviewResult),
    hasExpandedMaterialCandidates: asBoolean(record.hasExpandedMaterialCandidates),
    hasCustomerCandidates: asBoolean(record.hasCustomerCandidates),
    hasFinalResolvedCustomer: asBoolean(record.hasFinalResolvedCustomer),
    hasFinalResolvedMaterials: asBoolean(record.hasFinalResolvedMaterials),
    hasConfirmation: asBoolean(record.hasConfirmation),
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

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}
