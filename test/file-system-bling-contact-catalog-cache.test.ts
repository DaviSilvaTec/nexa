import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { FileSystemBlingContactCatalogCache } from '../src/infrastructure/persistence/file-system/file-system-bling-contact-catalog-cache';

test('writes and reads the bling contact catalog cache from disk', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-contact-catalog-cache-'),
  );
  const filePath = path.join(tempDir, 'catalog.json');
  const cache = new FileSystemBlingContactCatalogCache({
    filePath,
  });

  await cache.write({
    syncedAt: '2026-03-30T10:00:00.000Z',
    items: [
      {
        id: '999',
        name: 'Cliente Exemplo Ltda',
        code: 'CLI001',
        status: 'A',
        documentNumber: '12345678000199',
        phone: '(16) 3000-0000',
        mobilePhone: '(16) 99999-0000',
      },
    ],
  });

  const stored = await cache.read();

  assert.deepEqual(stored, {
    syncedAt: '2026-03-30T10:00:00.000Z',
    items: [
      {
        id: '999',
        name: 'Cliente Exemplo Ltda',
        code: 'CLI001',
        status: 'A',
        documentNumber: '12345678000199',
        phone: '(16) 3000-0000',
        mobilePhone: '(16) 99999-0000',
      },
    ],
  });
});

test('returns null when the contact catalog cache file does not exist yet', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-contact-catalog-cache-'),
  );

  const cache = new FileSystemBlingContactCatalogCache({
    filePath: path.join(tempDir, 'catalog.json'),
  });

  const stored = await cache.read();

  assert.equal(stored, null);
});
