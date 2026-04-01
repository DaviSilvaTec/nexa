import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app/create-app';
import type { BlingOAuthGateway } from '../src/application/gateways/bling-oauth-gateway';
import { InMemoryConversationRepository } from '../src/infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemorySuspendedAnalysisRepository } from '../src/infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';
import { InMemoryBlingQuoteGateway } from '../src/infrastructure/integrations/bling/in-memory-bling-quote-gateway';

class FakeBlingOAuthGateway implements BlingOAuthGateway {
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

test('exchanges the bling auth code through the callback route', async () => {
  const blingOAuthGateway = new FakeBlingOAuthGateway();

  const app = createApp({
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingOAuthGateway,
    blingRedirectUri: 'http://localhost:3000/auth/bling/callback',
  });

  const response = await app.inject({
    method: 'GET',
    url: '/auth/bling/callback?code=auth-code-1&state=test-state',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    type: 'bling_auth_code_exchanged',
    tokens: {
      accessToken: 'access-token-1',
      refreshToken: 'refresh-token-1',
      expiresIn: 3600,
    },
  });
  assert.deepEqual(blingOAuthGateway.lastInput, {
    code: 'auth-code-1',
    redirectUri: 'http://localhost:3000/auth/bling/callback',
  });

  await app.close();
});

test('rejects the callback route when code is missing', async () => {
  const app = createApp({
    conversationRepository: new InMemoryConversationRepository(),
    suspendedAnalysisRepository: new InMemorySuspendedAnalysisRepository(),
    blingQuoteGateway: new InMemoryBlingQuoteGateway(),
    blingOAuthGateway: new FakeBlingOAuthGateway(),
    blingRedirectUri: 'http://localhost:3000/auth/bling/callback',
  });

  const response = await app.inject({
    method: 'GET',
    url: '/auth/bling/callback',
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: 'Missing "code" query parameter.',
  });

  await app.close();
});
