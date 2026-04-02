import type {
  BlingServiceNoteHistoryCache,
  CachedBlingServiceNoteHistory,
} from '../catalog/bling-service-note-history-cache';
import type {
  BlingServiceNoteGateway,
  BlingServiceNoteSummary,
} from '../gateways/bling-service-note-gateway';

interface GetBlingServiceNoteHistoryInput {
  now: Date;
  pageSize: number;
  forceRefresh?: boolean;
  pageDelayMs?: number;
}

interface GetBlingServiceNoteHistoryDependencies {
  blingServiceNoteGateway: BlingServiceNoteGateway;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
  wait?: (delayMs: number) => Promise<void>;
}

type GetBlingServiceNoteHistoryResult = {
  type: 'bling_service_note_history_ready';
  history: {
    syncedAt: string;
    items: BlingServiceNoteSummary[];
    source: 'local_cache' | 'remote_refreshed';
  };
};

export async function getBlingServiceNoteHistory(
  input: GetBlingServiceNoteHistoryInput,
  dependencies: GetBlingServiceNoteHistoryDependencies,
): Promise<GetBlingServiceNoteHistoryResult> {
  const cachedHistory = await dependencies.serviceNoteHistoryCache.read();

  if (
    cachedHistory &&
    !input.forceRefresh &&
    isSameDay(cachedHistory.syncedAt, input.now)
  ) {
    return {
      type: 'bling_service_note_history_ready',
      history: {
        syncedAt: cachedHistory.syncedAt,
        items: cachedHistory.items,
        source: 'local_cache',
      },
    };
  }

  const items = await fetchAllServiceNotes({
    blingServiceNoteGateway: dependencies.blingServiceNoteGateway,
    pageSize: input.pageSize,
    pageDelayMs: input.pageDelayMs ?? 0,
    wait: dependencies.wait ?? defaultWait,
  });

  const refreshedHistory: CachedBlingServiceNoteHistory = {
    syncedAt: input.now.toISOString(),
    items,
  };

  await dependencies.serviceNoteHistoryCache.write(refreshedHistory);

  return {
    type: 'bling_service_note_history_ready',
    history: {
      syncedAt: refreshedHistory.syncedAt,
      items: refreshedHistory.items,
      source: 'remote_refreshed',
    },
  };
}

async function fetchAllServiceNotes(input: {
  blingServiceNoteGateway: BlingServiceNoteGateway;
  pageSize: number;
  pageDelayMs: number;
  wait: (delayMs: number) => Promise<void>;
}): Promise<BlingServiceNoteSummary[]> {
  const items: BlingServiceNoteSummary[] = [];
  let page = 1;

  while (true) {
    const currentPage = await input.blingServiceNoteGateway.listServiceNotes({
      limit: input.pageSize,
      page,
    });

    items.push(...currentPage.items);

    if (currentPage.items.length < input.pageSize) {
      return items;
    }

    if (input.pageDelayMs > 0) {
      await input.wait(input.pageDelayMs);
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

async function defaultWait(delayMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
