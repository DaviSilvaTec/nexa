import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  BlingServiceNoteHistoryCache,
  CachedBlingServiceNoteHistory,
} from '../../../application/catalog/bling-service-note-history-cache';

interface FileSystemBlingServiceNoteHistoryCacheDependencies {
  filePath: string;
}

export class FileSystemBlingServiceNoteHistoryCache
  implements BlingServiceNoteHistoryCache
{
  private readonly filePath: string;

  constructor(
    dependencies: FileSystemBlingServiceNoteHistoryCacheDependencies,
  ) {
    this.filePath = dependencies.filePath;
  }

  async read(): Promise<CachedBlingServiceNoteHistory | null> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as CachedBlingServiceNoteHistory;
    } catch (error) {
      if (isFileNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  async write(history: CachedBlingServiceNoteHistory): Promise<void> {
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
