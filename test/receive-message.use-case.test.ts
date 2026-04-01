import test from 'node:test';
import assert from 'node:assert/strict';

import { createDraftVersion, createConversation, suspendConversation } from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemorySuspendedAnalysisRepository } from '../src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';
import { receiveMessage } from '../src/application/use-cases/receive-message';

test('creates a new conversation when an authorized channel sends the first message', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const result = await receiveMessage(
    {
      channelId: 'whatsapp:+5511999999999',
      text: 'trocar refletores e revisar fiacao',
      receivedAt: new Date('2026-03-29T12:00:00.000Z'),
    },
    {
      authorizedChannels: new Set(['whatsapp:+5511999999999']),
      conversationRepository,
      suspendedAnalysisRepository,
    },
  );

  assert.equal(result.type, 'conversation_started');
  if (result.type !== 'conversation_started') {
    assert.fail('Expected a conversation_started result.');
  }

  assert.equal(result.conversation.status, 'collecting_input');
  assert.equal(result.conversation.ownerChannelId, 'whatsapp:+5511999999999');
  assert.equal(result.suspendedAnalyses.length, 0);

  const stored = await conversationRepository.findById(result.conversation.id);
  assert.equal(stored?.id, result.conversation.id);
});

test('ignores messages from unauthorized channels', async () => {
  const result = await receiveMessage(
    {
      channelId: 'whatsapp:+5511888888888',
      text: 'trocar refletores e revisar fiacao',
      receivedAt: new Date('2026-03-29T12:00:00.000Z'),
    },
    {
      authorizedChannels: new Set(['whatsapp:+5511999999999']),
      conversationRepository: new InMemoryConversationRepository(),
      suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    },
  );

  assert.equal(result.type, 'ignored_unauthorized');
});

test('returns the active conversation when the channel already has one open', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-29T12:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-29T12:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const result = await receiveMessage(
    {
      channelId: 'whatsapp:+5511999999999',
      text: 'editar',
      receivedAt: new Date('2026-03-29T12:02:00.000Z'),
    },
    {
      authorizedChannels: new Set(['whatsapp:+5511999999999']),
      conversationRepository,
      suspendedAnalysisRepository,
    },
  );

  assert.equal(result.type, 'active_conversation_found');
  if (result.type !== 'active_conversation_found') {
    assert.fail('Expected an active_conversation_found result.');
  }

  assert.equal(result.conversation.id, 'conv-1');
});

test('lists open suspended analyses when no active conversation exists', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const suspendedConversation = suspendConversation(
    createDraftVersion(
      createConversation({
        id: 'conv-1',
        ownerChannelId: 'whatsapp:+5511999999999',
        startedAt: new Date('2026-03-29T12:00:00.000Z'),
      }),
      {
        structuredText: 'Versao inicial.',
        createdAt: new Date('2026-03-29T12:01:00.000Z'),
      },
    ),
    {
      reason: 'timeout',
      suspendedAt: new Date('2026-03-29T12:12:00.000Z'),
    },
  );

  await conversationRepository.save(suspendedConversation);
  await suspendedAnalysisRepository.saveFromConversation(suspendedConversation);

  const result = await receiveMessage(
    {
      channelId: 'whatsapp:+5511999999999',
      text: 'oi',
      receivedAt: new Date('2026-03-29T12:20:00.000Z'),
    },
    {
      authorizedChannels: new Set(['whatsapp:+5511999999999']),
      conversationRepository,
      suspendedAnalysisRepository,
    },
  );

  assert.equal(result.type, 'suspended_analyses_found');
  if (result.type !== 'suspended_analyses_found') {
    assert.fail('Expected a suspended_analyses_found result.');
  }

  assert.equal(result.suspendedAnalyses.length, 1);
  assert.equal(result.suspendedAnalyses[0]?.conversationId, 'conv-1');
});
