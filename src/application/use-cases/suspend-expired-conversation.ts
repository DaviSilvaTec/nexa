import type {
  ConversationRepository,
  SuspendedAnalysisRepository,
} from '../../domain/conversation/conversation-repository';
import {
  hasTimedOut,
  suspendConversation,
} from '../../domain/conversation/conversation-machine';
import type { Conversation } from '../../domain/conversation/types';

interface SuspendExpiredConversationInput {
  conversationId: string;
  checkedAt: Date;
}

interface SuspendExpiredConversationDependencies {
  conversationRepository: ConversationRepository;
  suspendedAnalysisRepository: SuspendedAnalysisRepository;
}

type SuspendExpiredConversationResult =
  | {
      type: 'conversation_suspended';
      conversation: Conversation;
    }
  | {
      type: 'conversation_still_active';
      conversation: Conversation;
    };

export async function suspendExpiredConversation(
  input: SuspendExpiredConversationInput,
  dependencies: SuspendExpiredConversationDependencies,
): Promise<SuspendExpiredConversationResult> {
  const conversation = await dependencies.conversationRepository.findById(
    input.conversationId,
  );

  if (!conversation) {
    throw new Error('Cannot suspend a conversation that does not exist.');
  }

  if (!hasTimedOut(conversation, input.checkedAt)) {
    return {
      type: 'conversation_still_active',
      conversation,
    };
  }

  const suspended = suspendConversation(conversation, {
    reason: 'timeout',
    suspendedAt: input.checkedAt,
  });

  await dependencies.conversationRepository.save(suspended);
  await dependencies.suspendedAnalysisRepository.saveFromConversation(suspended);

  return {
    type: 'conversation_suspended',
    conversation: suspended,
  };
}
