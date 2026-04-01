import test from 'node:test';
import assert from 'node:assert/strict';

import { BlingOAuthHttpGateway } from '../src/infrastructure/integrations/bling/bling-oauth-http-gateway';

test('exchanges authorization code using the Bling OAuth HTTP contract', async () => {
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
          access_token: 'access-token-1',
          refresh_token: 'refresh-token-1',
          expires_in: 3600,
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

  const result = await gateway.exchangeAuthorizationCode({
    code: 'auth-code-1',
    redirectUri: 'http://localhost:3000/auth/bling/callback',
  });

  assert.equal(capturedUrl, 'https://www.bling.com.br/Api/v3/oauth/token');
  assert.equal(capturedInit?.method, 'POST');
  assert.equal(capturedInit?.headers instanceof Headers, true);
  assert.equal(
    (capturedInit?.headers as Headers).get('Authorization')?.startsWith('Basic '),
    true,
  );
  assert.equal(
    (capturedInit?.headers as Headers).get('Content-Type'),
    'application/x-www-form-urlencoded',
  );

  const body = String(capturedInit?.body);
  assert.equal(
    body,
    'grant_type=authorization_code&code=auth-code-1&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fbling%2Fcallback',
  );

  assert.deepEqual(result, {
    accessToken: 'access-token-1',
    refreshToken: 'refresh-token-1',
    expiresIn: 3600,
  });
});
