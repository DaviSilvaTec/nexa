import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  BlingQuoteHistoryCache,
  CachedBlingQuoteHistory,
} from '../../../application/catalog/bling-quote-history-cache';

interface FileSystemBlingQuoteHistoryCacheDependencies {
  filePath: string;
}

export class FileSystemBlingQuoteHistoryCache
  implements BlingQuoteHistoryCache
{
  private readonly filePath: string;

  constructor(
    dependencies: FileSystemBlingQuoteHistoryCacheDependencies,
  ) {
    this.filePath = dependencies.filePath;
  }

  async read(): Promise<CachedBlingQuoteHistory | null> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as CachedBlingQuoteHistory;
    } catch (error) {
      if (isFileNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async write(history: CachedBlingQuoteHistory): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      JSON.stringify(history, null, 2),
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
