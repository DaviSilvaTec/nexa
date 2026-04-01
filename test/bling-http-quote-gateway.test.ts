import test from 'node:test';
import assert from 'node:assert/strict';

import { BlingHttpQuoteGateway } from '../src/infrastructure/integrations/bling/bling-http-quote-gateway';

test('lists commercial proposals using the Bling HTTP gateway contract', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const gateway = new BlingHttpQuoteGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'access-token-1',
    fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;

      return new Response(
        JSON.stringify({
          data: [
            {
              id: 101,
              data: '2026-03-20',
              situacao: 'Aprovado',
              total: 4200.5,
              totalProdutos: 3100,
              numero: 87,
              contato: {
                id: 999,
              },
              loja: {
                id: 5,
              },
            },
            {
              id: 102,
              data: '2026-03-21',
              situacao: 'Pendente',
              total: 980,
              totalProdutos: 400,
              numero: 88,
              contato: {
                id: 1000,
              },
              loja: {
                id: 5,
              },
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

  const result = await gateway.listQuotes({
    limit: 20,
    page: 2,
    situation: 'Aprovado,Pendente',
    contactId: '999',
    dateFrom: '2026-03-01',
    dateTo: '2026-03-31',
  });

  assert.equal(
    capturedUrl,
    'https://api.bling.com.br/Api/v3/propostas-comerciais?limite=20&pagina=2&situacao=Aprovado%2CPendente&idContato=999&dataInicial=2026-03-01&dataFinal=2026-03-31',
  );
  assert.equal(capturedInit?.method, 'GET');
  assert.equal(
    (capturedInit?.headers as Headers).get('Authorization'),
    'Bearer access-token-1',
  );
  assert.deepEqual(result, {
    items: [
      {
        id: '101',
        date: '2026-03-20',
        status: 'Aprovado',
        total: 4200.5,
        productsTotal: 3100,
        number: '87',
        contactId: '999',
        storeId: '5',
      },
      {
        id: '102',
        date: '2026-03-21',
        status: 'Pendente',
        total: 980,
        productsTotal: 400,
        number: '88',
        contactId: '1000',
        storeId: '5',
      },
    ],
    total: 2,
  });
});

test('creates a quote using the Bling HTTP gateway contract', async () => {
  const capturedCalls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const gateway = new BlingHttpQuoteGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'test-token',
    fetchImpl: async (url, init) => {
      capturedCalls.push({
        url: String(url),
        init,
      });

      if (capturedCalls.length === 1) {
        return new Response(
          JSON.stringify({
            data: {
              id: 'bling-quote-42',
            },
          }),
          {
            status: 201,
            headers: {
              'content-type': 'application/json',
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            numero: '2042',
          },
        }),
        {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  const quote = await gateway.createQuote({
    sourceConversationId: 'conv-1',
    description: 'Instalacao de refletores e revisao de fiacao.',
    introduction: 'Texto comercial final.',
    contactId: 'contact-1',
    items: [
      {
        productId: 'product-1',
        quantity: 2,
        value: 80,
      },
    ],
    requestedAt: new Date('2026-03-30T19:00:00.000Z'),
  });

  assert.equal(capturedCalls[0]?.url, 'https://api.bling.com.br/Api/v3/propostas-comerciais');
  assert.equal(capturedCalls[0]?.init?.method, 'POST');
  assert.equal(capturedCalls[0]?.init?.headers instanceof Headers, true);
  assert.equal(
    (capturedCalls[0]?.init?.headers as Headers).get('Authorization'),
    'Bearer test-token',
  );
  assert.equal(
    (capturedCalls[0]?.init?.headers as Headers).get('Content-Type'),
    'application/json',
  );

  const parsedBody = JSON.parse(String(capturedCalls[0]?.init?.body));
  assert.deepEqual(parsedBody, {
    contato: {
      id: 'contact-1',
    },
    introducao: 'Texto comercial final.',
    observacoes: '',
    itens: [
      {
        produto: {
          id: 'product-1',
        },
        quantidade: 2,
        valor: 80,
      },
    ],
  });
  assert.equal(
    capturedCalls[1]?.url,
    'https://api.bling.com.br/Api/v3/propostas-comerciais/bling-quote-42',
  );
  assert.equal(capturedCalls[1]?.init?.method, 'GET');

  assert.deepEqual(quote, {
    id: 'bling-quote-42',
    number: '2042',
    sourceConversationId: 'conv-1',
    description: 'Instalacao de refletores e revisao de fiacao.',
    createdAt: new Date('2026-03-30T19:00:00.000Z'),
  });
});

test('throws a descriptive error when Bling returns a non-success status', async () => {
  const gateway = new BlingHttpQuoteGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'test-token',
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: { message: 'invalid payload' } }), {
        status: 422,
        headers: {
          'content-type': 'application/json',
        },
      }),
  });

  await assert.rejects(
    () =>
      gateway.createQuote({
        sourceConversationId: 'conv-1',
        description: 'Instalacao de refletores e revisao de fiacao.',
        contactId: 'contact-1',
        requestedAt: new Date('2026-03-30T19:00:00.000Z'),
      }),
    /bling quote creation failed/i,
  );
});

test('updates a quote using the Bling HTTP gateway contract', async () => {
  const capturedCalls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const gateway = new BlingHttpQuoteGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'test-token',
    fetchImpl: async (url, init) => {
      capturedCalls.push({
        url: String(url),
        init,
      });

      if (capturedCalls.length === 1) {
        return new Response(null, {
          status: 204,
        });
      }

      return new Response(JSON.stringify({ data: { numero: '2042' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    },
  });

  const quote = await gateway.updateQuote('bling-quote-42', {
    sourceConversationId: 'conv-2',
    description: 'Texto atualizado',
    introduction: 'Texto atualizado',
    number: '2042',
    contactId: 'contact-1',
    items: [],
    requestedAt: new Date('2026-03-30T20:00:00.000Z'),
  });

  assert.equal(
    capturedCalls[0]?.url,
    'https://api.bling.com.br/Api/v3/propostas-comerciais/bling-quote-42',
  );
  assert.equal(capturedCalls[0]?.init?.method, 'PUT');
  assert.equal(
    capturedCalls[1]?.url,
    'https://api.bling.com.br/Api/v3/propostas-comerciais/bling-quote-42',
  );
  assert.deepEqual(JSON.parse(String(capturedCalls[0]?.init?.body)), {
    numero: 2042,
    contato: {
      id: 'contact-1',
    },
    introducao: 'Texto atualizado',
    observacoes: '',
    itens: [],
  });
  assert.equal(quote.id, 'bling-quote-42');
  assert.equal(quote.number, '2042');
});

test('corrects the Bling sequence when a new proposal is created with number 0', async () => {
  const capturedCalls: Array<{ url: string; init: RequestInit | undefined }> = [];

  const gateway = new BlingHttpQuoteGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'test-token',
    fetchImpl: async (url, init) => {
      capturedCalls.push({
        url: String(url),
        init,
      });

      if (capturedCalls.length === 1) {
        return new Response(JSON.stringify({ data: { id: 'bling-quote-77' } }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      if (capturedCalls.length === 2) {
        return new Response(JSON.stringify({ data: { numero: '0' } }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        });
      }

      if (capturedCalls.length === 3) {
        return new Response(
          JSON.stringify({
            data: [
              { id: 1, numero: 101, data: '2026-03-30', situacao: 'Rascunho', total: 0, totalProdutos: 0 },
              { id: 2, numero: 104, data: '2026-03-31', situacao: 'Rascunho', total: 0, totalProdutos: 0 },
              { id: 3, numero: 0, data: '2026-03-31', situacao: 'Rascunho', total: 0, totalProdutos: 0 },
            ],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        );
      }

      if (capturedCalls.length === 4) {
        return new Response(null, {
          status: 204,
        });
      }

      return new Response(JSON.stringify({ data: { numero: '105' } }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    },
  });

  const quote = await gateway.createQuote({
    sourceConversationId: 'conv-3',
    description: 'Texto teste',
    introduction: 'Texto teste',
    contactId: 'contact-1',
    items: [],
    requestedAt: new Date('2026-03-31T21:00:00.000Z'),
  });

  assert.equal(capturedCalls[2]?.url, 'https://api.bling.com.br/Api/v3/propostas-comerciais?limite=50');
  assert.equal(capturedCalls[3]?.init?.method, 'PUT');
  assert.deepEqual(JSON.parse(String(capturedCalls[3]?.init?.body)), {
    numero: 105,
    contato: {
      id: 'contact-1',
    },
    introducao: 'Texto teste',
    observacoes: '',
    itens: [],
  });
  assert.equal(quote.id, 'bling-quote-77');
  assert.equal(quote.number, '105');
});

test('times out quote creation when Bling does not respond', async () => {
  const gateway = new BlingHttpQuoteGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'test-token',
    timeoutMs: 10,
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;

        signal?.addEventListener('abort', () => {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
  });

  await assert.rejects(
    () =>
      gateway.createQuote({
        sourceConversationId: 'conv-1',
        description: 'Instalacao de refletores e revisao de fiacao.',
        contactId: 'contact-1',
        requestedAt: new Date('2026-03-30T19:00:00.000Z'),
      }),
    /timed out/i,
  );
});
