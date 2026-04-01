import {
  type ApprovalContext,
  type Conversation,
  type DraftVersion,
  type SuspendedReason,
} from './types';

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

interface CreateConversationParams {
  id: string;
  ownerChannelId: string;
  startedAt: Date;
}

interface CreateDraftVersionParams {
  structuredText: string;
  createdAt: Date;
}

interface ApproveDraftVersionParams {
  channelId: string;
  decidedAt: Date;
  versionNumber?: number;
}

interface FinalApprovalParams {
  channelId: string;
  decidedAt: Date;
}

interface ConflictResolutionParams {
  occurredAt: Date;
}

interface SuspendConversationParams {
  reason: SuspendedReason;
  suspendedAt: Date;
}

interface ResumeConversationParams {
  resumedAt: Date;
}

export function createConversation(
  params: CreateConversationParams,
): Conversation {
  return {
    id: params.id,
    ownerChannelId: params.ownerChannelId,
    status: 'collecting_input',
    startedAt: params.startedAt,
    lastInteractionAt: params.startedAt,
    draft: {
      id: `${params.id}:draft`,
      currentVersionNumber: 0,
      versions: [],
    },
    approvalContexts: [],
  };
}

export function createDraftVersion(
  conversation: Conversation,
  params: CreateDraftVersionParams,
): Conversation {
  const versionNumber = conversation.draft.currentVersionNumber + 1;
  const draftVersion: DraftVersion = {
    id: buildDraftVersionId(conversation.id, versionNumber),
    versionNumber,
    structuredText: params.structuredText,
    createdAt: params.createdAt,
  };

  return {
    ...conversation,
    status: 'awaiting_draft_decision',
    lastInteractionAt: params.createdAt,
    activeDraftVersionId: draftVersion.id,
    draft: {
      ...conversation.draft,
      currentVersionNumber: versionNumber,
      versions: [...conversation.draft.versions, draftVersion],
    },
  };
}

export function approveDraftVersion(
  conversation: Conversation,
  params: ApproveDraftVersionParams,
): Conversation {
  assertOwnerChannel(conversation, params.channelId);

  const draftVersion = getTargetDraftVersion(conversation, params.versionNumber);
  const approvalContext = buildApprovalContext({
    conversation,
    draftBudgetVersionId: draftVersion.id,
    approvalStage: 'draft_review',
    decidedAt: params.decidedAt,
    decidedByChannelId: params.channelId,
  });

  return {
    ...conversation,
    status: 'awaiting_final_confirmation',
    lastInteractionAt: params.decidedAt,
    approvedDraftVersionId: draftVersion.id,
    finalSummaryIssuedAt: params.decidedAt,
    approvalContexts: [...conversation.approvalContexts, approvalContext],
  };
}

export function confirmFinalApproval(
  conversation: Conversation,
  params: FinalApprovalParams,
): Conversation {
  assertOwnerChannel(conversation, params.channelId);

  if (!conversation.finalSummaryIssuedAt) {
    throw new Error('Cannot confirm final approval without final summary.');
  }

  const approvedDraftVersionId = conversation.approvedDraftVersionId;
  if (!approvedDraftVersionId) {
    throw new Error('Cannot confirm final approval without an approved draft version.');
  }

  const approvalContext = buildApprovalContext({
    conversation,
    draftBudgetVersionId: approvedDraftVersionId,
    approvalStage: 'final_execution',
    decidedAt: params.decidedAt,
    decidedByChannelId: params.channelId,
  });

  return {
    ...conversation,
    status: 'executing_bling_creation',
    lastInteractionAt: params.decidedAt,
    approvalContexts: [...conversation.approvalContexts, approvalContext],
  };
}

export function moveToConflictResolution(
  conversation: Conversation,
  params: ConflictResolutionParams,
): Conversation {
  return {
    ...conversation,
    status: 'awaiting_conflict_resolution',
    lastInteractionAt: params.occurredAt,
  };
}

export function hasTimedOut(
  conversation: Conversation,
  referenceTime: Date,
): boolean {
  return (
    referenceTime.getTime() - conversation.lastInteractionAt.getTime() >=
    TEN_MINUTES_IN_MS
  );
}

export function suspendConversation(
  conversation: Conversation,
  params: SuspendConversationParams,
): Conversation {
  const suspendedSnapshot = {
    conversationId: conversation.id,
    currentVersionNumber: conversation.draft.currentVersionNumber,
    ...(conversation.activeDraftVersionId
      ? { activeDraftVersionId: conversation.activeDraftVersionId }
      : {}),
  };

  return {
    ...conversation,
    status: 'suspended',
    lastInteractionAt: params.suspendedAt,
    suspendedAnalysis: {
      id: `${conversation.id}:suspended`,
      conversationId: conversation.id,
      ownerChannelId: conversation.ownerChannelId,
      ...(conversation.activeDraftVersionId
        ? { lastDraftVersionId: conversation.activeDraftVersionId }
        : {}),
      reason: params.reason,
      status: 'open',
      suspendedAt: params.suspendedAt,
      snapshot: suspendedSnapshot,
    },
  };
}

export function resumeConversation(
  conversation: Conversation,
  params: ResumeConversationParams,
): Conversation {
  if (conversation.status !== 'suspended') {
    throw new Error('Only suspended conversations can be resumed.');
  }

  return {
    ...conversation,
    status: 'collecting_input',
    lastInteractionAt: params.resumedAt,
  };
}

function getTargetDraftVersion(
  conversation: Conversation,
  versionNumber?: number,
): DraftVersion {
  const version =
    versionNumber === undefined
      ? conversation.draft.versions[conversation.draft.versions.length - 1]
      : conversation.draft.versions.find(
          (draftVersion) => draftVersion.versionNumber === versionNumber,
        );

  if (!version) {
    throw new Error('Cannot approve a draft version that does not exist.');
  }

  return version;
}

function assertOwnerChannel(
  conversation: Conversation,
  channelId: string,
): void {
  if (conversation.ownerChannelId !== channelId) {
    throw new Error('Approval is only allowed from the owner channel.');
  }
}

function buildApprovalContext(params: {
  conversation: Conversation;
  draftBudgetVersionId: string;
  approvalStage: ApprovalContext['approvalStage'];
  decidedAt: Date;
  decidedByChannelId: string;
}): ApprovalContext {
  const nextSequence = params.conversation.approvalContexts.length + 1;

  return {
    id: `${params.conversation.id}:approval:${nextSequence}`,
    draftBudgetVersionId: params.draftBudgetVersionId,
    approvalStage: params.approvalStage,
    status: 'approved',
    requestedAt: params.decidedAt,
    decidedAt: params.decidedAt,
    decidedByChannelId: params.decidedByChannelId,
  };
}

function buildDraftVersionId(
  conversationId: string,
  versionNumber: number,
): string {
  return `${conversationId}:draft:v${versionNumber}`;
}
