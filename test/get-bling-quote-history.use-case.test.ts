import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BlingQuoteHistoryCache,
  CachedBlingQuoteHistory,
} from '../src/application/catalog/bling-quote-history-cache';
import type { BlingQuoteGateway } from '../src/application/gateways/bling-quote-gateway';
import { getBlingQuoteHistory } from '../src/application/use-cases/get-bling-quote-history';

class FakeBlingQuoteGateway implements BlingQuoteGateway {
  public listCalls: Array<{ page: number; limit: number }> = [];

  async createQuote(payload: {
    sourceConversationId: string;
    description: string;
    requestedAt: Date;
  }) {
    return {
      id: 'ignored',
      number: 'ignored',
      sourceConversationId: payload.sourceConversationId,
      description: payload.description,
      createdAt: payload.requestedAt,
    };
  }

  async updateQuote(id: string, payload: {
    sourceConversationId: string;
    description: string;
    requestedAt: Date;
  }) {
    return {
      id,
      number: 'ignored',
      sourceConversationId: payload.sourceConversationId,
      description: payload.description,
      createdAt: payload.requestedAt,
    };
  }

  async listQuotes(input: {
    limit: number;
    page?: number;
    situation?: string;
    contactId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    this.listCalls.push({
      page: input.page ?? 1,
      limit: input.limit,
    });

    if ((input.page ?? 1) === 1) {
      return {
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
            date: '2026-03-21',
            status: 'Pendente',
            total: 980,
            productsTotal: 400,
            number: '88',
            contactId: '1000',
            storeId: '5',
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

class InMemoryQuoteHistoryCache implements BlingQuoteHistoryCache {
  public stored: CachedBlingQuoteHistory | null = null;

  async read(): Promise<CachedBlingQuoteHistory | null> {
    return this.stored;
  }

  async write(history: CachedBlingQuoteHistory): Promise<void> {
    this.stored = history;
  }
}

test('downloads and caches the commercial proposal history when cache is missing', async () => {
  const gateway = new FakeBlingQuoteGateway();
  const cache = new InMemoryQuoteHistoryCache();

  const result = await getBlingQuoteHistory(
    {
      now: new Date('2026-03-30T10:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingQuoteGateway: gateway,
      quoteHistoryCache: cache,
    },
  );

  assert.equal(result.type, 'bling_quote_history_ready');
  assert.equal(result.history.items.length, 2);
  assert.equal(result.history.source, 'remote_refreshed');
  assert.deepEqual(gateway.listCalls, [
    { page: 1, limit: 2 },
    { page: 2, limit: 2 },
  ]);
  assert.equal(cache.stored?.items.length, 2);
});

test('reuses the same-day commercial proposal history cache when available', async () => {
  const gateway = new FakeBlingQuoteGateway();
  const cache = new InMemoryQuoteHistoryCache();
  cache.stored = {
    syncedAt: '2026-03-30T08:00:00.000Z',
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
  };

  const result = await getBlingQuoteHistory(
    {
      now: new Date('2026-03-30T18:00:00.000Z'),
      pageSize: 2,
    },
    {
      blingQuoteGateway: gateway,
      quoteHistoryCache: cache,
    },
  );

  assert.equal(result.history.source, 'local_cache');
  assert.equal(result.history.items.length, 1);
  assert.equal(gateway.listCalls.length, 0);
});

test('forces a refresh of the commercial proposal history even when same-day cache exists', async () => {
  const gateway = new FakeBlingQuoteGateway();
  const cache = new InMemoryQuoteHistoryCache();
  cache.stored = {
    syncedAt: '2026-03-30T08:00:00.000Z',
    items: [
      {
        id: '90',
        date: '2026-03-18',
        status: 'Rascunho',
        total: 100,
        productsTotal: 50,
        number: '50',
        contactId: '900',
        storeId: '2',
      },
    ],
  };

  const result = await getBlingQuoteHistory(
    {
      now: new Date('2026-03-30T18:00:00.000Z'),
      pageSize: 2,
      forceRefresh: true,
    },
    {
      blingQuoteGateway: gateway,
      quoteHistoryCache: cache,
    },
  );

  assert.equal(result.history.source, 'remote_refreshed');
  assert.equal(result.history.items.length, 2);
  assert.equal(gateway.listCalls.length, 2);
});
