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
}

interface GetBlingServiceNoteHistoryDependencies {
  blingServiceNoteGateway: BlingServiceNoteGateway;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
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
