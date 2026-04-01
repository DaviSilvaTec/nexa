import type { AiBudgetModelRepository } from '../repositories/ai-budget-model-repository';

interface GetAiBudgetModelInput {
  modelId: string;
}

interface GetAiBudgetModelDependencies {
  aiBudgetModelRepository: AiBudgetModelRepository;
}

export async function getAiBudgetModel(
  input: GetAiBudgetModelInput,
  dependencies: GetAiBudgetModelDependencies,
) {
  const model = await dependencies.aiBudgetModelRepository.findById(input.modelId);

  if (!model) {
    throw new Error(`AI budget model "${input.modelId}" was not found.`);
  }

  return {
    type: 'ai_budget_model_loaded' as const,
    model,
  };
}
