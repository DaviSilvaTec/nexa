import type {
  ConversationRepository,
  SuspendedAnalysisRepository,
} from '../../domain/conversation/conversation-repository';
import { createConversation } from '../../domain/conversation/conversation-machine';
import type { Conversation, SuspendedAnalysis } from '../../domain/conversation/types';

interface ReceiveMessageInput {
  channelId: string;
  text: string;
  receivedAt: Date;
}

interface ReceiveMessageDependencies {
  authorizedChannels: Set<string>;
  conversationRepository: ConversationRepository;
  suspendedAnalysisRepository: SuspendedAnalysisRepository;
}

type ReceiveMessageResult =
  | { type: 'ignored_unauthorized' }
  | {
      type: 'conversation_started';
      conversation: Conversation;
      suspendedAnalyses: SuspendedAnalysis[];
    }
  | {
      type: 'active_conversation_found';
      conversation: Conversation;
    }
  | {
      type: 'suspended_analyses_found';
      suspendedAnalyses: SuspendedAnalysis[];
    };

export async function receiveMessage(
  input: ReceiveMessageInput,
  dependencies: ReceiveMessageDependencies,
): Promise<ReceiveMessageResult> {
  if (!dependencies.authorizedChannels.has(input.channelId)) {
    return { type: 'ignored_unauthorized' };
  }

  const activeConversation =
    await dependencies.conversationRepository.findActiveByChannelId(
      input.channelId,
    );

  if (activeConversation) {
    return {
      type: 'active_conversation_found',
      conversation: activeConversation,
    };
  }

  const suspendedAnalyses =
    await dependencies.suspendedAnalysisRepository.listOpenByChannelId(
      input.channelId,
      5,
    );

  if (suspendedAnalyses.length > 0) {
    return {
      type: 'suspended_analyses_found',
      suspendedAnalyses,
    };
  }

  const conversation = createConversation({
    id: buildConversationId(input.channelId, input.receivedAt),
    ownerChannelId: input.channelId,
    startedAt: input.receivedAt,
  });

  await dependencies.conversationRepository.save(conversation);

  return {
    type: 'conversation_started',
    conversation,
    suspendedAnalyses: [],
  };
}

function buildConversationId(channelId: string, receivedAt: Date): string {
  const normalizedChannel = channelId.replace(/[^a-zA-Z0-9]/g, '-');
  return `${normalizedChannel}-${receivedAt.getTime()}`;
}
