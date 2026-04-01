import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createConversation,
  createDraftVersion,
} from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { approveDraft } from '../src/application/use-cases/approve-draft';

test('approves the active draft and moves the conversation to final confirmation', async () => {
  const conversationRepository = new InMemoryConversationRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T14:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-30T14:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const result = await approveDraft(
    {
      channelId: 'whatsapp:+5511999999999',
      conversationId: 'conv-1',
      approvedAt: new Date('2026-03-30T14:05:00.000Z'),
    },
    {
      conversationRepository,
    },
  );

  assert.equal(result.type, 'draft_approved');
  if (result.type !== 'draft_approved') {
    assert.fail('Expected a draft_approved result.');
  }

  assert.equal(result.conversation.status, 'awaiting_final_confirmation');
  assert.equal(
    result.conversation.approvedDraftVersionId,
    result.conversation.activeDraftVersionId,
  );
  assert.equal(result.conversation.approvalContexts.length, 1);

  const storedConversation = await conversationRepository.findById('conv-1');
  assert.equal(storedConversation?.status, 'awaiting_final_confirmation');
});

test('approves a specific draft version when requested explicitly', async () => {
  const conversationRepository = new InMemoryConversationRepository();

  const conversation = createDraftVersion(
    createDraftVersion(
      createConversation({
        id: 'conv-1',
        ownerChannelId: 'whatsapp:+5511999999999',
        startedAt: new Date('2026-03-30T14:00:00.000Z'),
      }),
      {
        structuredText: 'Versao inicial.',
        createdAt: new Date('2026-03-30T14:01:00.000Z'),
      },
    ),
    {
      structuredText: 'Versao revisada.',
      createdAt: new Date('2026-03-30T14:03:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const result = await approveDraft(
    {
      channelId: 'whatsapp:+5511999999999',
      conversationId: 'conv-1',
      versionNumber: 1,
      approvedAt: new Date('2026-03-30T14:05:00.000Z'),
    },
    {
      conversationRepository,
    },
  );

  assert.equal(result.type, 'draft_approved');
  if (result.type !== 'draft_approved') {
    assert.fail('Expected a draft_approved result.');
  }

  assert.equal(result.conversation.approvedDraftVersionId, 'conv-1:draft:v1');
});

test('rejects approval from a different channel', async () => {
  const conversationRepository = new InMemoryConversationRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T14:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-30T14:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  await assert.rejects(
    () =>
      approveDraft(
        {
          channelId: 'whatsapp:+5511888888888',
          conversationId: 'conv-1',
          approvedAt: new Date('2026-03-30T14:05:00.000Z'),
        },
        {
          conversationRepository,
        },
      ),
    /owner channel/i,
  );
});
