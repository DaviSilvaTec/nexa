import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { FileSystemBlingProductCatalogCache } from '../src/infrastructure/persistence/file-system/file-system-bling-product-catalog-cache';

test('writes and reads the bling product catalog cache from disk', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-product-cache-'),
  );
  const filePath = path.join(tempDir, 'catalog.json');
  const cache = new FileSystemBlingProductCatalogCache({
    filePath,
  });

  await cache.write({
    syncedAt: '2026-03-30T12:00:00.000Z',
    items: [
      {
        id: 'prod-1',
        name: 'Cabo PP 2x1,5mm',
        code: 'CABO215',
        price: 8.5,
        costPrice: 5.2,
        stockQuantity: 12,
        type: 'P',
        status: 'A',
      },
    ],
  });

  const stored = await cache.read();

  assert.deepEqual(stored, {
    syncedAt: '2026-03-30T12:00:00.000Z',
    items: [
      {
        id: 'prod-1',
        name: 'Cabo PP 2x1,5mm',
        code: 'CABO215',
        price: 8.5,
        costPrice: 5.2,
        stockQuantity: 12,
        type: 'P',
        status: 'A',
      },
    ],
  });
});

test('returns null when the cache file does not exist yet', async () => {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'nexa-product-cache-'),
  );
  const filePath = path.join(tempDir, 'missing.json');
  const cache = new FileSystemBlingProductCatalogCache({
    filePath,
  });

  const stored = await cache.read();

  assert.equal(stored, null);
});
