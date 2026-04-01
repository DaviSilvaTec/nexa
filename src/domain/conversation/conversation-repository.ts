import type { Conversation, SuspendedAnalysis } from './types';

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findActiveByChannelId(channelId: string): Promise<Conversation | null>;
}

export interface SuspendedAnalysisRepository {
  saveFromConversation(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<SuspendedAnalysis | null>;
  listOpenByChannelId(
    channelId: string,
    limit: number,
  ): Promise<SuspendedAnalysis[]>;
  markAsResumed(id: string, resumedAt: Date): Promise<void>;
}
