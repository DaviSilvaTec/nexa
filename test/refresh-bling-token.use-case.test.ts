import test from 'node:test';
import assert from 'node:assert/strict';

import { refreshBlingToken } from '../src/application/use-cases/refresh-bling-token';

class FakeBlingOAuthGateway {
  public lastInput: { refreshToken: string } | undefined;

  async exchangeAuthorizationCode(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    throw new Error('Not used in this test.');
  }

  async refreshAccessToken(input: {
    refreshToken: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    this.lastInput = input;

    return {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 21600,
    };
  }
}

test('refreshes the bling access token using the refresh token', async () => {
  const gateway = new FakeBlingOAuthGateway();

  const result = await refreshBlingToken(
    {
      refreshToken: 'refresh-token-1',
    },
    {
      blingOAuthGateway: gateway,
    },
  );

  assert.equal(result.type, 'bling_token_refreshed');
  assert.deepEqual(gateway.lastInput, {
    refreshToken: 'refresh-token-1',
  });
  assert.deepEqual(result.tokens, {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    expiresIn: 21600,
  });
});
