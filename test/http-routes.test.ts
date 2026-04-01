import test from 'node:test';
import assert from 'node:assert/strict';

import {
  approveDraftVersion,
  confirmFinalApproval,
  createConversation,
  createDraftVersion,
  suspendConversation,
} from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemoryBlingQuoteGateway } from '../src/infrastructure/integrations/bling/in-memory-bling-quote-gateway';
import { InMemorySuspendedAnalysisRepository } from '../src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';
import { createApp } from '../src/app/create-app';
import type { BlingProductGateway } from '../src/application/gateways/bling-product-gateway';
import type { BlingContactCatalogCache } from '../src/application/catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../src/application/catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../src/application/catalog/bling-service-note-history-cache';

class FakeBlingProductGateway implements BlingProductGateway {
  async listProducts(input: { search?: string; limit: number; page?: number }) {
    return {
      items: [
        {
          id: 'prod-1',
          name: 'Cabo PP 2x1,5mm',
          code: 'CABO215',
          price: 8.5,
          costPrice: 5.2,
          stockQuantity: 12,
          type: 'P',
          status: 'A',
        },
      ],
      total: 1,
      appliedSearch: input.search ?? null,
    };
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
    throw new Error('not used in this test');
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
    throw new Error('not used in this test');
  }
}

class InMemoryQuoteHistoryCache implements BlingQuoteHistoryCache {
  async read() {
    return {
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
    };
  }

  async write() {
    throw new Error('not used in this test');
  }
}

class InMemoryServiceNoteHistoryCache implements BlingServiceNoteHistoryCache {
  async read() {
    return {
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
    };
  }

  async write() {
    throw new Error('not used in this test');
  }
}

test('starts a conversation through the HTTP API', async () => {
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
  });

  const response = await app.inject({
    method: 'POST',
    url: '/messages',
    payload: {
      channelId: 'whatsapp:+5511999999999',
      text: 'trocar refletores e revisar fiacao',
      receivedAt: '2026-03-30T16:00:00.000Z',
    },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.json().type, 'conversation_started');
  assert.equal(response.json().conversation.status, 'collecting_input');

  await app.close();
});

test('edits a draft through the HTTP API', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T16:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-30T16:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository,
    suspendedAnalysisRepository,
  });

  const response = await app.inject({
    method: 'POST',
    url: '/drafts/conv-1/edit',
    payload: {
      channelId: 'whatsapp:+5511999999999',
      structuredText: 'Versao revisada.',
      editedAt: '2026-03-30T16:05:00.000Z',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().type, 'draft_edited');
  assert.equal(response.json().conversation.draft.currentVersionNumber, 2);

  await app.close();
});

test('approves a draft through the HTTP API', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T16:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-30T16:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository,
    suspendedAnalysisRepository,
  });

  const response = await app.inject({
    method: 'POST',
    url: '/drafts/conv-1/approve',
    payload: {
      channelId: 'whatsapp:+5511999999999',
      approvedAt: '2026-03-30T16:05:00.000Z',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().type, 'draft_approved');
  assert.equal(
    response.json().conversation.status,
    'awaiting_final_confirmation',
  );

  await app.close();
});

