import type {
  AiBudgetModelRecord,
  AiBudgetModelRepository,
  AiBudgetModelSummary,
} from '../../../application/repositories/ai-budget-model-repository';

export class InMemoryAiBudgetModelRepository
  implements AiBudgetModelRepository
{
  private readonly models = new Map<string, AiBudgetModelRecord>();

  async save(model: AiBudgetModelRecord): Promise<void> {
    this.models.set(model.id, model);
  }

  async findById(id: string): Promise<AiBudgetModelRecord | null> {
    return this.models.get(id) ?? null;
  }

  async listRecent(limit = 20): Promise<AiBudgetModelSummary[]> {
    return [...this.models.values()]
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
    return this.models.delete(id);
  }
}
