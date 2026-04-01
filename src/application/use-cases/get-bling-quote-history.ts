import type {
  BlingQuoteHistoryCache,
  CachedBlingQuoteHistory,
} from '../catalog/bling-quote-history-cache';
import type {
  BlingQuoteGateway,
  BlingQuoteSummary,
} from '../gateways/bling-quote-gateway';

interface GetBlingQuoteHistoryInput {
  now: Date;
  pageSize: number;
  forceRefresh?: boolean;
}

interface GetBlingQuoteHistoryDependencies {
  blingQuoteGateway: BlingQuoteGateway;
  quoteHistoryCache: BlingQuoteHistoryCache;
}

type GetBlingQuoteHistoryResult = {
  type: 'bling_quote_history_ready';
  history: {
    syncedAt: string;
    items: BlingQuoteSummary[];
    source: 'local_cache' | 'remote_refreshed';
  };
};

export async function getBlingQuoteHistory(
  input: GetBlingQuoteHistoryInput,
  dependencies: GetBlingQuoteHistoryDependencies,
): Promise<GetBlingQuoteHistoryResult> {
  const cachedHistory = await dependencies.quoteHistoryCache.read();

  if (
    cachedHistory &&
    !input.forceRefresh &&
    isSameDay(cachedHistory.syncedAt, input.now)
  ) {
    return {
      type: 'bling_quote_history_ready',
      history: {
        syncedAt: cachedHistory.syncedAt,
        items: cachedHistory.items,
        source: 'local_cache',
      },
    };
  }

  const items = await fetchAllQuotes({
    blingQuoteGateway: dependencies.blingQuoteGateway,
    pageSize: input.pageSize,
  });

  const refreshedHistory: CachedBlingQuoteHistory = {
    syncedAt: input.now.toISOString(),
    items,
  };

  await dependencies.quoteHistoryCache.write(refreshedHistory);

  return {
    type: 'bling_quote_history_ready',
    history: {
      syncedAt: refreshedHistory.syncedAt,
      items: refreshedHistory.items,
      source: 'remote_refreshed',
    },
  };
}

async function fetchAllQuotes(input: {
  blingQuoteGateway: BlingQuoteGateway;
  pageSize: number;
}): Promise<BlingQuoteSummary[]> {
  const items: BlingQuoteSummary[] = [];
  let page = 1;

  while (true) {
    const currentPage = await input.blingQuoteGateway.listQuotes({
      limit: input.pageSize,
      page,
    });

    items.push(...currentPage.items);

    if (currentPage.items.length < input.pageSize) {
      return items;
    }

    page += 1;
  }
}

function isSameDay(syncedAt: string, now: Date): boolean {
  const syncedDate = new Date(syncedAt);

  return (
    syncedDate.getUTCFullYear() === now.getUTCFullYear() &&
    syncedDate.getUTCMonth() === now.getUTCMonth() &&
    syncedDate.getUTCDate() === now.getUTCDate()
  );
}
