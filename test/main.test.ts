import test from 'node:test';
import assert from 'node:assert/strict';

import { createRuntime } from '../src/main';
import { BlingHttpQuoteGateway } from '../src/infrastructure/integrations/bling/bling-http-quote-gateway';
import { InMemoryBlingQuoteGateway } from '../src/infrastructure/integrations/bling/in-memory-bling-quote-gateway';
import { OpenAIHttpBudgetAssistantGateway } from '../src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway';

test('creates runtime with in-memory gateway when bling config is absent', () => {
  const runtime = createRuntime({
    APP_PORT: '3001',
    AUTHORIZED_CHANNELS: 'whatsapp:+5511999999999',
    OPENAI_API_KEY: undefined,
    OPENAI_MODEL: undefined,
    OPENAI_BASE_URL: undefined,
    BLING_API_BASE_URL: undefined,
    BLING_ACCESS_TOKEN: undefined,
    BLING_REFRESH_TOKEN: undefined,
    BLING_CLIENT_ID: undefined,
    BLING_CLIENT_SECRET: undefined,
    BLING_REDIRECT_URI: undefined,
  });

  assert.equal(runtime.config.appPort, 3001);
  assert.equal(
    runtime.dependencies.blingQuoteGateway instanceof InMemoryBlingQuoteGateway,
    true,
  );
});

test('creates runtime with http gateway when bling config is present', () => {
  const runtime = createRuntime({
    APP_PORT: '3001',
    AUTHORIZED_CHANNELS: 'whatsapp:+5511999999999',
    OPENAI_API_KEY: undefined,
    OPENAI_MODEL: undefined,
    OPENAI_BASE_URL: undefined,
    BLING_API_BASE_URL: 'https://api.bling.com.br/Api/v3',
    BLING_ACCESS_TOKEN: 'test-token',
    BLING_REFRESH_TOKEN: undefined,
    BLING_CLIENT_ID: 'client-id-1',
    BLING_CLIENT_SECRET: 'client-secret-1',
    BLING_REDIRECT_URI: 'http://localhost:3000/auth/bling/callback',
  });

  assert.equal(
    runtime.dependencies.blingQuoteGateway instanceof BlingHttpQuoteGateway,
    true,
  );
  assert.equal(runtime.dependencies.blingRedirectUri, 'http://localhost:3000/auth/bling/callback');
  assert.ok(runtime.dependencies.blingOAuthGateway);
});

test('creates runtime with oauth gateway when only bling oauth config is present', () => {
  const runtime = createRuntime({
    APP_PORT: '3001',
    OPENAI_API_KEY: undefined,
    OPENAI_MODEL: undefined,
    OPENAI_BASE_URL: undefined,
    BLING_API_BASE_URL: undefined,
    BLING_ACCESS_TOKEN: undefined,
    BLING_REFRESH_TOKEN: undefined,
    BLING_CLIENT_ID: 'client-id-1',
    BLING_CLIENT_SECRET: 'client-secret-1',
    BLING_REDIRECT_URI: 'http://localhost:3000/auth/bling/callback',
  });

  assert.equal(runtime.dependencies.blingRedirectUri, 'http://localhost:3000/auth/bling/callback');
  assert.ok(runtime.dependencies.blingOAuthGateway);
});

test('creates runtime with OpenAI HTTP gateway when OpenAI config is present', () => {
  const runtime = createRuntime({
    OPENAI_API_KEY: 'openai-key-1',
    OPENAI_MODEL: 'gpt-5.2',
    OPENAI_BASE_URL: undefined,
    BLING_API_BASE_URL: undefined,
    BLING_ACCESS_TOKEN: undefined,
    BLING_REFRESH_TOKEN: undefined,
    BLING_CLIENT_ID: undefined,
    BLING_CLIENT_SECRET: undefined,
    BLING_REDIRECT_URI: undefined,
  });

  assert.equal(
    runtime.dependencies.openAIBudgetAssistantGateway instanceof
      OpenAIHttpBudgetAssistantGateway,
    true,
  );
  assert.deepEqual(runtime.config.openai, {
    apiKey: 'openai-key-1',
    model: 'gpt-5.2',
    baseUrl: null,
  });
});
