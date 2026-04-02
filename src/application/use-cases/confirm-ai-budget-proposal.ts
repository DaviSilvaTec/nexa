import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
} from '../repositories/ai-budget-session-repository';
import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type { BlingQuoteGateway } from '../gateways/bling-quote-gateway';
import { extractCustomerFromCommercialBody } from './extract-customer-from-commercial-body';
import { updateAiBudgetWorkflowState } from './update-ai-budget-workflow-state';

interface ConfirmAiBudgetProposalInput {
  sessionId: string;
  confirmedAt?: Date;
}

interface ConfirmAiBudgetProposalDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
  blingQuoteGateway: BlingQuoteGateway;
  contactCatalogCache: BlingContactCatalogCache;
  productCatalogCache: BlingProductCatalogCache;
}

export async function confirmAiBudgetProposal(
  input: ConfirmAiBudgetProposalInput,
  dependencies: ConfirmAiBudgetProposalDependencies,
) {
  const session = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!session) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  const payload = asRecord(session.payload);
  const proposalDraft = asRecord(payload.proposalDraft);
  const existingBlingQuote = asRecord(payload.blingQuote);
  const blingQuoteReference = asRecord(payload.blingQuoteReference);

  if (Object.keys(proposalDraft).length === 0) {
    throw new Error(
      `AI budget session "${input.sessionId}" must have a generated proposal draft before confirmation.`,
    );
  }

  if (
    session.status !== 'Proposta comercial pronta' &&
    session.status !== 'Finalizada'
  ) {
    throw new Error(
      `AI budget session "${input.sessionId}" must have a generated proposal draft before confirmation.`,
    );
  }

  const confirmedAt = (input.confirmedAt ?? new Date()).toISOString();
  const contactId = await resolveContactId(session, dependencies.contactCatalogCache);
  const proposalItems = await resolveProposalItems(
    session,
    dependencies.productCatalogCache,
  );
  const quote =
    Object.keys(existingBlingQuote).length > 0
      ? existingBlingQuote
      : preserveReferenceNumberIfNeeded(
          await persistQuote({
            session,
            confirmedAt,
            proposalDraft,
            contactId,
            proposalItems,
            blingQuoteReference,
            blingQuoteGateway: dependencies.blingQuoteGateway,
          }),
          blingQuoteReference,
        );

  const updatedSession: AiBudgetSessionRecord = {
    ...session,
    updatedAt: confirmedAt,
    status: 'Finalizada',
    payload: updateAiBudgetWorkflowState({
      ...payload,
      proposalDraft: {
        ...proposalDraft,
        confirmedAt,
      },
      proposalConfirmation: {
        confirmedAt,
        status: 'Finalizada',
        sentToBling: true,
      },
      blingQuote: quote,
      localResponse: updateLocalResponseStatus(payload, 'Finalizada'),
    },
    confirmedAt,
    {
      currentStage: 'proposal_confirmed',
      currentStageLabel: 'Proposta enviada ao Bling',
      confirmationCompletedAt: confirmedAt,
      finalSelectionsUpdatedAt: confirmedAt,
      availableData: {
        hasProposalDraft: true,
        hasFinalResolvedMaterials: proposalItems.length > 0,
        hasFinalResolvedCustomer: contactId.length > 0,
        hasConfirmation: true,
      },
    }),
  };

  await dependencies.aiBudgetSessionRepository.save(updatedSession);

  return {
    type: 'ai_budget_proposal_confirmed' as const,
    session: updatedSession,
    blingQuote: quote,
  };
}

async function persistQuote(input: {
  session: AiBudgetSessionRecord;
  confirmedAt: string;
  proposalDraft: Record<string, unknown>;
  contactId: string;
  proposalItems: Array<{ productId: string; quantity: number; value: number }>;
  blingQuoteReference: Record<string, unknown>;
  blingQuoteGateway: BlingQuoteGateway;
}) {
  const payload = {
    sourceConversationId: input.session.id,
    description:
      asString(input.proposalDraft.commercialBody) || input.session.originalText,
    introduction:
      asString(input.proposalDraft.commercialBody) || input.session.originalText,
    number: asString(input.blingQuoteReference.number) || null,
    contactId: input.contactId,
    items: input.proposalItems,
    requestedAt: new Date(input.confirmedAt),
  };
  const referenceId = asString(input.blingQuoteReference.id);

  if (referenceId) {
    return input.blingQuoteGateway.updateQuote(referenceId, payload);
  }

  return input.blingQuoteGateway.createQuote(payload);
}

