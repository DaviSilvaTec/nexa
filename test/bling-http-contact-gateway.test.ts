import test from 'node:test';
import assert from 'node:assert/strict';

import { BlingHttpContactGateway } from '../src/infrastructure/integrations/bling/bling-http-contact-gateway';

test('lists contacts using the Bling HTTP gateway contract', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const gateway = new BlingHttpContactGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'access-token-1',
    fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;

      return new Response(
        JSON.stringify({
          data: [
            {
              id: 999,
              nome: 'Cliente Exemplo Ltda',
              codigo: 'CLI001',
              situacao: 'A',
              numeroDocumento: '12345678000199',
              telefone: '(16) 3000-0000',
              celular: '(16) 99999-0000',
            },
            {
              id: 1000,
              nome: 'Outro Cliente',
              codigo: null,
              situacao: 'I',
              numeroDocumento: '98765432000188',
              telefone: null,
              celular: '(16) 98888-1111',
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

  const result = await gateway.listContacts({
    limit: 20,
    page: 2,
    search: 'cliente',
    criterion: 1,
    documentNumber: '12345678000199',
    personType: 2,
  });

  assert.equal(
    capturedUrl,
    'https://api.bling.com.br/Api/v3/contatos?limite=20&pagina=2&pesquisa=cliente&criterio=1&numeroDocumento=12345678000199&tipoPessoa=2',
  );
  assert.equal(capturedInit?.method, 'GET');
  assert.equal(
    (capturedInit?.headers as Headers).get('Authorization'),
    'Bearer access-token-1',
  );
  assert.deepEqual(result, {
    items: [
      {
        id: '999',
        name: 'Cliente Exemplo Ltda',
        code: 'CLI001',
        status: 'A',
        documentNumber: '12345678000199',
        phone: '(16) 3000-0000',
        mobilePhone: '(16) 99999-0000',
      },
      {
        id: '1000',
        name: 'Outro Cliente',
        code: null,
        status: 'I',
        documentNumber: '98765432000188',
        phone: null,
        mobilePhone: '(16) 98888-1111',
      },
    ],
    total: 2,
  });
});
