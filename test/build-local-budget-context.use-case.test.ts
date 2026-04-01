import test from 'node:test';
import assert from 'node:assert/strict';

import type { BlingContactCatalogCache } from '../src/application/catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../src/application/catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../src/application/catalog/bling-service-note-history-cache';
import { buildLocalBudgetContext } from '../src/application/use-cases/build-local-budget-context';

class InMemoryContactCatalogCache implements BlingContactCatalogCache {
  constructor(
    private readonly value: Awaited<ReturnType<BlingContactCatalogCache['read']>>,
  ) {}

  async read() {
    return this.value;
  }

  async write() {
    throw new Error('not needed in this test');
  }
}

class InMemoryProductCatalogCache implements BlingProductCatalogCache {
  constructor(
    private readonly value: Awaited<ReturnType<BlingProductCatalogCache['read']>>,
  ) {}

  async read() {
    return this.value;
  }

  async write() {
    throw new Error('not needed in this test');
  }
}

class InMemoryQuoteHistoryCache implements BlingQuoteHistoryCache {
  constructor(
    private readonly value: Awaited<ReturnType<BlingQuoteHistoryCache['read']>>,
  ) {}

  async read() {
    return this.value;
  }

  async write() {
    throw new Error('not needed in this test');
  }
}

class InMemoryServiceNoteHistoryCache implements BlingServiceNoteHistoryCache {
  constructor(
    private readonly value: Awaited<ReturnType<BlingServiceNoteHistoryCache['read']>>,
  ) {}

  async read() {
    return this.value;
  }

  async write() {
    throw new Error('not needed in this test');
  }
}

test('builds a local budget context with matched contact, history summary and suggested materials', async () => {
  const result = await buildLocalBudgetContext(
    {
      customerQuery: 'cliente exemplo',
      materialQueries: ['cabo pp', 'conector bnc'],
      materialLimitPerQuery: 2,
      quoteLimitPerContact: 2,
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache({
        syncedAt: '2026-03-30T07:05:17.281Z',
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
      }),
      quoteHistoryCache: new InMemoryQuoteHistoryCache({
        syncedAt: '2026-03-30T06:29:25.901Z',
        items: [
          {
            id: '101',
            date: '2026-03-20',
            status: 'Aprovado',
            total: 4200.5,
            productsTotal: 3100,
            number: '87',
            contactId: '999',
            storeId: '5',
          },
        ],
      }),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache({
        syncedAt: '2026-03-30T06:34:40.209Z',
        items: [
          {
            id: '501',
            number: '1',
            rpsNumber: '000001',
            series: '1',
            status: 1,
            issueDate: '2026-03-28',
            value: 1212,
            contactId: '999',
            contactName: 'Cliente Exemplo Ltda',
            contactDocument: '12345678000199',
            contactEmail: 'cliente@example.com',
            link: null,
            verificationCode: null,
          },
        ],
      }),
      productCatalogCache: new InMemoryProductCatalogCache({
        syncedAt: '2026-03-30T06:17:49.286Z',
        items: [
          {
            id: '1',
            name: 'Cabo PP 2x1,5mm',
            code: 'CABO215',
            price: 8.5,
            costPrice: 5.2,
            stockQuantity: 12,
            type: 'P',
            status: 'A',
          },
          {
            id: '2',
            name: 'Conector BNC',
            code: 'BNC1',
            price: 3,
            costPrice: 1.5,
            stockQuantity: 30,
            type: 'P',
            status: 'A',
          },
        ],
      }),
    },
  );

  assert.equal(result.type, 'local_budget_context_built');
  assert.equal(result.customer?.contact.id, '999');
  assert.equal(result.customer?.summary.quoteCount, 1);
  assert.equal(result.customer?.summary.serviceNoteCount, 1);
  assert.equal(result.materials.length, 2);
  assert.equal(result.materials[0]?.query, 'cabo pp');
  assert.equal(result.materials[0]?.matches[0]?.id, '1');
  assert.equal(result.materials[1]?.query, 'conector bnc');
  assert.equal(result.materials[1]?.matches[0]?.id, '2');
});

test('returns empty customer and material results when local caches are missing', async () => {
  const result = await buildLocalBudgetContext(
    {
      customerQuery: 'cliente inexistente',
      materialQueries: ['item inexistente'],
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache(null),
      quoteHistoryCache: new InMemoryQuoteHistoryCache(null),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(null),
      productCatalogCache: new InMemoryProductCatalogCache(null),
    },
  );

  assert.equal(result.customer, null);
  assert.equal(result.materials.length, 1);
  assert.equal(result.materials[0]?.matches.length, 0);
});
