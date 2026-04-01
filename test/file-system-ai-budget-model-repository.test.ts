import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { FileSystemAiBudgetModelRepository } from '../src/infrastructure/persistence/file-system/file-system-ai-budget-model-repository';

test('writes, lists and reads AI budget models from disk', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexa-ai-budget-models-'));
  const filePath = path.join(tempDir, 'models.json');
  const repository = new FileSystemAiBudgetModelRepository({ filePath });

  await repository.save({
    id: 'model-1',
    title: 'Modelo - Posto Alonso',
    createdAt: '2026-03-30T19:00:00.000Z',
    updatedAt: '2026-03-30T19:00:00.000Z',
    customerQuery: 'Posto Alonso',
    sourceSessionId: 'sess-1',
    previewText: 'Instalação de duas câmeras IP',
    blingQuoteId: 'bling-quote-1',
    blingQuoteNumber: '102',
    draftText: 'Cliente: Posto Alonso',
    payload: { any: 'value' },
  });

  const listed = await repository.listRecent();
  const loaded = await repository.findById('model-1');

  assert.equal(listed.length, 1);
  assert.equal(listed[0]?.id, 'model-1');
  assert.equal(listed[0]?.blingQuoteNumber, '102');
  assert.equal(loaded?.title, 'Modelo - Posto Alonso');
});

test('deletes a persisted AI budget model from disk', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexa-ai-budget-models-'));
  const filePath = path.join(tempDir, 'models.json');
  const repository = new FileSystemAiBudgetModelRepository({ filePath });

  await repository.save({
    id: 'model-1',
    title: 'Modelo - Posto Alonso',
    createdAt: '2026-03-30T19:00:00.000Z',
    updatedAt: '2026-03-30T19:00:00.000Z',
    customerQuery: 'Posto Alonso',
    sourceSessionId: 'sess-1',
    previewText: 'Instalação de duas câmeras IP',
    blingQuoteId: 'bling-quote-1',
    blingQuoteNumber: '102',
    draftText: 'Cliente: Posto Alonso',
    payload: { any: 'value' },
  });

  const deleted = await repository.delete('model-1');
  const loaded = await repository.findById('model-1');

  assert.equal(deleted, true);
  assert.equal(loaded, null);
});
