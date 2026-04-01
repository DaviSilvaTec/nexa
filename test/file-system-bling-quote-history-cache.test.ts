import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { FileSystemBlingQuoteHistoryCache } from '../src/infrastructure/persistence/file-system/file-system-bling-quote-history-cache';

test('writes and reads the bling commercial proposal history cache from disk', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-quote-history-cache-'),
  );
  const filePath = path.join(tempDir, 'history.json');
  const cache = new FileSystemBlingQuoteHistoryCache({
    filePath,
  });

  await cache.write({
    syncedAt: '2026-03-30T10:00:00.000Z',
    items: [
      {
        id: '101',
        date: '2026-03-20',
        status: 'Aprovado',
        total: 4200.5,
        productsTotal: 3100,
        number: '87',
        contactId: '999',
        storeId: '5',
      },
    ],
  });

  const stored = await cache.read();

  assert.deepEqual(stored, {
    syncedAt: '2026-03-30T10:00:00.000Z',
    items: [
      {
        id: '101',
        date: '2026-03-20',
        status: 'Aprovado',
        total: 4200.5,
        productsTotal: 3100,
        number: '87',
        contactId: '999',
        storeId: '5',
      },
    ],
  });
});

test('returns null when the commercial proposal history cache file does not exist yet', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-quote-history-cache-'),
  );

  const cache = new FileSystemBlingQuoteHistoryCache({
    filePath: path.join(tempDir, 'history.json'),
  });

  const stored = await cache.read();

  assert.equal(stored, null);
});
