import type { BlingServiceNoteSummary } from '../gateways/bling-service-note-gateway';

export interface CachedBlingServiceNoteHistory {
  syncedAt: string;
  items: BlingServiceNoteSummary[];
}

export interface BlingServiceNoteHistoryCache {
  read(): Promise<CachedBlingServiceNoteHistory | null>;
  write(history: CachedBlingServiceNoteHistory): Promise<void>;
}
