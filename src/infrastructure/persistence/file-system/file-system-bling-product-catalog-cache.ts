import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  BlingProductCatalogCache,
  CachedBlingProductCatalog,
} from '../../../application/catalog/bling-product-catalog-cache';

interface FileSystemBlingProductCatalogCacheDependencies {
  filePath: string;
}

export class FileSystemBlingProductCatalogCache
  implements BlingProductCatalogCache
{
  private readonly filePath: string;

  constructor(
    dependencies: FileSystemBlingProductCatalogCacheDependencies,
  ) {
    this.filePath = dependencies.filePath;
  }

  async read(): Promise<CachedBlingProductCatalog | null> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as CachedBlingProductCatalog;
    } catch (error) {
      if (isFileNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async write(catalog: CachedBlingProductCatalog): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      JSON.stringify(catalog, null, 2),
      'utf-8',
    );
  }
}

function isFileNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
