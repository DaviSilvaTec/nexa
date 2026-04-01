import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
  AiBudgetSessionSummary,
} from '../../../application/repositories/ai-budget-session-repository';

interface FileSystemAiBudgetSessionRepositoryDependencies {
  filePath: string;
}

export class FileSystemAiBudgetSessionRepository
  implements AiBudgetSessionRepository
{
  private readonly filePath: string;

  constructor(
    dependencies: FileSystemAiBudgetSessionRepositoryDependencies,
  ) {
    this.filePath = dependencies.filePath;
  }

  async save(session: AiBudgetSessionRecord): Promise<void> {
    const sessions = await this.readAll();
    const existingIndex = sessions.findIndex((item) => item.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await this.writeAll(sessions);
  }

  async findById(id: string): Promise<AiBudgetSessionRecord | null> {
    const sessions = await this.readAll();
    return sessions.find((session) => session.id === id) ?? null;
  }

  async listRecent(limit = 20): Promise<AiBudgetSessionSummary[]> {
    const sessions = await this.readAll();

    return sessions
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
    const sessions = await this.readAll();
    const filteredSessions = sessions.filter((session) => session.id !== id);

    if (filteredSessions.length === sessions.length) {
      return false;
    }

    await this.writeAll(filteredSessions);
    return true;
  }

  private async readAll(): Promise<AiBudgetSessionRecord[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as AiBudgetSessionRecord[];
    } catch (error) {
      if (isFileNotFound(error)) {
        return [];
      }

      throw error;
    }
  }

  private async writeAll(sessions: AiBudgetSessionRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(sessions, null, 2), 'utf-8');
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

function isFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
