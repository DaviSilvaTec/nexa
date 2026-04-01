import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BlingContactCatalogCache,
  CachedBlingContactCatalog,
} from '../src/application/catalog/bling-contact-catalog-cache';
import type { BlingContactGateway } from '../src/application/gateways/bling-contact-gateway';
import { getBlingContactCatalog } from '../src/application/use-cases/get-bling-contact-catalog';

class FakeBlingContactGateway implements BlingContactGateway {
  public listCalls: Array<{ page: number; limit: number }> = [];

  async listContacts(input: {
    limit: number;
    page?: number;
    search?: string;
    criterion?: number;
    documentNumber?: string;
    personType?: number;
  }) {
    this.listCalls.push({
      page: input.page ?? 1,
      limit: input.limit,
    });

    if ((input.page ?? 1) === 1) {
      return {
        items: [
          {
            id: '999',
            name: 'Cliente Exemplo Ltda',
            code: 'CLI001',
            status: 'A',
            documentNumber: '12345678000199',
            phone: '(16) 3000-0000',
            mobilePhone: '(16) 99999-0000',
          },
          {
            id: '1000',
            name: 'Outro Cliente',
            code: null,
            status: 'I',
            documentNumber: '98765432000188',
            phone: null,
            mobilePhone: '(16) 98888-1111',
          },
        ],
        total: 2,
      };
    }

    return {
      items: [],
      total: 0,
    };
  }
}

class InMemoryContactCatalogCache implements BlingContactCatalogCache {
  public stored: CachedBlingContactCatalog | null = null;

  async read(): Promise<CachedBlingContactCatalog | null> {
    return this.stored;
  }

  async write(catalog: CachedBlingContactCatalog): Promise<void> {
    this.stored = catalog;
  }
}

test('downloads and caches the contact catalog when cache is missing', async () => {
  const gateway = new FakeBlingContactGateway();
  const cache = new InMemoryContactCatalogCache();

  const result = await getBlingContactCatalog(
    {
      now: new Date('2026-03-30T10:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingContactGateway: gateway,
      contactCatalogCache: cache,
    },
  );

  assert.equal(result.type, 'bling_contact_catalog_ready');
  assert.equal(result.catalog.items.length, 2);
  assert.equal(result.catalog.source, 'remote_refreshed');
  assert.deepEqual(gateway.listCalls, [
    { page: 1, limit: 2 },
    { page: 2, limit: 2 },
  ]);
  assert.equal(cache.stored?.items.length, 2);
});

test('reuses the same-day contact catalog cache when available', async () => {
  const gateway = new FakeBlingContactGateway();
  const cache = new InMemoryContactCatalogCache();
  cache.stored = {
    syncedAt: '2026-03-30T08:00:00.000Z',
    items: [
      {
        id: '999',
        name: 'Cliente Exemplo Ltda',
        code: 'CLI001',
        status: 'A',
        documentNumber: '12345678000199',
        phone: '(16) 3000-0000',
        mobilePhone: '(16) 99999-0000',
      },
    ],
  };

  const result = await getBlingContactCatalog(
    {
      now: new Date('2026-03-30T18:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingContactGateway: gateway,
      contactCatalogCache: cache,
    },
  );

  assert.equal(result.catalog.source, 'local_cache');
  assert.equal(result.catalog.items.length, 1);
  assert.equal(gateway.listCalls.length, 0);
});

test('forces a refresh of the contact catalog even when same-day cache exists', async () => {
  const gateway = new FakeBlingContactGateway();
  const cache = new InMemoryContactCatalogCache();
  cache.stored = {
    syncedAt: '2026-03-30T08:00:00.000Z',
    items: [
      {
        id: '900',
        name: 'Cliente Antigo',
        code: 'OLD',
        status: 'A',
        documentNumber: '11111111111111',
        phone: null,
        mobilePhone: null,
      },
    ],
  };

  const result = await getBlingContactCatalog(
    {
      now: new Date('2026-03-30T18:00:00.000Z'),
      pageSize: 2,
      forceRefresh: true,
    },
    {
      blingContactGateway: gateway,
      contactCatalogCache: cache,
    },
  );

  assert.equal(result.catalog.source, 'remote_refreshed');
  assert.equal(result.catalog.items.length, 2);
  assert.equal(gateway.listCalls.length, 2);
});

test('waits between contact catalog pages when a page pacing delay is configured', async () => {
  const gateway = new FakeBlingContactGateway();
  const cache = new InMemoryContactCatalogCache();
  const waits: number[] = [];

  const result = await getBlingContactCatalog(
    {
      now: new Date('2026-03-30T18:00:00.000Z'),
      pageSize: 2,
      pageDelayMs: 400,
    },
    {
      blingContactGateway: gateway,
      contactCatalogCache: cache,
      wait: async (delayMs) => {
        waits.push(delayMs);
      },
    },
  );

  assert.equal(result.catalog.items.length, 2);
  assert.deepEqual(waits, [400]);
});
