import type {
  AiBudgetSessionRecord,
  AiBudgetSessionRepository,
} from '../repositories/ai-budget-session-repository';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import { calculateMaterialFinancialSummary } from './calculate-material-financial-summary';

interface GenerateAiBudgetProposalDraftInput {
  sessionId: string;
  generatedAt?: Date;
}

interface GenerateAiBudgetProposalDraftDependencies {
  aiBudgetSessionRepository: AiBudgetSessionRepository;
  productCatalogCache: BlingProductCatalogCache;
}

interface ProposalDraftSectionItem {
  description: string;
  quantityText?: string;
  catalogItemId?: string | null;
  catalogItemName?: string | null;
}

interface GeneratedProposalDraft {
  generatedAt: string;
  title: string;
  customerQuery: string | null;
  resolvedCustomer: {
    id: string;
    name: string;
    code: string | null;
    documentNumber: string | null;
    phone: string | null;
    mobilePhone: string | null;
  } | null;
  budgetDescription: string;
  workDescription: string;
  materialItems: ProposalDraftSectionItem[];
  serviceItems: ProposalDraftSectionItem[];
  pointsOfAttention: string[];
  commercialBody: string;
  financialSummary: {
    saleTotal: number;
    costTotal: number;
    grossProfit: number;
  };
}

export async function generateAiBudgetProposalDraft(
  input: GenerateAiBudgetProposalDraftInput,
  dependencies: GenerateAiBudgetProposalDraftDependencies,
) {
  const session = await dependencies.aiBudgetSessionRepository.findById(
    input.sessionId,
  );

  if (!session) {
    throw new Error(`AI budget session "${input.sessionId}" was not found.`);
  }

  if (session.status !== 'Aprovado para proposta' && session.status !== 'Proposta comercial pronta') {
    throw new Error(
      `AI budget session "${input.sessionId}" must be approved before generating a proposal draft.`,
    );
  }

  const generatedAt = (input.generatedAt ?? new Date()).toISOString();
  const productCatalog = await dependencies.productCatalogCache.read();
  const proposalDraft = buildProposalDraft(
    session,
    generatedAt,
    productCatalog?.items ?? [],
  );
  const updatedSession: AiBudgetSessionRecord = {
    ...session,
    updatedAt: generatedAt,
    status: 'Proposta comercial pronta',
    payload: {
      ...asRecord(session.payload),
      proposalDraft,
      localResponse: updateLocalResponseStatus(session.payload, 'Proposta comercial pronta'),
    },
  };

  await dependencies.aiBudgetSessionRepository.save(updatedSession);

  return {
    type: 'ai_budget_proposal_draft_generated' as const,
    session: updatedSession,
    proposalDraft,
  };
}

function buildProposalDraft(
  session: AiBudgetSessionRecord,
  generatedAt: string,
  products: Array<{
    id: string;
    name: string;
    code: string | null;
    price: number | null;
    costPrice: number | null;
    stockQuantity: number | null;
    type: string | null;
    status: string | null;
  }>,
): GeneratedProposalDraft {
  const payload = asRecord(session.payload);
  const interpretation = asRecord(asRecord(payload.aiResponse)?.interpretation);
  const localResponse = asRecord(asRecord(payload.localResponse)?.response);

  const budgetDescription = asString(interpretation?.budgetDescription);
  const workDescription = asString(interpretation?.workDescription);
  const materialItems = asSectionItems(interpretation?.materialItems);
  const serviceItems = asSectionItems(interpretation?.serviceItems);
  const pointsOfAttention = asStringList(interpretation?.pointsOfAttention);
  const resolvedCustomer = asResolvedCustomer(payload.resolvedCustomer);
  const derivedFinancialSummary = calculateMaterialFinancialSummary({
    materialItems,
    products,
  });
  const fallbackFinancialSummary = {
    saleTotal: asNumber(asRecord(localResponse?.financialSummary)?.saleTotal),
    costTotal: asNumber(asRecord(localResponse?.financialSummary)?.costTotal),
    grossProfit: asNumber(asRecord(localResponse?.financialSummary)?.grossProfit),
  };
  const financialSummary =
    derivedFinancialSummary.itemsWithCompleteBase > 0
      || derivedFinancialSummary.saleTotal > 0
      || derivedFinancialSummary.costTotal > 0
      ? {
          saleTotal: derivedFinancialSummary.saleTotal,
          costTotal: derivedFinancialSummary.costTotal,
          grossProfit: derivedFinancialSummary.grossProfit,
        }
      : fallbackFinancialSummary;

  return {
    generatedAt,
    title: `Proposta comercial - ${resolvedCustomer?.name ?? session.customerQuery ?? 'Cliente não identificado'}`,
    customerQuery: session.customerQuery,
    resolvedCustomer,
    budgetDescription,
    workDescription,
    materialItems,
    serviceItems,
    pointsOfAttention,
    commercialBody: buildCommercialBody({
      customerQuery: resolvedCustomer?.name ?? session.customerQuery,
      budgetDescription,
      workDescription,
      materialItems,
      serviceItems,
    }),
    financialSummary,
  };
}

function buildCommercialBody(input: {
  customerQuery: string | null;
  budgetDescription: string;
  workDescription: string;
  materialItems: ProposalDraftSectionItem[];
  serviceItems: ProposalDraftSectionItem[];
}): string {
  const lines = [
    `Cliente: ${input.customerQuery ?? 'Não identificado'}`,
    '',
    'Descrição principal:',
    input.budgetDescription || 'Descrição comercial a revisar.',
    '',
    'Escopo do serviço:',
    input.workDescription || 'Escopo técnico a revisar.',
  ];

  if (input.materialItems.length > 0) {
    lines.push('', 'Materiais previstos:');
    lines.push(
      ...input.materialItems.map((item) =>
        `- ${item.description}${item.quantityText ? ` (${item.quantityText})` : ''}`,
      ),
    );
  }

  if (input.serviceItems.length > 0) {
    lines.push('', 'Serviços contemplados:');
    lines.push(
      ...input.serviceItems.map((item) =>
        `- ${item.description}${item.quantityText ? ` (${item.quantityText})` : ''}`,
      ),
    );
  }

  return lines.join('\n').trim();
}

function updateLocalResponseStatus(payload: unknown, status: string): Record<string, unknown> | null {
  const root = asRecord(payload);
  const localResponse = asRecord(root?.localResponse);
  const response = asRecord(localResponse?.response);

  if (!localResponse || !response) {
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

function asSectionItems(value: unknown): ProposalDraftSectionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      description: asString(item.description),
      ...(asString(item.quantityText) ? { quantityText: asString(item.quantityText) } : {}),
      ...(nullableString(item.catalogItemId) ? { catalogItemId: nullableString(item.catalogItemId) } : {}),
      ...(nullableString(item.catalogItemName) ? { catalogItemName: nullableString(item.catalogItemName) } : {}),
    }))
    .filter((item) => item.description.length > 0);
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => asString(item)).filter((item) => item.length > 0);
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

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asResolvedCustomer(value: unknown): GeneratedProposalDraft['resolvedCustomer'] {
  const record = asRecord(value);
  const id = asString(record.id);
  const name = asString(record.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    code: nullableString(record.code),
    documentNumber: nullableString(record.documentNumber),
    phone: nullableString(record.phone),
    mobilePhone: nullableString(record.mobilePhone),
  };
}

function nullableString(value: unknown): string | null {
  const normalized = asString(value);
  return normalized || null;
}
