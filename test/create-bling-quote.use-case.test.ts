import test from 'node:test';
import assert from 'node:assert/strict';

import {
  approveDraftVersion,
  confirmFinalApproval,
  createConversation,
  createDraftVersion,
} from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemoryBlingQuoteGateway } from '../src/infrastructure/integrations/bling/in-memory-bling-quote-gateway';
import { createBlingQuote } from '../src/application/use-cases/create-bling-quote';

test('creates a quote in the bling gateway from a conversation ready for execution', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const blingQuoteGateway = new InMemoryBlingQuoteGateway();

  const conversation = confirmFinalApproval(
    approveDraftVersion(
      createDraftVersion(
        createConversation({
          id: 'conv-1',
          ownerChannelId: 'whatsapp:+5511999999999',
          startedAt: new Date('2026-03-30T18:00:00.000Z'),
        }),
        {
          structuredText: 'Instalacao de refletores e revisao de fiacao.',
          createdAt: new Date('2026-03-30T18:01:00.000Z'),
        },
      ),
      {
        channelId: 'whatsapp:+5511999999999',
        decidedAt: new Date('2026-03-30T18:05:00.000Z'),
      },
    ),
    {
      channelId: 'whatsapp:+5511999999999',
      decidedAt: new Date('2026-03-30T18:06:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const result = await createBlingQuote(
    {
      conversationId: 'conv-1',
      requestedAt: new Date('2026-03-30T18:07:00.000Z'),
    },
    {
      conversationRepository,
      blingQuoteGateway,
    },
  );

  assert.equal(result.type, 'bling_quote_created');
  if (result.type !== 'bling_quote_created') {
    assert.fail('Expected a bling_quote_created result.');
  }

  assert.equal(result.quote.id, 'bling-quote-1');
  assert.equal(result.quote.number, '1001');
  assert.equal(result.quote.sourceConversationId, 'conv-1');
  assert.equal(result.quote.description, 'Instalacao de refletores e revisao de fiacao.');
});

test('rejects quote creation when the conversation is not ready for bling execution', async () => {
  const conversationRepository = new InMemoryConversationRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T18:00:00.000Z'),
    }),
    {
      structuredText: 'Instalacao de refletores e revisao de fiacao.',
      createdAt: new Date('2026-03-30T18:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  await assert.rejects(
    () =>
      createBlingQuote(
        {
          conversationId: 'conv-1',
          requestedAt: new Date('2026-03-30T18:07:00.000Z'),
        },
        {
          conversationRepository,
          blingQuoteGateway: new InMemoryBlingQuoteGateway(),
        },
      ),
    /not ready for bling execution/i,
  );
});

test('rejects quote creation when the conversation does not exist', async () => {
  await assert.rejects(
    () =>
      createBlingQuote(
        {
          conversationId: 'missing',
          requestedAt: new Date('2026-03-30T18:07:00.000Z'),
        },
        {
          conversationRepository: new InMemoryConversationRepository(),
          blingQuoteGateway: new InMemoryBlingQuoteGateway(),
        },
      ),
    /does not exist/i,
  );
});