function preserveReferenceNumberIfNeeded(
  quote: {
    id: string;
    number: string;
    sourceConversationId: string;
    description: string;
    createdAt: Date;
  },
  blingQuoteReference: Record<string, unknown>,
) {
  const referenceNumber = asString(blingQuoteReference.number);

  if (!referenceNumber) {
    return quote;
  }

  if (quote.number && quote.number !== '0') {
    return quote;
  }

  return {
    ...quote,
    number: referenceNumber,
  };
}

async function resolveContactId(
  session: AiBudgetSessionRecord,
  contactCatalogCache: BlingContactCatalogCache,
): Promise<string> {
  const payload = asRecord(session.payload);
  const finalResolvedCustomer = asRecord(payload.finalResolvedCustomer);
  const resolvedCustomer = asRecord(payload.resolvedCustomer);
  const aiContext = asRecord(payload.aiContext);
  const aiContextPayload = asRecord(aiContext.payload);
  const directFinalResolvedCustomerId = asString(finalResolvedCustomer.id);
  if (directFinalResolvedCustomerId) {
    return directFinalResolvedCustomerId;
  }
  const directResolvedCustomerId = asString(resolvedCustomer.id);

  if (directResolvedCustomerId) {
    return directResolvedCustomerId;
  }

  const customer = asRecord(aiContextPayload.customer);
  const contact = asRecord(customer.contact);
  const directContactId = asString(contact.id);

  if (directContactId) {
    return directContactId;
  }

  const catalog = await contactCatalogCache.read();
  const proposalDraft = asRecord(payload.proposalDraft);
  const proposalDraftReview = asRecord(payload.proposalDraftReview);
  const queryCandidates = [
    session.customerQuery,
    asString(proposalDraft.customerQuery),
    asString(asRecord(asRecord(payload.intakeExtraction).extraction).customerQuery),
    extractCustomerFromCommercialBody(asString(proposalDraft.commercialBody)),
    extractCustomerFromCommercialBody(
      asString(proposalDraftReview.suggestedCommercialBody),
    ),
  ]
    .map((value) => value?.trim() ?? '')
    .filter((value, index, list) => value.length > 0 && list.indexOf(value) === index);

  for (const query of queryCandidates) {
    const resolved = findBestContactId(query, catalog?.items ?? []);

    if (resolved) {
      return resolved;
    }
  }

  throw new Error(
    `AI budget session "${session.id}" does not have a resolved Bling contact. Review the customer before sending to Bling.`,
  );
}

function findBestContactId(
  query: string,
  contacts: Array<{
    id: string;
    name: string;
    code: string | null;
    documentNumber: string | null;
    phone: string | null;
    mobilePhone: string | null;
  }>,
): string | null {
  const normalizedQuery = normalizeText(query);
  const normalizedDigits = onlyDigits(query);

  if (!normalizedQuery && !normalizedDigits) {
    return null;
  }

  const exactMatch = contacts.find((contact) => {
    const normalizedName = normalizeText(contact.name);
    const normalizedCode = normalizeText(contact.code ?? '');

    if (
      normalizedQuery &&
      (normalizedName === normalizedQuery ||
        normalizedQuery.includes(normalizedName) ||
        normalizedName.includes(normalizedQuery) ||
        (normalizedCode && normalizedCode === normalizedQuery))
    ) {
      return true;
    }

    if (!normalizedDigits) {
      return false;
    }

    const contactDigits = onlyDigits(
      [
        contact.documentNumber,
        contact.phone,
        contact.mobilePhone,
      ]
        .filter(Boolean)
        .join(' '),
    );

    return contactDigits.includes(normalizedDigits);
  });

  if (exactMatch) {
    return exactMatch.id;
  }

  const queryTokens = extractRelevantTokens(normalizedQuery);

  if (queryTokens.length === 0) {
    return null;
  }

  let bestMatch: { id: string; score: number } | null = null;

  for (const contact of contacts) {
    const contactTokens = extractRelevantTokens(normalizeText(contact.name));

    if (contactTokens.length === 0) {
      continue;
    }

    const overlap = queryTokens.filter((token) => contactTokens.includes(token));
    const uniqueOverlap = [...new Set(overlap)];
    const score = uniqueOverlap.length;

    if (score < 2) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        id: contact.id,
        score,
      };
    }
  }

  return bestMatch?.id ?? null;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function extractRelevantTokens(value: string): string[] {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !IRRELEVANT_CONTACT_TOKENS.has(token))
    .filter((token, index, list) => list.indexOf(token) === index);
}

