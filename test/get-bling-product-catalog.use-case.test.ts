import test from 'node:test';
import assert from 'node:assert/strict';

import { getBlingProductCatalog } from '../src/application/use-cases/get-bling-product-catalog';
import type {
  BlingProductCatalogCache,
  CachedBlingProductCatalog,
} from '../src/application/catalog/bling-product-catalog-cache';
import type { BlingProductGateway } from '../src/application/gateways/bling-product-gateway';

class FakeBlingProductGateway implements BlingProductGateway {
  public calls: Array<{ page: number; limit: number }> = [];

  async listProducts(input: {
    search?: string;
    limit: number;
    page?: number;
  }) {
    this.calls.push({
      page: input.page ?? 1,
      limit: input.limit,
    });

    if ((input.page ?? 1) === 1) {
      return {
        items: [
          { id: 'prod-1', name: 'Cabo PP 2x1,5mm', code: 'CABO215', price: 8.5, costPrice: 5.2, stockQuantity: 12, type: 'P', status: 'A' },
          { id: 'prod-2', name: 'Cabo PP 2x2,5mm', code: 'CABO225', price: 12, costPrice: 7.6, stockQuantity: 7, type: 'P', status: 'A' },
        ],
        total: 4,
        appliedSearch: null,
      };
    }

    if ((input.page ?? 1) === 2) {
      return {
        items: [
          { id: 'prod-3', name: 'Cabo Flex 1,5mm', code: 'FLEX15', price: 4.8, costPrice: 3.1, stockQuantity: 15, type: 'P', status: 'A' },
          { id: 'prod-4', name: 'Cabo Flex 2,5mm', code: 'FLEX25', price: 6.7, costPrice: 4.4, stockQuantity: 9, type: 'P', status: 'A' },
        ],
        total: 4,
        appliedSearch: null,
      };
    }

    return {
      items: [],
      total: 0,
      appliedSearch: null,
    };
  }
}

class InMemoryCatalogCache implements BlingProductCatalogCache {
  public stored: CachedBlingProductCatalog | null = null;

  async read(): Promise<CachedBlingProductCatalog | null> {
    return this.stored;
  }

  async write(catalog: CachedBlingProductCatalog): Promise<void> {
    this.stored = catalog;
  }
}

test('downloads and caches the full product catalog when cache is missing', async () => {
  const gateway = new FakeBlingProductGateway();
  const cache = new InMemoryCatalogCache();

  const result = await getBlingProductCatalog(
    {
      now: new Date('2026-03-30T09:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingProductGateway: gateway,
      catalogCache: cache,
    },
  );

  assert.equal(result.type, 'bling_product_catalog_ready');
  assert.equal(result.catalog.items.length, 4);
  assert.equal(result.catalog.source, 'remote_refreshed');
  assert.deepEqual(gateway.calls, [
    { page: 1, limit: 2 },
    { page: 2, limit: 2 },
    { page: 3, limit: 2 },
  ]);
  assert.equal(cache.stored?.items.length, 4);
});

test('keeps fetching pages until the last page returns fewer items than the page size', async () => {
  class MissingTotalBlingProductGateway implements BlingProductGateway {
    public calls: Array<{ page: number; limit: number }> = [];

    async listProducts(input: {
      search?: string;
      limit: number;
      page?: number;
    }) {
      const page = input.page ?? 1;

      this.calls.push({
        page,
        limit: input.limit,
      });

      if (page === 1) {
        return {
          items: [
            { id: 'prod-1', name: 'Cabo PP 2x1,5mm', code: 'CABO215', price: 8.5, costPrice: 5.2, stockQuantity: 12, type: 'P', status: 'A' },
            { id: 'prod-2', name: 'Cabo PP 2x2,5mm', code: 'CABO225', price: 12, costPrice: 7.6, stockQuantity: 7, type: 'P', status: 'A' },
          ],
          total: 2,
          appliedSearch: null,
        };
      }

      if (page === 2) {
        return {
          items: [
            { id: 'prod-3', name: 'Cabo Flex 1,5mm', code: 'FLEX15', price: 4.8, costPrice: 3.1, stockQuantity: 15, type: 'P', status: 'A' },
            { id: 'prod-4', name: 'Cabo Flex 2,5mm', code: 'FLEX25', price: 6.7, costPrice: 4.4, stockQuantity: 9, type: 'P', status: 'A' },
          ],
          total: 2,
          appliedSearch: null,
        };
      }

      return {
        items: [
          { id: 'prod-5', name: 'Cabo de rede cat5e', code: 'CAT5E', price: 3.9, costPrice: 2.4, stockQuantity: 20, type: 'P', status: 'A' },
        ],
        total: 1,
        appliedSearch: null,
      };
    }
  }

  const gateway = new MissingTotalBlingProductGateway();
  const cache = new InMemoryCatalogCache();

  const result = await getBlingProductCatalog(
    {
      now: new Date('2026-03-30T10:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingProductGateway: gateway,
      catalogCache: cache,
    },
  );

  assert.equal(result.catalog.items.length, 5);
  assert.deepEqual(gateway.calls, [
    { page: 1, limit: 2 },
    { page: 2, limit: 2 },
    { page: 3, limit: 2 },
  ]);
});

test('reuses the same-day cache when available', async () => {
  const gateway = new FakeBlingProductGateway();
  const cache = new InMemoryCatalogCache();
  cache.stored = {
    syncedAt: '2026-03-30T08:00:00.000Z',
    items: [{ id: 'prod-1', name: 'Cabo PP 2x1,5mm', code: 'CABO215', price: 8.5, costPrice: 5.2, stockQuantity: 12, type: 'P', status: 'A' }],
  };

  const result = await getBlingProductCatalog(
    {
      now: new Date('2026-03-30T17:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingProductGateway: gateway,
      catalogCache: cache,
    },
  );

  assert.equal(result.catalog.source, 'local_cache');
  assert.equal(result.catalog.items.length, 1);
  assert.equal(gateway.calls.length, 0);
});

test('forces a refresh even when same-day cache exists', async () => {
  const gateway = new FakeBlingProductGateway();
  const cache = new InMemoryCatalogCache();
  cache.stored = {
    syncedAt: '2026-03-30T08:00:00.000Z',
    items: [{ id: 'prod-1', name: 'Cabo antigo', code: 'OLD', price: 1, costPrice: 1, stockQuantity: 0, type: 'P', status: 'A' }],
  };

  const result = await getBlingProductCatalog(
    {
      now: new Date('2026-03-30T17:00:00.000Z'),
      pageSize: 2,
      forceRefresh: true,
    },
    {
      blingProductGateway: gateway,
      catalogCache: cache,
    },
  );

  assert.equal(result.catalog.source, 'remote_refreshed');
  assert.equal(result.catalog.items.length, 4);
  assert.equal(gateway.calls.length, 3);
});
