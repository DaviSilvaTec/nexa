import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app/create-app';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemorySuspendedAnalysisRepository } from '../src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';
import { InMemoryBlingQuoteGateway } from '../src/infrastructure/integrations/bling/in-memory-bling-quote-gateway';
import type { BlingContactCatalogCache } from '../src/application/catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../src/application/catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../src/application/catalog/bling-service-note-history-cache';
import type { BlingProductGateway } from '../src/application/gateways/bling-product-gateway';

class FakeBlingProductGateway implements BlingProductGateway {
  async listProducts() {
    return { items: [], total: 0, appliedSearch: null };
  }
}

class InMemoryContactCatalogCache implements BlingContactCatalogCache {
  async read() {
    return {
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
    };
  }
  async write() {
    throw new Error('not used');
  }
}

class InMemoryProductCatalogCache implements BlingProductCatalogCache {
  async read() {
    return {
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
      ],
    };
  }
  async write() {
    throw new Error('not used');
  }
}

class InMemoryQuoteHistoryCache implements BlingQuoteHistoryCache {
  async read() {
    return { syncedAt: '2026-03-30T06:29:25.901Z', items: [] };
  }
  async write() {
    throw new Error('not used');
  }
}

class InMemoryServiceNoteHistoryCache implements BlingServiceNoteHistoryCache {
  async read() {
    return { syncedAt: '2026-03-30T06:34:40.209Z', items: [] };
  }
  async write() {
    throw new Error('not used');
  }
}

test('builds a local agent response through the HTTP API', async () => {
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    productCatalogCache: new InMemoryProductCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const response = await app.inject({
    method: 'POST',
    url: '/local/agent-response',
    payload: {
      originalText: 'Instalar cabo pp para cliente exemplo',
      customerQuery: 'cliente',
      materialQueries: ['cabo'],
    },
  });

  assert.equal(response.statusCode, 200);
  const json = response.json();
  assert.equal(json.type, 'local_agent_response_built');
  assert.equal(json.response.status, 'Aguardando aprovacao');
  assert.equal(json.response.financialSummary.saleTotal, 8.5);

  await app.close();
});
