import test from 'node:test';
import assert from 'node:assert/strict';

import {
  approveDraftVersion,
  createConversation,
  createDraftVersion,
} from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { confirmFinalApproval } from '../src/application/use-cases/confirm-final-approval';

test('confirms the final approval and moves the conversation to bling execution', async () => {
  const conversationRepository = new InMemoryConversationRepository();

  const conversation = approveDraftVersion(
    createDraftVersion(
      createConversation({
        id: 'conv-1',
        ownerChannelId: 'whatsapp:+5511999999999',
        startedAt: new Date('2026-03-30T17:00:00.000Z'),
      }),
      {
        structuredText: 'Versao inicial.',
        createdAt: new Date('2026-03-30T17:01:00.000Z'),
      },
    ),
    {
      channelId: 'whatsapp:+5511999999999',
      decidedAt: new Date('2026-03-30T17:05:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const result = await confirmFinalApproval(
    {
      channelId: 'whatsapp:+5511999999999',
      conversationId: 'conv-1',
      confirmedAt: new Date('2026-03-30T17:06:00.000Z'),
    },
    {
      conversationRepository,
    },
  );

  assert.equal(result.type, 'final_approval_confirmed');
  if (result.type !== 'final_approval_confirmed') {
    assert.fail('Expected a final_approval_confirmed result.');
  }

  assert.equal(result.conversation.status, 'executing_bling_creation');
  assert.equal(result.conversation.approvalContexts.length, 2);

  const storedConversation = await conversationRepository.findById('conv-1');
  assert.equal(storedConversation?.status, 'executing_bling_creation');
});

test('rejects final approval from a different channel', async () => {
  const conversationRepository = new InMemoryConversationRepository();

  const conversation = approveDraftVersion(
    createDraftVersion(
      createConversation({
        id: 'conv-1',
        ownerChannelId: 'whatsapp:+5511999999999',
        startedAt: new Date('2026-03-30T17:00:00.000Z'),
      }),
      {
        structuredText: 'Versao inicial.',
        createdAt: new Date('2026-03-30T17:01:00.000Z'),
      },
    ),
    {
      channelId: 'whatsapp:+5511999999999',
      decidedAt: new Date('2026-03-30T17:05:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  await assert.rejects(
    () =>
      confirmFinalApproval(
        {
          channelId: 'whatsapp:+5511888888888',
          conversationId: 'conv-1',
          confirmedAt: new Date('2026-03-30T17:06:00.000Z'),
        },
        {
          conversationRepository,
        },
      ),
    /owner channel/i,
  );
});

test('rejects final approval when the conversation does not exist', async () => {
  await assert.rejects(
    () =>
      confirmFinalApproval(
        {
          channelId: 'whatsapp:+5511999999999',
          conversationId: 'missing',
          confirmedAt: new Date('2026-03-30T17:06:00.000Z'),
        },
        {
          conversationRepository: new InMemoryConversationRepository(),
        },
      ),
    /does not exist/i,
  );
});