test('resumes a suspended analysis through the HTTP API', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const conversation = suspendConversation(
    createDraftVersion(
      createConversation({
        id: 'conv-1',
        ownerChannelId: 'whatsapp:+5511999999999',
        startedAt: new Date('2026-03-30T16:00:00.000Z'),
      }),
      {
        structuredText: 'Versao inicial.',
        createdAt: new Date('2026-03-30T16:01:00.000Z'),
      },
    ),
    {
      reason: 'timeout',
      suspendedAt: new Date('2026-03-30T16:12:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);
  await suspendedAnalysisRepository.saveFromConversation(conversation);

  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository,
    suspendedAnalysisRepository,
  });

  const response = await app.inject({
    method: 'POST',
    url: '/suspended-analyses/conv-1:suspended/resume',
    payload: {
      channelId: 'whatsapp:+5511999999999',
      resumedAt: '2026-03-30T16:20:00.000Z',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().type, 'suspended_analysis_resumed');
  assert.equal(response.json().conversation.status, 'collecting_input');

  await app.close();
});

test('confirms the final approval through the HTTP API', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const conversation = approveDraftVersion(
    createDraftVersion(
      createConversation({
        id: 'conv-1',
        ownerChannelId: 'whatsapp:+5511999999999',
        startedAt: new Date('2026-03-30T16:00:00.000Z'),
      }),
      {
        structuredText: 'Versao inicial.',
        createdAt: new Date('2026-03-30T16:01:00.000Z'),
      },
    ),
    {
      channelId: 'whatsapp:+5511999999999',
      decidedAt: new Date('2026-03-30T16:05:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository,
    suspendedAnalysisRepository,
  });

  const response = await app.inject({
    method: 'POST',
    url: '/conversations/conv-1/confirm-final-approval',
    payload: {
      channelId: 'whatsapp:+5511999999999',
      confirmedAt: '2026-03-30T16:06:00.000Z',
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().type, 'final_approval_confirmed');
  assert.equal(response.json().conversation.status, 'executing_bling_creation');

  await app.close();
});

test('creates a bling quote through the HTTP API', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();
  const blingQuoteGateway = new InMemoryBlingQuoteGateway();

  const conversation = confirmFinalApproval(
    approveDraftVersion(
      createDraftVersion(
        createConversation({
          id: 'conv-1',
          ownerChannelId: 'whatsapp:+5511999999999',
          startedAt: new Date('2026-03-30T16:00:00.000Z'),
        }),
        {
          structuredText: 'Versao inicial.',
          createdAt: new Date('2026-03-30T16:01:00.000Z'),
        },
      ),
      {
        channelId: 'whatsapp:+5511999999999',
        decidedAt: new Date('2026-03-30T16:05:00.000Z'),
      },
    ),
    {
      channelId: 'whatsapp:+5511999999999',
      decidedAt: new Date('2026-03-30T16:06:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository,
    suspendedAnalysisRepository,
    blingQuoteGateway,
  });

  const response = await app.inject({
    method: 'POST',
    url: '/conversations/conv-1/create-bling-quote',
    payload: {
      requestedAt: '2026-03-30T16:07:00.000Z',
    },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.json().type, 'bling_quote_created');
  assert.equal(response.json().quote.id, 'bling-quote-1');
  assert.equal(response.json().quote.sourceConversationId, 'conv-1');

  await app.close();
});

test('lists bling products through the HTTP API', async () => {
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
  });

  const response = await app.inject({
    method: 'GET',
    url: '/bling/products?search=cabos&limit=10',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().type, 'bling_products_listed');
  assert.equal(response.json().products.total, 1);
  assert.equal(response.json().products.appliedSearch, 'cabos');
  assert.equal(response.json().products.items[0].name, 'Cabo PP 2x1,5mm');

  await app.close();
});

test('searches local commercial history through the HTTP API', async () => {
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    contactCatalogCache: new InMemoryContactCatalogCache(),
    quoteHistoryCache: new InMemoryQuoteHistoryCache(),
    serviceNoteHistoryCache: new InMemoryServiceNoteHistoryCache(),
  });

  const response = await app.inject({
    method: 'GET',
    url: '/local/commercial-history/search?q=cliente&contactLimit=5&quoteLimitPerContact=2',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().type, 'local_commercial_history_found');
  assert.equal(response.json().matches.length, 1);
  assert.equal(response.json().matches[0].contact.id, '999');
  assert.equal(response.json().matches[0].quotes.length, 1);
  assert.equal(response.json().matches[0].serviceNotes.length, 1);
  assert.deepEqual(response.json().matches[0].summary, {
    quoteCount: 1,
    serviceNoteCount: 1,
    latestQuoteDate: '2026-03-20',
    latestServiceNoteDate: '2026-03-28',
  });

  await app.close();
});

test('searches local products through the HTTP API', async () => {
  const app = createApp({
    authorizedChannels: new Set(['whatsapp:+5511999999999']),
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingProductGateway: new FakeBlingProductGateway(),
    productCatalogCache: new InMemoryProductCatalogCache(),
  });

  const response = await app.inject({
    method: 'GET',
    url: '/local/products/search?q=cabo&limit=5',
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().type, 'local_product_catalog_searched');
  assert.equal(response.json().products.totalMatches, 1);
  assert.equal(response.json().products.items[0].name, 'Cabo PP 2x1,5mm');

  await app.close();
});

test('builds a local budget context through the HTTP API', async () => {
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
    url: '/local/budget-context',
    payload: {
      customerQuery: 'cliente',
      materialQueries: ['cabo'],
      materialLimitPerQuery: 3,
      quoteLimitPerContact: 2,
    },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().type, 'local_budget_context_built');
  assert.equal(response.json().customer.contact.id, '999');
  assert.equal(response.json().materials.length, 1);
  assert.equal(response.json().materials[0].matches[0].name, 'Cabo PP 2x1,5mm');

  await app.close();
});
