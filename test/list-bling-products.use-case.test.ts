import test from 'node:test';
import assert from 'node:assert/strict';

import { listBlingProducts } from '../src/application/use-cases/list-bling-products';

class FakeBlingProductGateway {
  async listProducts(input: { search?: string; limit: number }) {
    return {
      items: [
        {
          id: 'prod-1',
          name: 'Refletor LED 100W',
          code: 'REF100',
          price: 120,
          costPrice: 90,
          stockQuantity: 4,
          type: 'P',
          status: 'A',
        },
        {
          id: 'prod-2',
          name: 'Cabo PP 2x1,5mm',
          code: 'CABO215',
          price: 8.5,
          costPrice: 5.2,
          stockQuantity: 12,
          type: 'P',
          status: 'A',
        },
      ],
      total: 2,
      appliedSearch: input.search ?? null,
    };
  }
}

test('lists products from the bling product gateway', async () => {
  const result = await listBlingProducts(
    {
      search: 'refletor',
      limit: 20,
    },
    {
      blingProductGateway: new FakeBlingProductGateway(),
    },
  );

  assert.equal(result.type, 'bling_products_listed');
  assert.equal(result.products.items.length, 2);
  assert.equal(result.products.appliedSearch, 'refletor');
});
