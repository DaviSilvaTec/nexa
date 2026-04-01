import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';

interface MaterialSelectionItem {
  description: string;
  quantityText: string;
  sourceQuery: string | null;
  catalogItemId: string | null;
  catalogItemName: string | null;
}

export async function buildExpandedMaterialCandidates(
  materialItems: MaterialSelectionItem[],
  productCatalogCache: BlingProductCatalogCache,
): Promise<
  Array<{
    query: string;
    totalMatches: number;
    candidates: Array<{
      id: string;
      name: string;
      code: string | null;
      price: number | null;
      costPrice: number | null;
      stockQuantity: number | null;
      type: string | null;
      status: string | null;
    }>;
  }>
> {
  const catalog = await productCatalogCache.read();
  const products = catalog?.items ?? [];

  return materialItems
    .map((item) => {
      const query = item.description;
      const rankedCandidates = products
        .map((product) => ({
          product,
          score: scoreExpandedCatalogMatch(query, product.name),
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, 10)
        .map(({ product }) => ({
          id: String(product.id),
          name: product.name,
          code: product.code,
          price: product.price,
          costPrice: product.costPrice,
          stockQuantity: product.stockQuantity,
          type: product.type,
          status: product.status,
        }));

      return {
        query,
        totalMatches: rankedCandidates.length,
        candidates: rankedCandidates,
      };
    })
    .filter((item) => item.candidates.length > 0);
}

function scoreExpandedCatalogMatch(query: string, candidateName: string): number {
  const queryTokens = extractTokens(query);
  const candidateTokens = extractTokens(candidateName);
  let score = 0;

  for (const token of queryTokens) {
    if (candidateTokens.includes(token)) {
      score += token.length >= 6 ? 3 : 2;
    }
  }

  if (
    queryTokens.some((token) => token === 'bucha') &&
    !candidateTokens.includes('bucha')
  ) {
    score -= 8;
  }

  if (
    queryTokens.some((token) => token.startsWith('abrac')) &&
    ['organizar', 'fios', 'cabos', 'chicote', 'enrrolar'].some((token) =>
      candidateTokens.includes(token),
    )
  ) {
    score -= 10;
  }

  return score;
}

function extractTokens(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token, index, list) => list.indexOf(token) === index);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
