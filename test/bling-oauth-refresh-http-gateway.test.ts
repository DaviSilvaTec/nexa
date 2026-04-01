import test from 'node:test';
import assert from 'node:assert/strict';

import { BlingOAuthHttpGateway } from '../src/infrastructure/integrations/bling/bling-oauth-http-gateway';

test('refreshes token using the Bling OAuth HTTP contract', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const gateway = new BlingOAuthHttpGateway({
    baseUrl: 'https://www.bling.com.br/Api/v3',
    clientId: 'client-id-1',
    clientSecret: 'client-secret-1',
    fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;

      return new Response(
        JSON.stringify({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 21600,
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

  const result = await gateway.refreshAccessToken({
    refreshToken: 'refresh-token-1',
  });

  assert.equal(capturedUrl, 'https://www.bling.com.br/Api/v3/oauth/token');
  assert.equal(capturedInit?.method, 'POST');
  assert.equal(capturedInit?.headers instanceof Headers, true);
  assert.equal(
    (capturedInit?.headers as Headers).get('Authorization')?.startsWith('Basic '),
    true,
  );

  const body = String(capturedInit?.body);
  assert.equal(
    body,
    'grant_type=refresh_token&refresh_token=refresh-token-1',
  );

  assert.deepEqual(result, {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 21600,
  });
});
