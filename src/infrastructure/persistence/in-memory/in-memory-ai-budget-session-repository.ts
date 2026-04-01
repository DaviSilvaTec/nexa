import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
  AiBudgetSessionSummary,
} from '../../../application/repositories/ai-budget-session-repository';

export class InMemoryAiBudgetSessionRepository
  implements AiBudgetSessionRepository
{
  private readonly sessions = new Map<string, AiBudgetSessionRecord>();

  async save(session: AiBudgetSessionRecord): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async findById(id: string): Promise<AiBudgetSessionRecord | null> {
    return this.sessions.get(id) ?? null;
  }

  async listRecent(limit = 20): Promise<AiBudgetSessionSummary[]> {
    return [...this.sessions.values()]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit)
      .map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        originalText: session.originalText,
        summaryTitle: extractSummaryTitle(session),
        customerQuery: session.customerQuery,
        confidence: session.confidence,
        status: session.status,
      }));
  }

  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }
}

function extractSummaryTitle(session: AiBudgetSessionRecord): string | null {
  const payload =
    session.payload && typeof session.payload === 'object'
      ? (session.payload as Record<string, unknown>)
      : null;
  const aiResponse =
    payload?.aiResponse && typeof payload.aiResponse === 'object'
      ? (payload.aiResponse as Record<string, unknown>)
      : null;
  const interpretation =
    aiResponse?.interpretation && typeof aiResponse.interpretation === 'object'
      ? (aiResponse.interpretation as Record<string, unknown>)
      : null;
  const summaryTitle = interpretation?.summaryTitle;

  return typeof summaryTitle === 'string' && summaryTitle.trim().length > 0
    ? summaryTitle.trim()
    : null;
}
