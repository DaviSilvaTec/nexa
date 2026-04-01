interface NormalizeAiBudgetIntakeInput {
  originalText: string;
  customerQuery: string | null;
  materialQueries: string[];
  serviceHints: string[];
  ambiguities: string[];
}

interface NormalizeAiBudgetIntakeResult {
  customerQuery: string | null;
  materialQueries: string[];
  serviceHints: string[];
  ambiguities: string[];
}

export function normalizeAiBudgetIntake(
  input: NormalizeAiBudgetIntakeInput,
): NormalizeAiBudgetIntakeResult {
  const normalizedMaterialQueries = input.materialQueries
    .map((query) => normalizeMaterialQuery(query, input.originalText))
    .filter((query, index, items) => query.length > 0 && items.indexOf(query) === index);

  return {
    customerQuery: normalizeCustomerQuery(input.customerQuery),
    materialQueries: mergeStandaloneBrandQueries(normalizedMaterialQueries),
    serviceHints: input.serviceHints,
    ambiguities: input.ambiguities,
  };
}

function normalizeCustomerQuery(value: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const withoutLabel = value
    .replace(/^cliente:\s*/i, '')
    .replace(/^orcamento\s+para\s+/i, '')
    .replace(/^orçamento\s+para\s+/i, '')
    .trim();

  const truncated = withoutLabel
    .split(/\s+[;,|-]\s+/)[0]
    ?.split(/\s+com\s+/i)[0]
    ?.split(/\s*:\s*/)[0]
    ?.trim() ?? '';

  const withoutLeadingArticle = truncated.replace(/^(o|a|os|as)\s+/i, '').trim();

  return withoutLeadingArticle.length > 0 ? withoutLeadingArticle : null;
}

function mergeStandaloneBrandQueries(queries: string[]): string[] {
  const remainingQueries = [...queries];

  for (const brand of ['furukawa']) {
    const brandIndex = remainingQueries.indexOf(brand);

    if (brandIndex === -1) {
      continue;
    }

    const mergeTargetIndex = remainingQueries.findIndex(
      (query) =>
        query !== brand
        && (query.includes('cabo')
          || query.includes('conector')
          || query.includes('rj45')),
    );

    if (mergeTargetIndex === -1) {
      continue;
    }

    if (!remainingQueries[mergeTargetIndex]?.includes(brand)) {
      remainingQueries[mergeTargetIndex] = `${remainingQueries[mergeTargetIndex]} ${brand}`;
    }

    remainingQueries.splice(brandIndex, 1);
  }

  return remainingQueries;
}

function normalizeMaterialQuery(value: string, originalText: string): string {
  const normalized = normalizeText(value)
    .replace(/[()]/g, ' ')
    .replace(/\bpara\b/g, ' ')
    .replace(/\bmarca\b/g, ' ')
    .replace(/\binstalacao\b/g, ' ')
    .replace(/\borcamento\b/g, ' ')
    .replace(/\bestoque\b/g, ' ')
    .replace(/\bquantidade\b/g, ' ')
    .replace(/\bpossivel\b/g, ' ')
    .replace(/\breferencia\b/g, ' ')
    .replace(/\bduas?\b/g, ' ')
    .replace(/\bpontas?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedOriginalText = normalizeText(originalText);

  if (normalized.includes('cabo') && normalized.includes('pp')) {
    const measurement = normalized.match(/\d+\s*x\s*\d+(?:[.,]\d+)?/);
    return measurement ? `cabo pp ${measurement[0]}` : 'cabo pp';
  }

  if (normalized.includes('rj45')) {
    return 'conector rj45';
  }

  if (normalized.includes('switch')) {
    const portas = normalized.match(/(\d+)\s*portas?/)
      ?? normalizedOriginalText.match(/(\d+)\s*portas?/);
    return portas ? `switch ${portas[1]} portas` : 'switch';
  }

  if (normalized.includes('camera')) {
    const megapixels = normalized.match(/(\d+)\s*mp/)
      ?? normalizedOriginalText.match(/(\d+)\s*(?:mp|megapixels?)/);
    const suffix = megapixels ? ` ${megapixels[1]}mp` : '';
    return normalized.includes('ip')
      ? `camera ip${suffix}`
      : `camera${suffix}`;
  }

  if (normalized.includes('cabo')) {
    const brand = normalized.includes('furukawa') ? ' furukawa' : '';
    if (normalized.includes('rede') || normalized.includes('internet')) {
      return `cabo de rede${brand}`;
    }

    return `cabo${brand}`;
  }

  if (normalized.includes('bucha')) {
    const bitola = normalized.match(/(\d+)\s*mm/)
      ?? normalizedOriginalText.match(/(\d+)\s*mm/);
    return bitola ? `bucha ${bitola[1]}mm` : 'bucha';
  }

  if (normalized.includes('parafuso')) {
    const bitola = normalized.match(/(\d+)\s*mm/)
      ?? normalizedOriginalText.match(/(\d+)\s*mm/);
    return bitola ? `parafuso ${bitola[1]}mm` : 'parafuso';
  }

  const tokens = normalized
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .slice(0, 4);

  return tokens.join(' ');
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
