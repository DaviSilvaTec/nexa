import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../catalog/bling-service-note-history-cache';
import { searchLocalCommercialHistory } from './search-local-commercial-history';
import { searchLocalProductCatalog } from './search-local-product-catalog';

interface BuildLocalBudgetContextInput {
  customerQuery: string;
  materialQueries: string[];
  materialLimitPerQuery?: number;
  quoteLimitPerContact?: number;
}

interface BuildLocalBudgetContextDependencies {
  contactCatalogCache: BlingContactCatalogCache;
  productCatalogCache: BlingProductCatalogCache;
  quoteHistoryCache: BlingQuoteHistoryCache;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
}

type BuildLocalBudgetContextResult = {
  type: 'local_budget_context_built';
  customer:
    | {
        contact: {
          id: string;
          name: string;
          code: string | null;
          status: string | null;
          documentNumber: string | null;
          phone: string | null;
          mobilePhone: string | null;
        };
        quotes: Array<{
          id: string;
          date: string | null;
          status: string | null;
          total: number | null;
          productsTotal: number | null;
          number: string | null;
          contactId: string | null;
          storeId: string | null;
        }>;
        serviceNotes: Array<{
          id: string;
          number: string | null;
          rpsNumber: string | null;
          series: string | null;
          status: number | null;
          issueDate: string | null;
          value: number | null;
          contactId: string | null;
          contactName: string | null;
          contactDocument: string | null;
          contactEmail: string | null;
          link: string | null;
          verificationCode: string | null;
        }>;
        summary: {
          quoteCount: number;
          serviceNoteCount: number;
          latestQuoteDate: string | null;
          latestServiceNoteDate: string | null;
        };
      }
    | null;
  materials: Array<{
    query: string;
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
    totalMatches: number;
  }>;
};

export async function buildLocalBudgetContext(
  input: BuildLocalBudgetContextInput,
  dependencies: BuildLocalBudgetContextDependencies,
): Promise<BuildLocalBudgetContextResult> {
  const customerHistory = await searchLocalCommercialHistory(
    {
      query: input.customerQuery,
      quoteLimitPerContact: input.quoteLimitPerContact ?? 3,
    },
    {
      contactCatalogCache: dependencies.contactCatalogCache,
      quoteHistoryCache: dependencies.quoteHistoryCache,
      serviceNoteHistoryCache: dependencies.serviceNoteHistoryCache,
    },
  );

  const materials = await Promise.all(
    input.materialQueries.map(async (query) => {
      const result = await searchLocalProductCatalog(
        {
          query,
          limit: input.materialLimitPerQuery ?? 5,
        },
        {
          productCatalogCache: dependencies.productCatalogCache,
        },
      );

      return {
        query,
        matches: result.products.items,
        totalMatches: result.products.totalMatches,
      };
    }),
  );

  return {
    type: 'local_budget_context_built',
    customer: customerHistory.matches[0] ?? null,
    materials,
  };
}
