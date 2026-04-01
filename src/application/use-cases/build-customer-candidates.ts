import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';

export async function buildCustomerCandidates(
  queries: Array<string | null | undefined>,
  contactCatalogCache: BlingContactCatalogCache,
): Promise<
  Array<{
    id: string;
    name: string;
    code: string | null;
    documentNumber: string | null;
    phone: string | null;
    mobilePhone: string | null;
    score: number;
  }>
> {
  const catalog = await contactCatalogCache.read();
  const contacts = catalog?.items ?? [];
  const normalizedQueries = queries
    .map((value) => normalizeText(value ?? ''))
    .filter((value) => value.length > 0);

  if (normalizedQueries.length === 0) {
    return [];
  }

  return contacts
    .map((contact) => {
      const score = Math.max(
        ...normalizedQueries.map((query) => scoreCustomerMatch(query, contact.name)),
      );

      return {
        contact,
        score,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 10)
    .map(({ contact, score }) => ({
      id: String(contact.id),
      name: contact.name,
      code: contact.code,
      documentNumber: contact.documentNumber,
      phone: contact.phone,
      mobilePhone: contact.mobilePhone,
      score,
    }));
}

function scoreCustomerMatch(query: string, candidateName: string): number {
  const queryTokens = extractTokens(query);
  const candidateTokens = extractTokens(candidateName);

  if (queryTokens.length === 0 || candidateTokens.length === 0) {
    return 0;
  }

  let score = 0;

  for (const token of queryTokens) {
    if (candidateTokens.includes(token)) {
      score += token.length >= 6 ? 4 : 2;
    }
  }

  if (normalizeText(candidateName).includes(query)) {
    score += 3;
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
