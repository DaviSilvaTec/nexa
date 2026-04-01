import test from 'node:test';
import assert from 'node:assert/strict';

import type { BlingContactCatalogCache } from '../src/application/catalog/bling-contact-catalog-cache';
import type { BlingQuoteHistoryCache } from '../src/application/catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../src/application/catalog/bling-service-note-history-cache';
import { searchLocalCommercialHistory } from '../src/application/use-cases/search-local-commercial-history';

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

test('finds local contacts by partial name and returns their quotes sorted by newest date first', async () => {
  const result = await searchLocalCommercialHistory(
    {
      query: 'cliente exemplo',
      contactLimit: 5,
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
          {
            id: '102',
            date: '2026-03-25',
            status: 'Concluído',
            total: 5000,
            productsTotal: 3500,
            number: '90',
            contactId: '999',
            storeId: '5',
          },
          {
            id: '103',
            date: '2026-03-10',
            status: 'Pendente',
            total: 1200,
            productsTotal: 800,
            number: '80',
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
          {
            id: '502',
            number: '2',
            rpsNumber: '000002',
            series: '1',
            status: 3,
            issueDate: '2026-03-15',
            value: 800,
            contactId: '999',
            contactName: 'Cliente Exemplo Ltda',
            contactDocument: '12345678000199',
            contactEmail: 'cliente@example.com',
            link: null,
            verificationCode: null,
          },
        ],
      }),
    },
  );

  assert.equal(result.type, 'local_commercial_history_found');
  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0]?.contact.id, '999');
  assert.deepEqual(
    result.matches[0]?.quotes.map((quote: { id: string }) => quote.id),
    ['102', '101'],
  );
  assert.deepEqual(
    result.matches[0]?.serviceNotes.map((serviceNote: { id: string }) => serviceNote.id),
    ['501', '502'],
  );
  assert.deepEqual(result.matches[0]?.summary, {
    quoteCount: 2,
    serviceNoteCount: 2,
    latestQuoteDate: '2026-03-25',
    latestServiceNoteDate: '2026-03-28',
  });
});

test('finds local contacts by document number ignoring punctuation', async () => {
  const result = await searchLocalCommercialHistory(
    {
      query: '12.345.678/0001-99',
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
        items: [],
      }),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache({
        syncedAt: '2026-03-30T06:34:40.209Z',
        items: [],
      }),
    },
  );

  assert.equal(result.matches.length, 1);
  assert.equal(result.matches[0]?.contact.documentNumber, '12345678000199');
});

test('returns no matches when local caches are missing', async () => {
  const result = await searchLocalCommercialHistory(
    {
      query: 'cliente inexistente',
    },
    {
      contactCatalogCache: new InMemoryContactCatalogCache(null),
      quoteHistoryCache: new InMemoryQuoteHistoryCache(null),
      serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(null),
    },
  );

  assert.equal(result.matches.length, 0);
});
