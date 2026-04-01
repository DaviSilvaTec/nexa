import type { AiBudgetModelRepository } from '../repositories/ai-budget-model-repository';

interface DeleteAiBudgetModelInput {
  modelId: string;
}

interface DeleteAiBudgetModelDependencies {
  aiBudgetModelRepository: AiBudgetModelRepository;
}

export async function deleteAiBudgetModel(
  input: DeleteAiBudgetModelInput,
  dependencies: DeleteAiBudgetModelDependencies,
) {
  const deleted = await dependencies.aiBudgetModelRepository.delete(input.modelId);

  return {
    type: 'ai_budget_model_deleted' as const,
    deleted,
  };
}
