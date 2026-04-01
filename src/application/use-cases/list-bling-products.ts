import type {
  BlingProductGateway,
  BlingProductList,
} from '../gateways/bling-product-gateway';

interface ListBlingProductsInput {
  search?: string;
  limit: number;
}

interface ListBlingProductsDependencies {
  blingProductGateway: BlingProductGateway;
}

type ListBlingProductsResult = {
  type: 'bling_products_listed';
  products: BlingProductList;
};

export async function listBlingProducts(
  input: ListBlingProductsInput,
  dependencies: ListBlingProductsDependencies,
): Promise<ListBlingProductsResult> {
  const products = await dependencies.blingProductGateway.listProducts({
    ...(input.search ? { search: input.search } : {}),
    limit: input.limit,
  });

  return {
    type: 'bling_products_listed',
    products,
  };
}
