export interface AiBudgetSessionSummary {
  id: string;
  createdAt: string;
  updatedAt: string;
  originalText: string;
  summaryTitle?: string | null;
  customerQuery: string | null;
  confidence: 'alto' | 'medio' | 'baixo';
  status: string;
}

export interface AiBudgetSessionRecord extends AiBudgetSessionSummary {
  payload: unknown;
}

export interface AiBudgetSessionRepository {
  save(session: AiBudgetSessionRecord): Promise<void>;
  findById(id: string): Promise<AiBudgetSessionRecord | null>;
  listRecent(limit?: number): Promise<AiBudgetSessionSummary[]>;
  delete(id: string): Promise<boolean>;
}
