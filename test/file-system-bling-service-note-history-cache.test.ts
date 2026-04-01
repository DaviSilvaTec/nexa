import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { FileSystemBlingServiceNoteHistoryCache } from '../src/infrastructure/persistence/file-system/file-system-bling-service-note-history-cache';

test('writes and reads the bling service note history cache from disk', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-service-note-history-cache-'),
  );
  const filePath = path.join(tempDir, 'history.json');
  const cache = new FileSystemBlingServiceNoteHistoryCache({
    filePath,
  });

  await cache.write({
    syncedAt: '2026-03-30T10:00:00.000Z',
    items: [
      {
        id: '501',
        number: '123',
        rpsNumber: '32',
        series: '1',
        status: 1,
        issueDate: '2026-03-10',
        value: 1800,
        contactId: '999',
        contactName: 'Cliente Exemplo',
        contactDocument: '12345678000199',
        contactEmail: 'cliente@example.com',
        link: 'https://bling.example/nfse/501',
        verificationCode: 'ABC123',
      },
    ],
  });

  const stored = await cache.read();

  assert.deepEqual(stored, {
    syncedAt: '2026-03-30T10:00:00.000Z',
    items: [
      {
        id: '501',
        number: '123',
        rpsNumber: '32',
        series: '1',
        status: 1,
        issueDate: '2026-03-10',
        value: 1800,
        contactId: '999',
        contactName: 'Cliente Exemplo',
        contactDocument: '12345678000199',
        contactEmail: 'cliente@example.com',
        link: 'https://bling.example/nfse/501',
        verificationCode: 'ABC123',
      },
    ],
  });
});

test('returns null when the service note history cache file does not exist yet', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-service-note-history-cache-'),
  );

  const cache = new FileSystemBlingServiceNoteHistoryCache({
    filePath: path.join(tempDir, 'history.json'),
  });

  const stored = await cache.read();

  assert.equal(stored, null);
});
