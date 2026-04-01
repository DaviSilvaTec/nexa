import type { ConversationRepository } from '../../domain/conversation/conversation-repository';
import { createDraftVersion } from '../../domain/conversation/conversation-machine';
import type { Conversation } from '../../domain/conversation/types';

interface EditDraftInput {
  channelId: string;
  conversationId: string;
  structuredText: string;
  editedAt: Date;
}

interface EditDraftDependencies {
  conversationRepository: ConversationRepository;
}

type EditDraftResult = {
  type: 'draft_edited';
  conversation: Conversation;
};

export async function editDraft(
  input: EditDraftInput,
  dependencies: EditDraftDependencies,
): Promise<EditDraftResult> {
  const conversation = await dependencies.conversationRepository.findById(
    input.conversationId,
  );

  if (!conversation) {
    throw new Error('Cannot edit a conversation that does not exist.');
  }

  if (conversation.ownerChannelId !== input.channelId) {
    throw new Error('Draft can only be edited from the owner channel.');
  }

  const updatedConversation = createDraftVersion(conversation, {
    structuredText: input.structuredText,
    createdAt: input.editedAt,
  });

  await dependencies.conversationRepository.save(updatedConversation);

  return {
    type: 'draft_edited',
    conversation: updatedConversation,
  };
}
