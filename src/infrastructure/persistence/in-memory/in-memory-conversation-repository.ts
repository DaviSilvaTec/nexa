import type { ConversationRepository } from '../../../domain/conversation/conversation-repository';
import type { Conversation } from '../../../domain/conversation/types';

const NON_ACTIVE_STATUSES = new Set([
  'completed',
  'cancelled',
  'failed',
  'suspended',
]);

export class InMemoryConversationRepository implements ConversationRepository {
  private readonly conversations = new Map<string, Conversation>();

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, conversation);
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) ?? null;
  }

  async findActiveByChannelId(channelId: string): Promise<Conversation | null> {
    const activeConversations = Array.from(this.conversations.values())
      .filter(
        (conversation) =>
          conversation.ownerChannelId === channelId &&
          !NON_ACTIVE_STATUSES.has(conversation.status),
      )
      .sort(
        (left, right) =>
          right.lastInteractionAt.getTime() - left.lastInteractionAt.getTime(),
      );

    return activeConversations[0] ?? null;
  }
}
