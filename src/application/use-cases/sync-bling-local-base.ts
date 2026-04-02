import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../catalog/bling-service-note-history-cache';
import type { BlingContactGateway } from '../gateways/bling-contact-gateway';
import type { BlingProductGateway } from '../gateways/bling-product-gateway';
import type { BlingQuoteGateway } from '../gateways/bling-quote-gateway';
import type { BlingServiceNoteGateway } from '../gateways/bling-service-note-gateway';
import { getBlingContactCatalog } from './get-bling-contact-catalog';
import { getBlingLocalBaseStatus } from './get-bling-local-base-status';
import { getBlingProductCatalog } from './get-bling-product-catalog';
import { getBlingQuoteHistory } from './get-bling-quote-history';
import { getBlingServiceNoteHistory } from './get-bling-service-note-history';

interface SyncBlingLocalBaseInput {
  now: Date;
  forceRefresh?: boolean;
  productPageSize?: number;
  contactPageSize?: number;
  quotePageSize?: number;
  serviceNotePageSize?: number;
  productPageDelayMs?: number;
  contactPageDelayMs?: number;
  quotePageDelayMs?: number;
  serviceNotePageDelayMs?: number;
  sectionDelayMs?: number;
}

interface SyncBlingLocalBaseDependencies {
  blingProductGateway: BlingProductGateway;
  blingContactGateway: BlingContactGateway;
  blingQuoteGateway: BlingQuoteGateway;
  blingServiceNoteGateway: BlingServiceNoteGateway;
  productCatalogCache: BlingProductCatalogCache;
  contactCatalogCache: BlingContactCatalogCache;
  quoteHistoryCache: BlingQuoteHistoryCache;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
}

export async function syncBlingLocalBase(
  input: SyncBlingLocalBaseInput,
  dependencies: SyncBlingLocalBaseDependencies,
) {
  const wait = defaultWait;
  const sectionDelayMs = input.sectionDelayMs ?? 500;

  const products = await getBlingProductCatalog(
    {
      now: input.now,
      pageSize: input.productPageSize ?? 100,
      pageDelayMs: input.productPageDelayMs ?? 400,
      ...(input.forceRefresh !== undefined
        ? { forceRefresh: input.forceRefresh }
        : {}),
    },
    {
      blingProductGateway: dependencies.blingProductGateway,
      catalogCache: dependencies.productCatalogCache,
      wait,
    },
  );

  await wait(sectionDelayMs);

  const contacts = await getBlingContactCatalog(
    {
      now: input.now,
      pageSize: input.contactPageSize ?? 100,
      pageDelayMs: input.contactPageDelayMs ?? 500,
      ...(input.forceRefresh !== undefined
        ? { forceRefresh: input.forceRefresh }
        : {}),
    },
    {
      blingContactGateway: dependencies.blingContactGateway,
      contactCatalogCache: dependencies.contactCatalogCache,
      wait,
    },
  );

  await wait(sectionDelayMs);

  const quotes = await getBlingQuoteHistory(
    {
      now: input.now,
      pageSize: input.quotePageSize ?? 100,
      pageDelayMs: input.quotePageDelayMs ?? 500,
      ...(input.forceRefresh !== undefined
        ? { forceRefresh: input.forceRefresh }
        : {}),
    },
    {
      blingQuoteGateway: dependencies.blingQuoteGateway,
      quoteHistoryCache: dependencies.quoteHistoryCache,
      wait,
    },
  );

  await wait(sectionDelayMs);

  const serviceNotes = await getBlingServiceNoteHistory(
    {
      now: input.now,
      pageSize: input.serviceNotePageSize ?? 100,
      pageDelayMs: input.serviceNotePageDelayMs ?? 500,
      ...(input.forceRefresh !== undefined
        ? { forceRefresh: input.forceRefresh }
        : {}),
    },
    {
      blingServiceNoteGateway: dependencies.blingServiceNoteGateway,
      serviceNoteHistoryCache: dependencies.serviceNoteHistoryCache,
      wait,
    },
  );

  const status = await getBlingLocalBaseStatus(
    { now: input.now },
    {
      productCatalogCache: dependencies.productCatalogCache,
      contactCatalogCache: dependencies.contactCatalogCache,
      quoteHistoryCache: dependencies.quoteHistoryCache,
      serviceNoteHistoryCache: dependencies.serviceNoteHistoryCache,
    },
  );

  return {
    type: 'bling_local_base_synced' as const,
    syncStatus: status.syncStatus,
    sources: {
      products: products.catalog.source,
      contacts: contacts.catalog.source,
      quotes: quotes.history.source,
      serviceNotes: serviceNotes.history.source,
    },
  };
}

async function defaultWait(delayMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
