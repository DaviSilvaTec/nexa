import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createConversation,
  createDraftVersion,
  suspendConversation,
} from '../src/domain/conversation/conversation-machine';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemorySuspendedAnalysisRepository } from '../src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';
import { resumeSuspendedAnalysis } from '../src/application/use-cases/resume-suspended-analysis';

test('resumes a suspended analysis for the owner channel', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const suspendedConversation = suspendConversation(
    createDraftVersion(
      createConversation({
        id: 'conv-1',
        ownerChannelId: 'whatsapp:+5511999999999',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
      }),
      {
        structuredText: 'Versao inicial.',
        createdAt: new Date('2026-03-30T12:01:00.000Z'),
      },
    ),
    {
      reason: 'timeout',
      suspendedAt: new Date('2026-03-30T12:12:00.000Z'),
    },
  );

  await conversationRepository.save(suspendedConversation);
  await suspendedAnalysisRepository.saveFromConversation(suspendedConversation);

  const result = await resumeSuspendedAnalysis(
    {
      channelId: 'whatsapp:+5511999999999',
      suspendedAnalysisId: 'conv-1:suspended',
      resumedAt: new Date('2026-03-30T12:20:00.000Z'),
    },
    {
      conversationRepository,
      suspendedAnalysisRepository,
    },
  );

  assert.equal(result.type, 'suspended_analysis_resumed');
  if (result.type !== 'suspended_analysis_resumed') {
    assert.fail('Expected a suspended_analysis_resumed result.');
  }

  assert.equal(result.conversation.id, 'conv-1');
  assert.equal(result.conversation.status, 'collecting_input');
  assert.equal(result.conversation.lastInteractionAt.toISOString(), '2026-03-30T12:20:00.000Z');

  const storedConversation = await conversationRepository.findById('conv-1');
  const storedAnalysis = await suspendedAnalysisRepository.findById('conv-1:suspended');

  assert.equal(storedConversation?.status, 'collecting_input');
  assert.equal(storedAnalysis?.status, 'resumed');
  assert.equal(storedAnalysis?.resumedAt?.toISOString(), '2026-03-30T12:20:00.000Z');
});

test('rejects resuming a suspended analysis from a different channel', async () => {
  const conversationRepository = new InMemoryConversationRepository();
  const suspendedAnalysisRepository = new InMemorySuspendedAnalysisRepository();

  const suspendedConversation = suspendConversation(
    createDraftVersion(
      createConversation({
        id: 'conv-1',
        ownerChannelId: 'whatsapp:+5511999999999',
        startedAt: new Date('2026-03-30T12:00:00.000Z'),
      }),
      {
        structuredText: 'Versao inicial.',
        createdAt: new Date('2026-03-30T12:01:00.000Z'),
      },
    ),
    {
      reason: 'timeout',
      suspendedAt: new Date('2026-03-30T12:12:00.000Z'),
    },
  );

  await conversationRepository.save(suspendedConversation);
  await suspendedAnalysisRepository.saveFromConversation(suspendedConversation);

  await assert.rejects(
    () =>
      resumeSuspendedAnalysis(
        {
          channelId: 'whatsapp:+5511888888888',
          suspendedAnalysisId: 'conv-1:suspended',
          resumedAt: new Date('2026-03-30T12:20:00.000Z'),
        },
        {
          conversationRepository,
          suspendedAnalysisRepository,
        },
      ),
    /owner channel/i,
  );
});

test('rejects resuming an analysis that does not exist', async () => {
  await assert.rejects(
    () =>
      resumeSuspendedAnalysis(
        {
          channelId: 'whatsapp:+5511999999999',
          suspendedAnalysisId: 'missing',
          resumedAt: new Date('2026-03-30T12:20:00.000Z'),
        },
        {
          conversationRepository: new InMemoryConversationRepository(),
          suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
        },
      ),
    /does not exist/i,
  );
});
