import type { SuspendedAnalysisRepository } from '../../../domain/conversation/conversation-repository';
import type {
  Conversation,
  SuspendedAnalysis,
} from '../../../domain/conversation/types';

export class InMemorySuspendedAnalysisRepository
  implements SuspendedAnalysisRepository
{
  private readonly analyses = new Map<string, SuspendedAnalysis>();

  async saveFromConversation(conversation: Conversation): Promise<void> {
    if (!conversation.suspendedAnalysis) {
      throw new Error(
        'Cannot persist suspended analysis from a conversation that is not suspended.',
      );
    }

    this.analyses.set(
      conversation.suspendedAnalysis.id,
      conversation.suspendedAnalysis,
    );
  }

  async findById(id: string): Promise<SuspendedAnalysis | null> {
    return this.analyses.get(id) ?? null;
  }

  async listOpenByChannelId(
    channelId: string,
    limit: number,
  ): Promise<SuspendedAnalysis[]> {
    return Array.from(this.analyses.values())
      .filter(
        (analysis) =>
          analysis.ownerChannelId === channelId && analysis.status === 'open',
      )
      .sort(
        (left, right) =>
          right.suspendedAt.getTime() - left.suspendedAt.getTime(),
      )
      .slice(0, limit);
  }

  async markAsResumed(id: string, resumedAt: Date): Promise<void> {
    const analysis = this.analyses.get(id);
    if (!analysis) {
      throw new Error('Cannot resume a suspended analysis that does not exist.');
    }

    this.analyses.set(id, {
      ...analysis,
      status: 'resumed',
      resumedAt,
    });
  }
}
