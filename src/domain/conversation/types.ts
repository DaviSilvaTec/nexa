export type ConversationStatus =
  | 'collecting_input'
  | 'draft_ready'
  | 'awaiting_draft_decision'
  | 'awaiting_conflict_resolution'
  | 'awaiting_final_confirmation'
  | 'executing_bling_creation'
  | 'suspended'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type ApprovalStage = 'draft_review' | 'final_execution';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'edited'
  | 'cancelled'
  | 'expired'
  | 'rejected';

export type SuspendedReason = 'timeout' | 'user_choice' | 'execution_error';

export interface DraftVersion {
  id: string;
  versionNumber: number;
  structuredText: string;
  createdAt: Date;
}

export interface DraftBudget {
  id: string;
  currentVersionNumber: number;
  versions: DraftVersion[];
}

export interface ApprovalContext {
  id: string;
  draftBudgetVersionId: string;
  approvalStage: ApprovalStage;
  status: ApprovalStatus;
  requestedAt: Date;
  decidedAt: Date;
  decidedByChannelId: string;
}

export interface SuspendedAnalysis {
  id: string;
  conversationId: string;
  ownerChannelId: string;
  lastDraftVersionId?: string;
  reason: SuspendedReason;
  status: 'open' | 'resumed' | 'closed';
  suspendedAt: Date;
  resumedAt?: Date;
  snapshot: {
    conversationId: string;
    activeDraftVersionId?: string;
    currentVersionNumber: number;
  };
}

export interface Conversation {
  id: string;
  ownerChannelId: string;
  status: ConversationStatus;
  startedAt: Date;
  lastInteractionAt: Date;
  draft: DraftBudget;
  activeDraftVersionId?: string;
  approvedDraftVersionId?: string;
  approvalContexts: ApprovalContext[];
  finalSummaryIssuedAt?: Date;
  suspendedAnalysis?: SuspendedAnalysis;
}
