import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createConversation,
  createDraftVersion,
} from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { editDraft } from '../src/application/use-cases/edit-draft';

test('creates a new draft version when editing an active conversation', async () => {
  const conversationRepository = new InMemoryConversationRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T13:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-30T13:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  const result = await editDraft(
    {
      channelId: 'whatsapp:+5511999999999',
      conversationId: 'conv-1',
      structuredText: 'Versao revisada.',
      editedAt: new Date('2026-03-30T13:05:00.000Z'),
    },
    {
      conversationRepository,
    },
  );

  assert.equal(result.type, 'draft_edited');
  if (result.type !== 'draft_edited') {
    assert.fail('Expected a draft_edited result.');
  }

  assert.equal(result.conversation.draft.versions.length, 2);
  assert.equal(result.conversation.draft.currentVersionNumber, 2);
  assert.equal(
    result.conversation.draft.versions[1]?.structuredText,
    'Versao revisada.',
  );
  assert.equal(result.conversation.status, 'awaiting_draft_decision');

  const storedConversation = await conversationRepository.findById('conv-1');
  assert.equal(storedConversation?.draft.currentVersionNumber, 2);
});

test('rejects editing from a different channel', async () => {
  const conversationRepository = new InMemoryConversationRepository();

  const conversation = createDraftVersion(
    createConversation({
      id: 'conv-1',
      ownerChannelId: 'whatsapp:+5511999999999',
      startedAt: new Date('2026-03-30T13:00:00.000Z'),
    }),
    {
      structuredText: 'Versao inicial.',
      createdAt: new Date('2026-03-30T13:01:00.000Z'),
    },
  );

  await conversationRepository.save(conversation);

  await assert.rejects(
    () =>
      editDraft(
        {
          channelId: 'whatsapp:+5511888888888',
          conversationId: 'conv-1',
          structuredText: 'Versao revisada.',
          editedAt: new Date('2026-03-30T13:05:00.000Z'),
        },
        {
          conversationRepository,
        },
      ),
    /owner channel/i,
  );
});

test('rejects editing a conversation that does not exist', async () => {
  await assert.rejects(
    () =>
      editDraft(
        {
          channelId: 'whatsapp:+5511999999999',
          conversationId: 'missing',
          structuredText: 'Versao revisada.',
          editedAt: new Date('2026-03-30T13:05:00.000Z'),
        },
        {
          conversationRepository: new InMemoryConversationRepository(),
        },
      ),
    /does not exist/i,
  );
});
