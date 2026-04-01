import type { ConversationRepository } from '../../domain/conversation/conversation-repository';
import { confirmFinalApproval as confirmConversationFinalApproval } from '../../domain/conversation/conversation-machine';
import type { Conversation } from '../../domain/conversation/types';

interface ConfirmFinalApprovalInput {
  channelId: string;
  conversationId: string;
  confirmedAt: Date;
}

interface ConfirmFinalApprovalDependencies {
  conversationRepository: ConversationRepository;
}

type ConfirmFinalApprovalResult = {
  type: 'final_approval_confirmed';
  conversation: Conversation;
};

export async function confirmFinalApproval(
  input: ConfirmFinalApprovalInput,
  dependencies: ConfirmFinalApprovalDependencies,
): Promise<ConfirmFinalApprovalResult> {
  const conversation = await dependencies.conversationRepository.findById(
    input.conversationId,
  );

  if (!conversation) {
    throw new Error('Cannot confirm final approval for a conversation that does not exist.');
  }

  const updatedConversation = confirmConversationFinalApproval(conversation, {
    channelId: input.channelId,
    decidedAt: input.confirmedAt,
  });

  await dependencies.conversationRepository.save(updatedConversation);

  return {
    type: 'final_approval_confirmed',
    conversation: updatedConversation,
  };
}
