import fs from 'node:fs/promises';
import path from 'node:path';

import type {
  AiBudgetModelRecord,
  AiBudgetModelRepository,
  AiBudgetModelSummary,
} from '../../../application/repositories/ai-budget-model-repository';

interface FileSystemAiBudgetModelRepositoryDependencies {
  filePath: string;
}

export class FileSystemAiBudgetModelRepository
  implements AiBudgetModelRepository
{
  private readonly filePath: string;

  constructor(
    dependencies: FileSystemAiBudgetModelRepositoryDependencies,
  ) {
    this.filePath = dependencies.filePath;
  }

  async save(model: AiBudgetModelRecord): Promise<void> {
    const models = await this.readAll();
    const existingIndex = models.findIndex((item) => item.id === model.id);

    if (existingIndex >= 0) {
      models[existingIndex] = model;
    } else {
      models.push(model);
    }

    await this.writeAll(models);
  }

  async findById(id: string): Promise<AiBudgetModelRecord | null> {
    const models = await this.readAll();
    return models.find((model) => model.id === id) ?? null;
  }

  async listRecent(limit = 20): Promise<AiBudgetModelSummary[]> {
    const models = await this.readAll();

    return models
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit)
      .map((model) => ({
        id: model.id,
        title: model.title,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        customerQuery: model.customerQuery,
        sourceSessionId: model.sourceSessionId,
        previewText: model.previewText,
        blingQuoteId: model.blingQuoteId,
        blingQuoteNumber: model.blingQuoteNumber,
      }));
  }

  async delete(id: string): Promise<boolean> {
    const models = await this.readAll();
    const filteredModels = models.filter((model) => model.id !== id);

    if (filteredModels.length === models.length) {
      return false;
    }

    await this.writeAll(filteredModels);
    return true;
  }

  private async readAll(): Promise<AiBudgetModelRecord[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(content) as AiBudgetModelRecord[];
    } catch (error) {
      if (isFileNotFound(error)) {
        return [];
      }

      throw error;
    }
  }

  private async writeAll(models: AiBudgetModelRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(models, null, 2), 'utf-8');
  }
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
