import test from 'node:test';
import assert from 'node:assert/strict';

import { BlingHttpServiceNoteGateway } from '../src/infrastructure/integrations/bling/bling-http-service-note-gateway';

test('lists service notes using the Bling HTTP gateway contract', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const gateway = new BlingHttpServiceNoteGateway({
    baseUrl: 'https://api.bling.com.br/Api/v3',
    accessToken: 'access-token-1',
    fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;

      return new Response(
        JSON.stringify({
          data: [
            {
              id: 501,
              numero: '123',
              numeroRPS: '32',
              serie: '1',
              situacao: 1,
              dataEmissao: '2026-03-10',
              valor: 1800,
              contato: {
                id: 999,
                nome: 'Cliente Exemplo',
                numeroDocumento: '12345678000199',
                email: 'cliente@example.com',
              },
              link: 'https://bling.example/nfse/501',
              codigoVerificacao: 'ABC123',
            },
            {
              id: 502,
              numero: '124',
              numeroRPS: '33',
              serie: '1',
              situacao: 3,
              dataEmissao: '2026-03-11',
              valor: 950,
              contato: {
                id: 1000,
                nome: 'Outro Cliente',
                numeroDocumento: '98765432000188',
                email: 'outro@example.com',
              },
              link: null,
              codigoVerificacao: null,
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

  const result = await gateway.listServiceNotes({
    limit: 20,
    page: 2,
    situation: 1,
    issueDateFrom: '2026-03-01',
    issueDateTo: '2026-03-31',
  });

  assert.equal(
    capturedUrl,
    'https://api.bling.com.br/Api/v3/nfse?limite=20&pagina=2&situacao=1&dataEmissaoInicial=2026-03-01&dataEmissaoFinal=2026-03-31',
  );
  assert.equal(capturedInit?.method, 'GET');
  assert.equal(
    (capturedInit?.headers as Headers).get('Authorization'),
    'Bearer access-token-1',
  );
  assert.deepEqual(result, {
    items: [
      {
        id: '501',
        number: '123',
        rpsNumber: '32',
        series: '1',
        status: 1,
        issueDate: '2026-03-10',
        value: 1800,
        contactId: '999',
        contactName: 'Cliente Exemplo',
        contactDocument: '12345678000199',
        contactEmail: 'cliente@example.com',
        link: 'https://bling.example/nfse/501',
        verificationCode: 'ABC123',
      },
      {
        id: '502',
        number: '124',
        rpsNumber: '33',
        series: '1',
        status: 3,
        issueDate: '2026-03-11',
        value: 950,
        contactId: '1000',
        contactName: 'Outro Cliente',
        contactDocument: '98765432000188',
        contactEmail: 'outro@example.com',
        link: null,
        verificationCode: null,
      },
    ],
    total: 2,
  });
});