const IRRELEVANT_CONTACT_TOKENS = new Set([
  'cliente',
  'instalacao',
  'orcamento',
  'orcamento.',
  'servico',
  'servicos',
  'revisao',
  'ventilador',
  'teto',
  'refeitorio',
  'ltda',
  'comercio',
  'bebidas',
  'auto',
]);

function updateLocalResponseStatus(
  payload: Record<string, unknown>,
  status: string,
): Record<string, unknown> | null {
  const localResponse = asRecord(payload.localResponse);
  const response = asRecord(localResponse.response);

  if (Object.keys(localResponse).length === 0 || Object.keys(response).length === 0) {
    return localResponse;
  }

  return {
    ...localResponse,
    response: {
      ...response,
      status,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function resolveProposalItems(
  session: AiBudgetSessionRecord,
  productCatalogCache: BlingProductCatalogCache,
): Promise<Array<{ productId: string; quantity: number; value: number }>> {
  const payload = asRecord(session.payload);
  const interpretation = asRecord(asRecord(payload.aiResponse).interpretation);
  const proposalDraft = asRecord(payload.proposalDraft);
  const aiContextPayload = asRecord(asRecord(payload.aiContext).payload);
  const materialItems = Array.isArray(proposalDraft.materialItems)
    ? proposalDraft.materialItems
    : Array.isArray(interpretation.materialItems)
      ? interpretation.materialItems
      : [];
  const catalog = await productCatalogCache.read();
  const productsById = new Map(
    (catalog?.items ?? []).map((item) => [String(item.id), item]),
  );
  const finalResolvedMaterialItems = Array.isArray(payload.finalResolvedMaterialItems)
    ? payload.finalResolvedMaterialItems
    : [];
  const materialCandidatesByQuery = new Map(
    asMaterialCandidates(aiContextPayload.materialCandidates).map((item) => [
      item.query,
      item.candidates,
    ]),
  );
  const resolvedMaterialItemsSource =
    finalResolvedMaterialItems.length > 0 ? finalResolvedMaterialItems : materialItems;
  const resolvedMaterialItems = resolvedMaterialItemsSource
    .map((item) => asRecord(item))
    .map((item) => {
      const selectedProductId = asString(item.catalogItemId);
      const productId =
        selectedProductId && productsById.has(selectedProductId)
          ? selectedProductId
          : resolveProductIdForBlingItem(
              item,
              materialCandidatesByQuery,
            );
      const product = productsById.get(productId);
      const value =
        typeof product?.price === 'number' && Number.isFinite(product.price)
          ? product.price
          : null;

      if (!productId || value === null) {
        return null;
      }

      return {
        productId,
        quantity:
          typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0
            ? item.quantity
            : extractQuantity(asString(item.quantityText)),
        value,
      };
    })
    .filter(
      (
        item,
      ): item is {
        productId: string;
        quantity: number;
        value: number;
      } => Boolean(item),
    );

  const resolvedLaborItem = resolveLaborProposalItem(
    {
      ...interpretation,
      commercialBody: asString(proposalDraft.commercialBody),
    },
    catalog?.items ?? [],
  );

  return resolvedLaborItem
    ? [...resolvedMaterialItems, resolvedLaborItem]
    : resolvedMaterialItems;
}

function resolveProductIdForBlingItem(
  item: Record<string, unknown>,
  materialCandidatesByQuery: Map<
    string,
    Array<{
      id: string;
      name: string;
      code: string | null;
      price: number | null;
      costPrice: number | null;
      stockQuantity: number | null;
      type: string | null;
      status: string | null;
    }>
  >,
): string {
  const selectedId = asString(item.catalogItemId);
  const sourceQuery = asString(item.sourceQuery);
  const candidates = materialCandidatesByQuery.get(sourceQuery) ?? [];

  if (candidates.length === 0) {
    return selectedId;
  }

  const description = asString(item.description);
  const quantityText = asString(item.quantityText);
  const bestCandidate = candidates
    .map((candidate) => ({
      candidate,
      score: scoreBlingMaterialCandidate({
        description,
        sourceQuery,
        quantityText,
        candidateName: candidate.name,
      }),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (!bestCandidate || bestCandidate.score < 2) {
    return '';
  }

  return String(bestCandidate.candidate.id);
}

function extractQuantity(quantityText: string): number {
  const normalized = quantityText.replace(',', '.');
  const match = normalized.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    return 1;
  }

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return parsed;
}

function resolveLaborProposalItem(
  interpretation: Record<string, unknown>,
  products: Array<{
    id: string;
    name: string;
    price: number | null;
  }>,
): { productId: string; quantity: number; value: number } | null {
  const laborProduct = products.find((product) =>
    normalizeText(product.name).includes('mao de obra') &&
    normalizeText(product.name).includes('servicos diversos'),
  );

  if (!laborProduct) {
    return null;
  }

  const minimumLaborValue = resolveMinimumLaborValue(interpretation);

  if (minimumLaborValue <= 0) {
    return null;
  }

  const quantity = Math.max(1, Math.round(minimumLaborValue));
  const value =
    typeof laborProduct.price === 'number' && Number.isFinite(laborProduct.price)
      ? laborProduct.price
      : 1;

  return {
    productId: laborProduct.id,
    quantity,
    value,
  };
}

function resolveMinimumLaborValue(interpretation: Record<string, unknown>): number {
  const commercialBodyMinimum = resolveMinimumLaborValueFromCommercialBody(
    asString(asRecord(interpretation).commercialBody),
  );

  if (commercialBodyMinimum > 0) {
    return commercialBodyMinimum;
  }

  const serviceItems = Array.isArray(interpretation.serviceItems)
    ? interpretation.serviceItems
    : [];

  const serviceTotals = serviceItems
    .map((item) => asRecord(item))
    .map((item) => parseMinimumCurrencyValue(asString(item.estimatedValueText)))
    .filter((value) => value > 0);

  if (serviceTotals.length > 0) {
    return serviceTotals.reduce((sum, value) => sum + value, 0);
  }

  const laborPriceResearch = asRecord(interpretation.laborPriceResearch);
  return parseMinimumCurrencyValue(asString(laborPriceResearch.estimatedLaborRange));
}

function resolveMinimumLaborValueFromCommercialBody(commercialBody: string): number {
  if (!commercialBody) {
    return 0;
  }

  const lines = commercialBody.split('\n').map((line) => line.trim());
  const namedMinimumLine = lines.find((line) =>
    normalizeText(line).startsWith('soma minima da mao de obra:'),
  );

  if (namedMinimumLine) {
    const namedMinimum = parseMinimumCurrencyValue(namedMinimumLine);

    if (namedMinimum > 0) {
      return namedMinimum;
    }
  }

  const serviceLines: string[] = [];
  let inServicesSection = false;

  for (const line of lines) {
    if (/^Serviços contemplados:?$/i.test(line)) {
      inServicesSection = true;
      continue;
    }

    if (!inServicesSection) {
      continue;
    }

    if (/^[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ][^:]{0,80}:$/u.test(line)) {
      break;
    }

    if (line.startsWith('- ')) {
      serviceLines.push(line);
    }
  }

  if (serviceLines.length === 0) {
    return 0;
  }

  return serviceLines.reduce((sum, line) => {
    return sum + parseMinimumCurrencyValue(line);
  }, 0);
}

function parseMinimumCurrencyValue(valueText: string): number {
  const matches = valueText.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?/g);

  if (!matches || matches.length === 0) {
    return 0;
  }

  const values = matches
    .map((match) => Number(match.replace(/\./g, '').replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) {
    return 0;
  }

  return values[0] ?? 0;
}

function parseAverageCurrencyValue(valueText: string): number {
  const matches = valueText.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?/g);

  if (!matches || matches.length === 0) {
    return 0;
  }

  const values = matches
    .map((match) => Number(match.replace(/\./g, '').replace(',', '.')))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (values.length === 0) {
    return 0;
  }

  if (values.length === 1) {
    return values[0] ?? 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function scoreBlingMaterialCandidate(input: {
  description: string;
  sourceQuery: string;
  quantityText: string;
  candidateName: string;
}): number {
  const requestTokens = extractRelevantMaterialTokens(
    `${input.description} ${input.sourceQuery}`,
  );
  const candidateTokens = extractRelevantMaterialTokens(input.candidateName);
  const quantity = extractQuantity(input.quantityText);
  let score = 0;

  for (const token of requestTokens) {
    if (candidateTokens.includes(token)) {
      score += token.length >= 6 ? 3 : 2;
    }
  }

  const hasNumericHint = requestTokens.some(
    (token) => /\d/.test(token) && normalizeText(input.candidateName).includes(token),
  );

  if (hasNumericHint) {
    score += 2;
  }

  if (requestTokens.includes('bucha') && !candidateTokens.includes('bucha')) {
    score -= 6;
  }

  if (
    requestTokens.some((token) => token.startsWith('abrac')) &&
    !candidateTokens.some((token) => token.startsWith('abrac'))
  ) {
    score -= 6;
  }

  if (requestTokens.includes('parafuso') && !candidateTokens.includes('parafuso')) {
    score -= 4;
  }

  if (
    requestTokens.some((token) => token.startsWith('abrac')) &&
    ['organizar', 'fios', 'cabos', 'chicote', 'enrrolar'].some((token) =>
      candidateTokens.includes(token),
    )
  ) {
    score -= 10;
  }

  if (
    quantity <= 50 &&
    /\b(50|100|500|1000)\b/.test(normalizeText(input.candidateName)) &&
    /kit|pacote/.test(normalizeText(input.candidateName))
  ) {
    score -= 8;
  }

  if (
    quantity <= 50 &&
    /\b(50|100|500|1000)\b/.test(normalizeText(input.candidateName)) &&
    requestTokens.some((token) =>
      token === 'bucha' || token === 'parafuso' || token.startsWith('abrac'),
    )
  ) {
    score -= 6;
  }

  return score;
}

function extractRelevantMaterialTokens(value: string): string[] {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !IRRELEVANT_MATERIAL_TOKENS.has(token))
    .filter((token, index, list) => list.indexOf(token) === index);
}

const IRRELEVANT_MATERIAL_TOKENS = new Set([
  'de',
  'da',
  'do',
  'dos',
  'das',
  'para',
  'com',
  'sem',
  'tipo',
  'fixacao',
  'fixacaoo',
  'fixacaoes',
  'fixacaoe',
  'unidade',
  'unidades',
  'peca',
  'pecas',
  'servico',
  'servicos',
]);

function asMaterialCandidates(
  value: unknown,
): Array<{
  query: string;
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
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .map((item) => ({
      query: asString(item.query),
      candidates: Array.isArray(item.candidates)
        ? item.candidates
            .map((candidate) => asRecord(candidate))
            .map((candidate) => ({
              id: asString(candidate.id),
              name: asString(candidate.name),
              code: asNullableString(candidate.code),
              price: asNullableNumber(candidate.price),
              costPrice: asNullableNumber(candidate.costPrice),
              stockQuantity: asNullableNumber(candidate.stockQuantity),
              type: asNullableString(candidate.type),
              status: asNullableString(candidate.status),
            }))
            .filter((candidate) => candidate.id.length > 0 && candidate.name.length > 0)
        : [],
    }))
    .filter((item) => item.query.length > 0 && item.candidates.length > 0);
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
