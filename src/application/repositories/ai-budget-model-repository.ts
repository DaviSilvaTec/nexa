export interface AiBudgetModelSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  customerQuery: string | null;
  sourceSessionId: string | null;
  previewText: string;
  blingQuoteId: string | null;
  blingQuoteNumber: string | null;
}

export interface AiBudgetModelRecord extends AiBudgetModelSummary {
  draftText: string;
  payload: unknown;
}

export interface AiBudgetModelRepository {
  save(model: AiBudgetModelRecord): Promise<void>;
  findById(id: string): Promise<AiBudgetModelRecord | null>;
  listRecent(limit?: number): Promise<AiBudgetModelSummary[]>;
  delete(id: string): Promise<boolean>;
}
