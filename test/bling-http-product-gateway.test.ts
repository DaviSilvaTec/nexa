import test from 'node:test';
import assert from 'node:assert/strict';

import { BlingHttpProductGateway } from '../src/infrastructure/integrations/bling/bling-http-product-gateway';

test('lists products using the Bling HTTP gateway contract', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const gateway = new BlingHttpProductGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'access-token-1',
    fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;

      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'prod-1',
              nome: 'Refletor LED 100W',
              codigo: 'REF100',
              preco: 120,
              precoCusto: 90,
              estoque: {
                saldoVirtualTotal: 4,
              },
              tipo: 'P',
              situacao: 'A',
            },
            {
              id: 'prod-2',
              nome: 'Cabo PP 2x1,5mm',
              codigo: 'CABO215',
              preco: 8.5,
              precoCusto: 5.2,
              estoque: {
                saldoVirtualTotal: 12,
              },
              tipo: 'P',
              situacao: 'A',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  const result = await gateway.listProducts({
    search: 'refletor',
    limit: 20,
  });

  assert.equal(
    capturedUrl,
    'https://api.bling.com.br/Api/v3/produtos?limite=20&pesquisa=refletor',
  );
  assert.equal(capturedInit?.method, 'GET');
  assert.equal(
    (capturedInit?.headers as Headers).get('Authorization'),
    'Bearer access-token-1',
  );
  assert.deepEqual(result, {
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
    appliedSearch: 'refletor',
  });
});
