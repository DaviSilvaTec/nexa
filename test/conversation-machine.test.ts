import test from 'node:test';
import assert from 'node:assert/strict';

import {
  approveDraftVersion,
  confirmFinalApproval,
  createConversation,
  createDraftVersion,
  hasTimedOut,
  moveToConflictResolution,
  suspendConversation,
} from '../src/domain/conversation/conversation-machine';

test('creates v1 and marks the conversation as awaiting draft decision', () => {
  const conversation = createConversation({
    id: 'conv-1',
    ownerChannelId: 'whatsapp:+5511999999999',
    startedAt: new Date('2026-03-29T12:00:00.000Z'),
  });

  const updated = createDraftVersion(conversation, {
    structuredText: 'Troca de refletores e revisão de fiação.',
    createdAt: new Date('2026-03-29T12:01:00.000Z'),
  });

  assert.equal(updated.status, 'awaiting_draft_decision');
  assert.equal(updated.draft.versions.length, 1);
  assert.equal(updated.draft.currentVersionNumber, 1);
  assert.equal(updated.activeDraftVersionId, updated.draft.versions[0]?.id);
  assert.equal(updated.draft.versions[0]?.versionNumber, 1);
});

test('creates v2 without overwriting v1', () => {
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

  const updated = createDraftVersion(conversation, {
    structuredText: 'Versao revisada.',
    createdAt: new Date('2026-03-29T12:02:00.000Z'),
  });

  assert.equal(updated.draft.versions.length, 2);
  assert.equal(updated.draft.versions[0]?.versionNumber, 1);
  assert.equal(updated.draft.versions[0]?.structuredText, 'Versao inicial.');
  assert.equal(updated.draft.versions[1]?.versionNumber, 2);
  assert.equal(updated.draft.versions[1]?.structuredText, 'Versao revisada.');
  assert.equal(updated.activeDraftVersionId, updated.draft.versions[1]?.id);
});

test('approves the latest active version and moves to final confirmation', () => {
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

  const approved = approveDraftVersion(conversation, {
    channelId: 'whatsapp:+5511999999999',
    decidedAt: new Date('2026-03-29T12:02:00.000Z'),
  });

  assert.equal(approved.status, 'awaiting_final_confirmation');
  assert.equal(approved.approvedDraftVersionId, approved.activeDraftVersionId);
  assert.equal(approved.approvalContexts.length, 1);
  assert.equal(approved.approvalContexts[0]?.approvalStage, 'draft_review');
  assert.equal(approved.approvalContexts[0]?.status, 'approved');
  assert.equal(approved.finalSummaryIssuedAt?.toISOString(), '2026-03-29T12:02:00.000Z');
});

test('rejects approval from a channel that does not own the conversation', () => {
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

  assert.throws(
    () =>
      approveDraftVersion(conversation, {
        channelId: 'whatsapp:+5511888888888',
        decidedAt: new Date('2026-03-29T12:02:00.000Z'),
      }),
    /owner channel/i,
  );
});

test('moves to conflict resolution when a new request arrives during review', () => {
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

  const updated = moveToConflictResolution(conversation, {
    occurredAt: new Date('2026-03-29T12:02:00.000Z'),
  });

  assert.equal(updated.status, 'awaiting_conflict_resolution');
});

test('detects inactivity timeout and creates a suspended analysis snapshot', () => {
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

  assert.equal(
    hasTimedOut(conversation, new Date('2026-03-29T12:12:00.000Z')),
    true,
  );

  const suspended = suspendConversation(conversation, {
    reason: 'timeout',
    suspendedAt: new Date('2026-03-29T12:12:00.000Z'),
  });

  assert.equal(suspended.status, 'suspended');
  assert.equal(suspended.suspendedAnalysis?.reason, 'timeout');
  assert.equal(suspended.suspendedAnalysis?.status, 'open');
  assert.equal(suspended.suspendedAnalysis?.lastDraftVersionId, suspended.activeDraftVersionId);
});

test('requires final summary before moving to bling execution', () => {
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

  assert.throws(
    () =>
      confirmFinalApproval(conversation, {
        channelId: 'whatsapp:+5511999999999',
        decidedAt: new Date('2026-03-29T12:02:00.000Z'),
      }),
    /final summary/i,
  );
});
