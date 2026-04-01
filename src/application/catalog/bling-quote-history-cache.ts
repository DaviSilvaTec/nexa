import type { BlingQuoteSummary } from '../gateways/bling-quote-gateway';

export interface CachedBlingQuoteHistory {
  syncedAt: string;
  items: BlingQuoteSummary[];
}

export interface BlingQuoteHistoryCache {
  read(): Promise<CachedBlingQuoteHistory | null>;
  write(history: CachedBlingQuoteHistory): Promise<void>;
}
