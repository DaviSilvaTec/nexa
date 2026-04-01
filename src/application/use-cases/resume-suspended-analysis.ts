import type {
  ConversationRepository,
  SuspendedAnalysisRepository,
} from '../../domain/conversation/conversation-repository';
import { resumeConversation } from '../../domain/conversation/conversation-machine';
import type { Conversation } from '../../domain/conversation/types';

interface ResumeSuspendedAnalysisInput {
  channelId: string;
  suspendedAnalysisId: string;
  resumedAt: Date;
}

interface ResumeSuspendedAnalysisDependencies {
  conversationRepository: ConversationRepository;
  suspendedAnalysisRepository: SuspendedAnalysisRepository;
}

type ResumeSuspendedAnalysisResult = {
  type: 'suspended_analysis_resumed';
  conversation: Conversation;
};

export async function resumeSuspendedAnalysis(
  input: ResumeSuspendedAnalysisInput,
  dependencies: ResumeSuspendedAnalysisDependencies,
): Promise<ResumeSuspendedAnalysisResult> {
  const suspendedAnalysis =
    await dependencies.suspendedAnalysisRepository.findById(
      input.suspendedAnalysisId,
    );

  if (!suspendedAnalysis) {
    throw new Error('Cannot resume a suspended analysis that does not exist.');
  }

  if (suspendedAnalysis.ownerChannelId !== input.channelId) {
    throw new Error('Suspended analysis can only be resumed from the owner channel.');
  }

  const conversation = await dependencies.conversationRepository.findById(
    suspendedAnalysis.conversationId,
  );

  if (!conversation) {
    throw new Error('Cannot resume a conversation that does not exist.');
  }

  const resumedConversation = resumeConversation(conversation, {
    resumedAt: input.resumedAt,
  });

  await dependencies.conversationRepository.save(resumedConversation);
  await dependencies.suspendedAnalysisRepository.markAsResumed(
    input.suspendedAnalysisId,
    input.resumedAt,
  );

  return {
    type: 'suspended_analysis_resumed',
    conversation: resumedConversation,
  };
}
