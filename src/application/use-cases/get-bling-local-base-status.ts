import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../catalog/bling-service-note-history-cache';

interface GetBlingLocalBaseStatusInput {
  now: Date;
}

interface GetBlingLocalBaseStatusDependencies {
  contactCatalogCache: BlingContactCatalogCache;
  productCatalogCache: BlingProductCatalogCache;
  quoteHistoryCache: BlingQuoteHistoryCache;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
}

type CacheSnapshot = {
  syncedAt: string | null;
  isStale: boolean;
  itemCount: number;
};

export async function getBlingLocalBaseStatus(
  input: GetBlingLocalBaseStatusInput,
  dependencies: GetBlingLocalBaseStatusDependencies,
) {
  const [products, contacts, quotes, serviceNotes] = await Promise.all([
    dependencies.productCatalogCache.read(),
    dependencies.contactCatalogCache.read(),
    dependencies.quoteHistoryCache.read(),
    dependencies.serviceNoteHistoryCache.read(),
  ]);

  const snapshots = {
    products: toSnapshot(products, input.now),
    contacts: toSnapshot(contacts, input.now),
    quotes: toSnapshot(quotes, input.now),
    serviceNotes: toSnapshot(serviceNotes, input.now),
  };
  const values = Object.values(snapshots);
  const allAvailable = values.every((snapshot) => snapshot.syncedAt);
  const allFresh = values.every((snapshot) => !snapshot.isStale);

  return {
    type: 'bling_local_base_status_loaded' as const,
    syncStatus: {
      status: allAvailable ? (allFresh ? 'fresh' : 'stale') : 'missing',
      checkedAt: input.now.toISOString(),
      ...snapshots,
    },
  };
}

function toSnapshot(
  cache:
    | {
        syncedAt: string;
        items: unknown[];
      }
    | null,
  now: Date,
): CacheSnapshot {
  if (!cache) {
    return {
      syncedAt: null,
      isStale: true,
      itemCount: 0,
    };
  }

  return {
    syncedAt: cache.syncedAt,
    isStale: !isSameDay(cache.syncedAt, now),
    itemCount: Array.isArray(cache.items) ? cache.items.length : 0,
  };
}

function isSameDay(syncedAt: string, now: Date): boolean {
  const syncedDate = new Date(syncedAt);

  return (
    syncedDate.getUTCFullYear() === now.getUTCFullYear() &&
    syncedDate.getUTCMonth() === now.getUTCMonth() &&
    syncedDate.getUTCDate() === now.getUTCDate()
  );
}
