import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createConversation,
  createDraftVersion,
} from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemorySuspendedAnalysisRepository } from '../src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';
import { suspendExpiredConversation } from '../src/application/use-cases/suspend-expired-conversation';

test('suspends an expired active conversation and persists its suspended snapshot', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T15:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-30T15:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const result = await suspendExpiredConversation(
    {
      conversationId: 'conv-1',
      checkedAt: new Date('2026-03-30T15:12:00.000Z'),
    },
    {
      conversationRepository,
      suspendedAnalysisRepository,
    },
  );

  assert.equal(result.type, 'conversation_suspended');
  if (result.type !== 'conversation_suspended') {
    assert.fail('Expected a conversation_suspended result.');
  }

  assert.equal(result.conversation.status, 'suspended');
  assert.equal(result.conversation.suspendedAnalysis?.status, 'open');

  const storedConversation = await conversationRepository.findById('conv-1');
  const storedAnalysis = await suspendedAnalysisRepository.findById('conv-1:suspended');

  assert.equal(storedConversation?.status, 'suspended');
  assert.equal(storedAnalysis?.conversationId, 'conv-1');
});

test('does not suspend a conversation that has not timed out yet', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T15:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-30T15:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const result = await suspendExpiredConversation(
    {
      conversationId: 'conv-1',
      checkedAt: new Date('2026-03-30T15:05:00.000Z'),
    },
    {
      conversationRepository,
      suspendedAnalysisRepository,
    },
  );

  assert.equal(result.type, 'conversation_still_active');

  const storedAnalysis = await suspendedAnalysisRepository.findById('conv-1:suspended');
  assert.equal(storedAnalysis, null);
});

test('rejects suspending a conversation that does not exist', async () => {
  await assert.rejects(
    () =>
      suspendExpiredConversation(
        {
          conversationId: 'missing',
          checkedAt: new Date('2026-03-30T15:12:00.000Z'),
        },
        {
          conversationRepository: new InMemoryConversationRepository(),
          suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
        },
      ),
    /does not exist/i,
  );
});
