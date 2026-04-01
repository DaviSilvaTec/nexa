import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';

interface SearchLocalProductCatalogInput {
  query: string;
  limit?: number;
}

interface SearchLocalProductCatalogDependencies {
  productCatalogCache: BlingProductCatalogCache;
}

type SearchLocalProductCatalogResult = {
  type: 'local_product_catalog_searched';
  query: string;
  products: {
    totalMatches: number;
    items: Array<{
      id: string;
      name: string;
      code: string | null;
      price: number | null;
      costPrice: number | null;
      stockQuantity: number | null;
      type: string | null;
      status: string | null;
    }>;
  };
};

export async function searchLocalProductCatalog(
  input: SearchLocalProductCatalogInput,
  dependencies: SearchLocalProductCatalogDependencies,
): Promise<SearchLocalProductCatalogResult> {
  const catalog = await dependencies.productCatalogCache.read();
  const normalizedQuery = normalizeText(input.query);
  const limit = input.limit ?? 10;

  const matches = (catalog?.items ?? [])
    .map((item) => ({
      item,
      score: scoreProductMatch(item, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.item);

  return {
    type: 'local_product_catalog_searched',
    query: input.query,
    products: {
      totalMatches: matches.length,
      items: matches.slice(0, limit),
    },
  };
}

function scoreProductMatch(
  item: {
    name: string;
    code: string | null;
    type?: string | null;
  },
  normalizedQuery: string,
): number {
  if (!normalizedQuery) {
    return 0;
  }

  const name = normalizeText(item.name);
  const code = normalizeText(item.code ?? '');
  const compactedName = compactCompositePatterns(name);
  const compactedCode = compactCompositePatterns(code);
  const compactedQuery = compactCompositePatterns(normalizedQuery);
  const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 0);
  const strongTokens = extractStrongTokens(compactedQuery);
  const hasCompositeMeasurementQuery = strongTokens.length > 0;
  const heuristics = buildQueryHeuristics(normalizedQuery);

  let score = 0;
  let matchedStrongToken = false;

  if (!matchesRequiredTokens(name, code, heuristics.requiredAny)) {
    return 0;
  }

  if (name.includes(normalizedQuery)) {
    score += 10;
  }

  if (code.includes(normalizedQuery)) {
    score += 12;
  }

  if (compactedName.includes(compactedQuery)) {
    score += 14;
    matchedStrongToken = true;
  }

  if (compactedCode.includes(compactedQuery)) {
    score += 16;
    matchedStrongToken = true;
  }

  for (const token of tokens) {
    if (name.includes(token)) {
      score += 3;
    }

    if (code.includes(token)) {
      score += 4;
    }
  }

  for (const strongToken of strongTokens) {
    if (compactedName.includes(strongToken)) {
      score += 8;
      matchedStrongToken = true;
    }

    if (compactedCode.includes(strongToken)) {
      score += 9;
      matchedStrongToken = true;
    }
  }

  if (hasCompositeMeasurementQuery && !matchedStrongToken) {
    return 0;
  }

  score += scorePreferredTokens(name, code, heuristics.preferred);
  score -= scoreForbiddenTokens(name, code, heuristics.forbidden);

  if (shouldPenalizeServiceItem(item.type, heuristics)) {
    score -= 20;
  }

  if (score <= 0) {
    return 0;
  }

  return score;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function compactCompositePatterns(value: string): string {
  return value.replace(/(\d)\s*x\s*(\d)/g, '$1x$2');
}

function extractStrongTokens(compactedQuery: string): string[] {
  const strongTokens = compactedQuery.match(/\d+x\d+(?:[.,]\d+)?/g) ?? [];

  return [...new Set(strongTokens)];
}

function buildQueryHeuristics(normalizedQuery: string): {
  requiredAny: string[][];
  preferred: string[];
  forbidden: string[];
  prefersProduct: boolean;
} {
  const requiredAny: string[][] = [];
  const preferred: string[] = [];
  const forbidden: string[] = [];
  let prefersProduct = true;

  if (normalizedQuery.includes('cabo')) {
    requiredAny.push(['cabo']);
    preferred.push('rede', 'cat5', 'cat5e', 'cat6');
    forbidden.push('usb', 'extensao', 'extensão');
  }

  if (normalizedQuery.includes('furukawa')) {
    preferred.push('furukawa');
  }

  if (normalizedQuery.includes('rj45')) {
    requiredAny.push(['rj45']);
    preferred.push('conector', 'macho', 'cat5', 'cat5e');
    forbidden.push('tomada', 'modulo', 'modulo', 'moldura');
  }

  if (normalizedQuery.includes('conector')) {
    requiredAny.push(['conector', 'rj45']);
  }

  if (normalizedQuery.includes('switch')) {
    requiredAny.push(['switch']);
    preferred.push('4 portas', '4portas', 'ethernet');
    forbidden.push('kvm', 'monitor', 'placa', 'escova');
  }

  if (normalizedQuery.includes('camera')) {
    requiredAny.push(['camera']);
    preferred.push('ip', 'bullet', 'dome', 'network');
    if (normalizedQuery.includes('2mp')) {
      preferred.push('2mp', '2 mp');
      forbidden.push('3mp', '3.0mp', '3 mp', '5mp', '5.0mp', '5 mp');
    }
  }

  if (normalizedQuery.includes('bucha')) {
    requiredAny.push(['bucha']);
    preferred.push('6mm', '6 mm', 'parafuso');
    forbidden.push('terminal', 'avental');
  }

  if (
    normalizedQuery.includes('instalacao')
    || normalizedQuery.includes('servico')
    || normalizedQuery.includes('serviço')
  ) {
    prefersProduct = false;
  }

  return {
    requiredAny,
    preferred,
    forbidden,
    prefersProduct,
  };
}

function matchesRequiredTokens(
  name: string,
  code: string,
  requiredAnyGroups: string[][],
): boolean {
  return requiredAnyGroups.every((group) =>
    group.some((token) => name.includes(token) || code.includes(token)),
  );
}

function scorePreferredTokens(
  name: string,
  code: string,
  tokens: string[],
): number {
  let score = 0;

  for (const token of tokens) {
    if (name.includes(token)) {
      score += 5;
    }

    if (code.includes(token)) {
      score += 6;
    }
  }

  return score;
}

function scoreForbiddenTokens(
  name: string,
  code: string,
  tokens: string[],
): number {
  let penalty = 0;

  for (const token of tokens) {
    if (name.includes(token)) {
      penalty += 12;
    }

    if (code.includes(token)) {
      penalty += 14;
    }
  }

  return penalty;
}

function shouldPenalizeServiceItem(
  type: string | null | undefined,
  heuristics: { prefersProduct: boolean },
): boolean {
  return heuristics.prefersProduct && type === 'S';
}
