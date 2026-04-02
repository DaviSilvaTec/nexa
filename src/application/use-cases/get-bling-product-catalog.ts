import type {
  BlingProductCatalogCache,
  CachedBlingProductCatalog,
} from '../catalog/bling-product-catalog-cache';
import type {
  BlingProductGateway,
  BlingProductSummary,
} from '../gateways/bling-product-gateway';

interface GetBlingProductCatalogInput {
  now: Date;
  pageSize: number;
  forceRefresh?: boolean;
  pageDelayMs?: number;
}

interface GetBlingProductCatalogDependencies {
  blingProductGateway: BlingProductGateway;
  catalogCache: BlingProductCatalogCache;
  wait?: (delayMs: number) => Promise<void>;
}

type GetBlingProductCatalogResult = {
  type: 'bling_product_catalog_ready';
  catalog: {
    syncedAt: string;
    items: BlingProductSummary[];
    source: 'local_cache' | 'remote_refreshed';
  };
};

export async function getBlingProductCatalog(
  input: GetBlingProductCatalogInput,
  dependencies: GetBlingProductCatalogDependencies,
): Promise<GetBlingProductCatalogResult> {
  const cachedCatalog = await dependencies.catalogCache.read();

  if (
    cachedCatalog &&
    !input.forceRefresh &&
    isSameDay(cachedCatalog.syncedAt, input.now)
  ) {
    return {
      type: 'bling_product_catalog_ready',
      catalog: {
        syncedAt: cachedCatalog.syncedAt,
        items: cachedCatalog.items,
        source: 'local_cache',
      },
    };
  }

  const items = await fetchAllProducts({
    blingProductGateway: dependencies.blingProductGateway,
    pageSize: input.pageSize,
    pageDelayMs: input.pageDelayMs ?? 0,
    wait: dependencies.wait ?? defaultWait,
  });

  const refreshedCatalog: CachedBlingProductCatalog = {
    syncedAt: input.now.toISOString(),
    items,
  };

  await dependencies.catalogCache.write(refreshedCatalog);

  return {
    type: 'bling_product_catalog_ready',
    catalog: {
      syncedAt: refreshedCatalog.syncedAt,
      items: refreshedCatalog.items,
      source: 'remote_refreshed',
    },
  };
}

async function fetchAllProducts(input: {
  blingProductGateway: BlingProductGateway;
  pageSize: number;
  pageDelayMs: number;
  wait: (delayMs: number) => Promise<void>;
}): Promise<BlingProductSummary[]> {
  const items: BlingProductSummary[] = [];
  let page = 1;

  while (true) {
    const currentPage = await input.blingProductGateway.listProducts({
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
