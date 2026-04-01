import type {
  BlingContactCatalogCache,
  CachedBlingContactCatalog,
} from '../catalog/bling-contact-catalog-cache';
import type {
  BlingContactGateway,
  BlingContactSummary,
} from '../gateways/bling-contact-gateway';

interface GetBlingContactCatalogInput {
  now: Date;
  pageSize: number;
  forceRefresh?: boolean;
  pageDelayMs?: number;
}

interface GetBlingContactCatalogDependencies {
  blingContactGateway: BlingContactGateway;
  contactCatalogCache: BlingContactCatalogCache;
  wait?: (delayMs: number) => Promise<void>;
}

type GetBlingContactCatalogResult = {
  type: 'bling_contact_catalog_ready';
  catalog: {
    syncedAt: string;
    items: BlingContactSummary[];
    source: 'local_cache' | 'remote_refreshed';
  };
};

export async function getBlingContactCatalog(
  input: GetBlingContactCatalogInput,
  dependencies: GetBlingContactCatalogDependencies,
): Promise<GetBlingContactCatalogResult> {
  const cachedCatalog = await dependencies.contactCatalogCache.read();

  if (
    cachedCatalog &&
    !input.forceRefresh &&
    isSameDay(cachedCatalog.syncedAt, input.now)
  ) {
    return {
      type: 'bling_contact_catalog_ready',
      catalog: {
        syncedAt: cachedCatalog.syncedAt,
        items: cachedCatalog.items,
        source: 'local_cache',
      },
    };
  }

  const items = await fetchAllContacts({
    blingContactGateway: dependencies.blingContactGateway,
    pageSize: input.pageSize,
    pageDelayMs: input.pageDelayMs ?? 0,
    wait: dependencies.wait ?? defaultWait,
  });

  const refreshedCatalog: CachedBlingContactCatalog = {
    syncedAt: input.now.toISOString(),
    items,
  };

  await dependencies.contactCatalogCache.write(refreshedCatalog);

  return {
    type: 'bling_contact_catalog_ready',
    catalog: {
      syncedAt: refreshedCatalog.syncedAt,
      items: refreshedCatalog.items,
      source: 'remote_refreshed',
    },
  };
}

async function fetchAllContacts(input: {
  blingContactGateway: BlingContactGateway;
  pageSize: number;
  pageDelayMs: number;
  wait: (delayMs: number) => Promise<void>;
}): Promise<BlingContactSummary[]> {
  const items: BlingContactSummary[] = [];
  let page = 1;

  while (true) {
    const currentPage = await input.blingContactGateway.listContacts({
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
