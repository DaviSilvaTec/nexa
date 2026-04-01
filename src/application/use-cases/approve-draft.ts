import type { ConversationRepository } from '../../domain/conversation/conversation-repository';
import { approveDraftVersion } from '../../domain/conversation/conversation-machine';
import type { Conversation } from '../../domain/conversation/types';

interface ApproveDraftInput {
  channelId: string;
  conversationId: string;
  approvedAt: Date;
  versionNumber?: number;
}

interface ApproveDraftDependencies {
  conversationRepository: ConversationRepository;
}

type ApproveDraftResult = {
  type: 'draft_approved';
  conversation: Conversation;
};

export async function approveDraft(
  input: ApproveDraftInput,
  dependencies: ApproveDraftDependencies,
): Promise<ApproveDraftResult> {
  const conversation = await dependencies.conversationRepository.findById(
    input.conversationId,
  );

  if (!conversation) {
    throw new Error('Cannot approve a conversation that does not exist.');
  }

  const updatedConversation = approveDraftVersion(conversation, {
    channelId: input.channelId,
    decidedAt: input.approvedAt,
    ...(input.versionNumber !== undefined
      ? { versionNumber: input.versionNumber }
      : {}),
  });

  await dependencies.conversationRepository.save(updatedConversation);

  return {
    type: 'draft_approved',
    conversation: updatedConversation,
  };
}
