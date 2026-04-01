import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createConversation,
  createDraftVersion,
  suspendConversation,
} from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemorySuspendedAnalysisRepository } from '../src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';

test('saves and retrieves a conversation by id', async () => {
  const repository = new InMemoryConversationRepository();
  const conversation = createConversation({
    id: 'conv-1',
    ownerChannelId: 'whatsapp:+5511999999999',
    startedAt: new Date('2026-03-29T12:00:00.000Z'),
  });

  await repository.save(conversation);
  const stored = await repository.findById('conv-1');

  assert.deepEqual(stored, conversation);
});

test('returns the active conversation for a channel', async () => {
  const repository = new InMemoryConversationRepository();

  const completedConversation = {
    ...createConversation({
      id: 'conv-completed',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-29T11:00:00.000Z'),
    }),
    status: 'completed' as const,
  };

  const activeConversation = createDraftVersion(
    createConversation({
      id: 'conv-active',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-29T12:00:00.000Z'),
    }),
    {
      structuredText: 'Troca de refletores.',
      createdAt: new Date('2026-03-29T12:01:00.000Z'),
    },
  );

  await repository.save(completedConversation);
  await repository.save(activeConversation);

  const stored = await repository.findActiveByChannelId(
    'whatsapp:+5511999999999',
  );

  assert.equal(stored?.id, 'conv-active');
});

test('stores and lists the five most recent open suspended analyses for a channel', async () => {
  const repository = new InMemorySuspendedAnalysisRepository();

  for (let index = 1; index <= 6; index += 1) {
    const conversation = suspendConversation(
      createDraftVersion(
        createConversation({
          id: `conv-${index}`,
          ownerChannelId: 'whatsapp:+5511999999999',
          startedAt: new Date(`2026-03-29T12:0${index}:00.000Z`),
        }),
        {
          structuredText: `Versao ${index}.`,
          createdAt: new Date(`2026-03-29T12:0${index}:30.000Z`),
        },
      ),
      {
        reason: 'timeout',
        suspendedAt: new Date(`2026-03-29T12:1${index}:00.000Z`),
      },
    );

    await repository.saveFromConversation(conversation);
  }

  const openAnalyses = await repository.listOpenByChannelId(
    'whatsapp:+5511999999999',
    5,
  );

  assert.equal(openAnalyses.length, 5);
  assert.deepEqual(
    openAnalyses.map((analysis) => analysis.conversationId),
    ['conv-6', 'conv-5', 'conv-4', 'conv-3', 'conv-2'],
  );
});

test('marks a suspended analysis as resumed', async () => {
  const repository = new InMemorySuspendedAnalysisRepository();

  const conversation = suspendConversation(
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

  await repository.saveFromConversation(conversation);
  await repository.markAsResumed(
    'conv-1:suspended',
    new Date('2026-03-29T12:20:00.000Z'),
  );

  const openAnalyses = await repository.listOpenByChannelId(
    'whatsapp:+5511999999999',
    5,
  );
  const stored = await repository.findById('conv-1:suspended');

  assert.equal(openAnalyses.length, 0);
  assert.equal(stored?.status, 'resumed');
  assert.equal(stored?.resumedAt?.toISOString(), '2026-03-29T12:20:00.000Z');
});
