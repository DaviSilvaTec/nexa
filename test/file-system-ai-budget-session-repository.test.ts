import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { FileSystemAiBudgetSessionRepository } from '../src/infrastructure/persistence/file-system/file-system-ai-budget-session-repository';

test('writes, lists and reads AI budget sessions from disk', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-ai-budget-sessions-'),
  );
  const filePath = path.join(tempDir, 'sessions.json');
  const repository = new FileSystemAiBudgetSessionRepository({
    filePath,
  });

  await repository.save({
    id: 'sess-1',
    createdAt: '2026-03-30T13:50:00.000Z',
    updatedAt: '2026-03-30T13:50:00.000Z',
    originalText: 'Instalar câmeras no posto Alonso',
    customerQuery: 'posto alonso',
    confidence: 'medio',
    status: 'Aguardando aprovacao',
    payload: {
      aiResponse: {
        interpretation: {
          summaryTitle: 'Instalação de câmeras no posto',
        },
      },
    },
  });

  const listed = await repository.listRecent();
  const loaded = await repository.findById('sess-1');

  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, 'sess-1');
  assert.equal(listed[0]?.summaryTitle, 'Instalação de câmeras no posto');
  assert.equal(loaded?.customerQuery, 'posto alonso');
});

test('returns empty and null when the AI session store does not exist yet', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-ai-budget-sessions-'),
  );
  const filePath = path.join(tempDir, 'missing.json');
  const repository = new FileSystemAiBudgetSessionRepository({
    filePath,
  });

  const listed = await repository.listRecent();
  const loaded = await repository.findById('missing');

  assert.deepEqual(listed, []);
  assert.equal(loaded, null);
});

test('deletes a persisted AI budget session from disk', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-ai-budget-sessions-'),
  );
  const filePath = path.join(tempDir, 'sessions.json');
  const repository = new FileSystemAiBudgetSessionRepository({
    filePath,
  });

  await repository.save({
    id: 'sess-1',
    createdAt: '2026-03-30T13:50:00.000Z',
    updatedAt: '2026-03-30T13:50:00.000Z',
    originalText: 'Instalar câmeras no posto Alonso',
    customerQuery: 'posto alonso',
    confidence: 'medio',
    status: 'Aguardando aprovacao',
    payload: { any: 'value' },
  });

  const deleted = await repository.delete('sess-1');
  const loaded = await repository.findById('sess-1');

  assert.equal(deleted, true);
  assert.equal(loaded, null);
});
