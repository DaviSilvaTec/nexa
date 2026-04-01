import type { BlingContactSummary } from '../gateways/bling-contact-gateway';

export interface CachedBlingContactCatalog {
  syncedAt: string;
  items: BlingContactSummary[];
}

export interface BlingContactCatalogCache {
  read(): Promise<CachedBlingContactCatalog | null>;
  write(catalog: CachedBlingContactCatalog): Promise<void>;
}
