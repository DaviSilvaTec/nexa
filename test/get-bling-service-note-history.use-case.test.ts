import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BlingServiceNoteHistoryCache,
  CachedBlingServiceNoteHistory,
} from '../src/application/catalog/bling-service-note-history-cache';
import type { BlingServiceNoteGateway } from '../src/application/gateways/bling-service-note-gateway';
import { getBlingServiceNoteHistory } from '../src/application/use-cases/get-bling-service-note-history';

class FakeBlingServiceNoteGateway implements BlingServiceNoteGateway {
  public listCalls: Array<{ page: number; limit: number }> = [];

  async listServiceNotes(input: {
    limit: number;
    page?: number;
    situation?: number;
    issueDateFrom?: string;
    issueDateTo?: string;
  }) {
    this.listCalls.push({
      page: input.page ?? 1,
      limit: input.limit,
    });

    if ((input.page ?? 1) === 1) {
      return {
        items: [
          {
            id: '501',
            number: '123',
            rpsNumber: '32',
            series: '1',
            status: 1,
            issueDate: '2026-03-10',
            value: 1800,
            contactId: '999',
            contactName: 'Cliente Exemplo',
            contactDocument: '12345678000199',
            contactEmail: 'cliente@example.com',
            link: 'https://bling.example/nfse/501',
            verificationCode: 'ABC123',
          },
          {
            id: '502',
            number: '124',
            rpsNumber: '33',
            series: '1',
            status: 3,
            issueDate: '2026-03-11',
            value: 950,
            contactId: '1000',
            contactName: 'Outro Cliente',
            contactDocument: '98765432000188',
            contactEmail: 'outro@example.com',
            link: null,
            verificationCode: null,
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

class InMemoryServiceNoteHistoryCache implements BlingServiceNoteHistoryCache {
  public stored: CachedBlingServiceNoteHistory | null = null;

  async read(): Promise<CachedBlingServiceNoteHistory | null> {
    return this.stored;
  }

  async write(history: CachedBlingServiceNoteHistory): Promise<void> {
    this.stored = history;
  }
}

test('downloads and caches the service note history when cache is missing', async () => {
  const gateway = new FakeBlingServiceNoteGateway();
  const cache = new InMemoryServiceNoteHistoryCache();

  const result = await getBlingServiceNoteHistory(
    {
      now: new Date('2026-03-30T10:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingServiceNoteGateway: gateway,
      serviceNoteHistoryCache: cache,
    },
  );

  assert.equal(result.type, 'bling_service_note_history_ready');
  assert.equal(result.history.items.length, 2);
  assert.equal(result.history.source, 'remote_refreshed');
  assert.deepEqual(gateway.listCalls, [
    { page: 1, limit: 2 },
    { page: 2, limit: 2 },
  ]);
  assert.equal(cache.stored?.items.length, 2);
});

test('reuses the same-day service note history cache when available', async () => {
  const gateway = new FakeBlingServiceNoteGateway();
  const cache = new InMemoryServiceNoteHistoryCache();
  cache.stored = {
    syncedAt: '2026-03-30T08:00:00.000Z',
    items: [
      {
        id: '501',
        number: '123',
        rpsNumber: '32',
        series: '1',
        status: 1,
        issueDate: '2026-03-10',
        value: 1800,
        contactId: '999',
        contactName: 'Cliente Exemplo',
        contactDocument: '12345678000199',
        contactEmail: 'cliente@example.com',
        link: 'https://bling.example/nfse/501',
        verificationCode: 'ABC123',
      },
    ],
  };

  const result = await getBlingServiceNoteHistory(
    {
      now: new Date('2026-03-30T18:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingServiceNoteGateway: gateway,
      serviceNoteHistoryCache: cache,
    },
  );

  assert.equal(result.history.source, 'local_cache');
  assert.equal(result.history.items.length, 1);
  assert.equal(gateway.listCalls.length, 0);
});

test('forces a refresh of the service note history even when same-day cache exists', async () => {
  const gateway = new FakeBlingServiceNoteGateway();
  const cache = new InMemoryServiceNoteHistoryCache();
  cache.stored = {
    syncedAt: '2026-03-30T08:00:00.000Z',
    items: [
      {
        id: '490',
        number: '90',
        rpsNumber: '20',
        series: '1',
        status: 0,
        issueDate: '2026-03-08',
        value: 100,
        contactId: '900',
        contactName: 'Cliente Antigo',
        contactDocument: '11111111111111',
        contactEmail: 'antigo@example.com',
        link: null,
        verificationCode: null,
      },
    ],
  };

  const result = await getBlingServiceNoteHistory(
    {
      now: new Date('2026-03-30T18:00:00.000Z'),
      pageSize: 2,
      forceRefresh: true,
    },
    {
      blingServiceNoteGateway: gateway,
      serviceNoteHistoryCache: cache,
    },
  );

  assert.equal(result.history.source, 'remote_refreshed');
  assert.equal(result.history.items.length, 2);
  assert.equal(gateway.listCalls.length, 2);
});
