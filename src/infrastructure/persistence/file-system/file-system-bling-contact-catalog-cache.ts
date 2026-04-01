import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  BlingContactCatalogCache,
  CachedBlingContactCatalog,
} from '../../../application/catalog/bling-contact-catalog-cache';

interface FileSystemBlingContactCatalogCacheDependencies {
  filePath: string;
}

export class FileSystemBlingContactCatalogCache
  implements BlingContactCatalogCache
{
  private readonly filePath: string;

  constructor(
    dependencies: FileSystemBlingContactCatalogCacheDependencies,
  ) {
    this.filePath = dependencies.filePath;
  }

  async read(): Promise<CachedBlingContactCatalog | null> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as CachedBlingContactCatalog;
    } catch (error) {
      if (isFileNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async write(catalog: CachedBlingContactCatalog): Promise<void> {
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
