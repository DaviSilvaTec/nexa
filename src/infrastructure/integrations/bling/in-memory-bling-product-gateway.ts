import type {
  BlingProductGateway,
  BlingProductList,
} from '../../../application/gateways/bling-product-gateway';

export class InMemoryBlingProductGateway implements BlingProductGateway {
  async listProducts(input: {
    search?: string;
    limit: number;
    page?: number;
  }): Promise<BlingProductList> {
    return {
      items: [],
      total: 0,
      appliedSearch: input.search ?? null,
    };
  }
}
