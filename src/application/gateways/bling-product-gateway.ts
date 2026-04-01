export interface BlingProductSummary {
  id: string;
  name: string;
  code: string | null;
  price: number | null;
  costPrice: number | null;
  stockQuantity: number | null;
  type: string | null;
  status: string | null;
}

export interface BlingProductList {
  items: BlingProductSummary[];
  total: number;
  appliedSearch: string | null;
}

export interface BlingProductGateway {
  listProducts(input: {
    search?: string;
    limit: number;
    page?: number;
  }): Promise<BlingProductList>;
}
