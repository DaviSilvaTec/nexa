interface LocalBudgetMaterialCandidate {
  query: string;
  totalMatches: number;
  matches: Array<{
    id: string;
    name: string;
    code: string | null;
    price: number | null;
    costPrice: number | null;
    stockQuantity: number | null;
    type: string | null;
    status: string | null;
  }>;
}

interface AnalyzeLocalBudgetMaterialsInput {
  materials: LocalBudgetMaterialCandidate[];
}

interface AnalyzedMaterialItem {
  id: string;
  name: string;
  code: string | null;
  price: number | null;
  costPrice: number | null;
  stockQuantity: number | null;
  type: string | null;
  status: string | null;
  sourceQuery: string;
}

type AnalyzeLocalBudgetMaterialsResult = {
  type: 'local_budget_materials_analyzed';
  summary: {
    matchedItems: Array<{
      id: string;
      name: string;
      code: string | null;
      price: number | null;
      costPrice: number | null;
      stockQuantity: number | null;
      type: string | null;
      status: string | null;
      sourceQuery: string;
    }>;
    financial: {
      totals: {
        sale: number;
        cost: number;
        grossProfit: number;
      };
      itemsWithCompleteBase: number;
      itemsMissingSalePrice: Array<{
        id: string;
        name: string;
        sourceQuery: string;
      }>;
      itemsMissingCostPrice: Array<{
        id: string;
        name: string;
        sourceQuery: string;
      }>;
    };
    alerts: string[];
  };
};

export async function analyzeLocalBudgetMaterials(
  input: AnalyzeLocalBudgetMaterialsInput,
): Promise<AnalyzeLocalBudgetMaterialsResult> {
  const matchedItems: AnalyzedMaterialItem[] = [];
  const alerts: string[] = [];

  for (const material of input.materials) {
    if (material.matches.length === 0) {
      alerts.push(
        `Nenhum material local encontrado para a consulta "${material.query}".`,
      );
      continue;
    }

    const bestMatch = selectBestAnalyzedMatch(material);

    if (!bestMatch) {
      alerts.push(
        `Sem correspondencia local suficientemente aderente para a consulta "${material.query}".`,
      );
      continue;
    }

    matchedItems.push({
      id: bestMatch.id,
      name: bestMatch.name,
      code: bestMatch.code,
      price: bestMatch.price,
      costPrice: bestMatch.costPrice,
      stockQuantity: bestMatch.stockQuantity,
      type: bestMatch.type,
      status: bestMatch.status,
      sourceQuery: material.query,
    });
  }

  const sale = matchedItems.reduce(
    (sum, item) => sum + (item.price ?? 0),
    0,
  );
  const cost = matchedItems.reduce(
    (sum, item) => sum + (item.costPrice ?? 0),
    0,
  );

  const itemsMissingSalePrice = matchedItems
    .filter((item) => item.price === null)
    .map((item) => ({
      id: item.id,
      name: item.name,
      sourceQuery: item.sourceQuery,
    }));

  const itemsMissingCostPrice = matchedItems
    .filter((item) => item.costPrice === null)
    .map((item) => ({
      id: item.id,
      name: item.name,
      sourceQuery: item.sourceQuery,
    }));

  alerts.push(
    ...itemsMissingSalePrice.map(
      (item) =>
        `Material "${item.name}" sem preço de venda local para a consulta "${item.sourceQuery}".`,
    ),
    ...itemsMissingCostPrice.map(
      (item) =>
        `Material "${item.name}" sem preço de custo local para a consulta "${item.sourceQuery}".`,
    ),
  );

  return {
    type: 'local_budget_materials_analyzed',
    summary: {
      matchedItems,
      financial: {
        totals: {
          sale,
          cost,
          grossProfit: sale - cost,
        },
        itemsWithCompleteBase: matchedItems.filter(
          (item) => item.price !== null && item.costPrice !== null,
        ).length,
        itemsMissingSalePrice,
        itemsMissingCostPrice,
      },
      alerts,
    },
  };
}

function selectBestAnalyzedMatch(
  material: LocalBudgetMaterialCandidate,
): LocalBudgetMaterialCandidate['matches'][number] | null {
  const normalizedQuery = normalizeText(material.query);

  if (normalizedQuery.includes('switch') && normalizedQuery.includes('4 portas')) {
    return material.matches.find((match) => {
      const normalizedName = normalizeText(match.name);
      return normalizedName.includes('4 portas')
        || normalizedName.includes('4portas')
        || normalizedName.includes('1005');
    }) ?? null;
  }

  return material.matches[0] ?? null;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
