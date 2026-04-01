import test from 'node:test';
import assert from 'node:assert/strict';

import { exchangeBlingAuthCode } from '../src/application/use-cases/exchange-bling-auth-code';

class FakeBlingOAuthGateway {
  public lastInput:
    | {
        code: string;
        redirectUri: string;
      }
    | undefined;

  async exchangeAuthorizationCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    this.lastInput = input;

    return {
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      expiresIn: 3600,
    };
  }

  async refreshAccessToken(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    throw new Error('Not used in this test.');
  }
}

test('exchanges a bling authorization code for tokens', async () => {
  const gateway = new FakeBlingOAuthGateway();

  const result = await exchangeBlingAuthCode(
    {
      code: 'auth-code-1',
      redirectUri: 'http://localhost:3000/auth/bling/callback',
    },
    {
      blingOAuthGateway: gateway,
    },
  );

  assert.equal(result.type, 'bling_auth_code_exchanged');
  assert.deepEqual(gateway.lastInput, {
    code: 'auth-code-1',
    redirectUri: 'http://localhost:3000/auth/bling/callback',
  });
  assert.deepEqual(result.tokens, {
    accessToken: 'access-token-1',
    refreshToken: 'refresh-token-1',
    expiresIn: 3600,
  });
});
