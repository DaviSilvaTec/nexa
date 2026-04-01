import type { BlingProductSummary } from '../gateways/bling-product-gateway';

export interface CachedBlingProductCatalog {
  syncedAt: string;
  items: BlingProductSummary[];
}

export interface BlingProductCatalogCache {
  read(): Promise<CachedBlingProductCatalog | null>;
  write(catalog: CachedBlingProductCatalog): Promise<void>;
}
