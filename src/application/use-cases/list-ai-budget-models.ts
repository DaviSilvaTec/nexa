import type { AiBudgetModelRepository } from '../repositories/ai-budget-model-repository';

interface ListAiBudgetModelsInput {
  limit?: number;
}

interface ListAiBudgetModelsDependencies {
  aiBudgetModelRepository: AiBudgetModelRepository;
}

export async function listAiBudgetModels(
  input: ListAiBudgetModelsInput,
  dependencies: ListAiBudgetModelsDependencies,
) {
  const models = await dependencies.aiBudgetModelRepository.listRecent(input.limit);

  return {
    type: 'ai_budget_models_listed' as const,
    models,
  };
}
