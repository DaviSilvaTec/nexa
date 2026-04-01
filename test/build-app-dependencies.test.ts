import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAppDependencies } from '../src/app/build-app-dependencies';
import { BlingHttpQuoteGateway } from '../src/infrastructure/integrations/bling/bling-http-quote-gateway';
import { InMemoryBlingQuoteGateway } from '../src/infrastructure/integrations/bling/in-memory-bling-quote-gateway';
import { OpenAIHttpBudgetAssistantGateway } from '../src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway';
import { InMemoryOpenAIBudgetAssistantGateway } from '../src/infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway';

test('uses the in-memory bling gateway when bling env config is missing', () => {
  const dependencies = buildAppDependencies({
    env: {},
  });

  assert.equal(
    dependencies.blingQuoteGateway instanceof InMemoryBlingQuoteGateway,
    true,
  );
  assert.equal(
    dependencies.openAIBudgetAssistantGateway instanceof
      InMemoryOpenAIBudgetAssistantGateway,
    true,
  );
  assert.deepEqual(Array.from(dependencies.authorizedChannels), []);
});

test('uses the http bling gateway when bling env config is present', () => {
  const dependencies = buildAppDependencies({
    env: {
      AUTHORIZED_CHANNELS: 'whatsapp:+5511999999999,whatsapp:+5511888888888',
      BLING_API_BASE_URL: 'https://api.bling.com.br/Api/v3',
      BLING_ACCESS_TOKEN: 'test-token',
    },
  });

  assert.equal(
    dependencies.blingQuoteGateway instanceof BlingHttpQuoteGateway,
    true,
  );
  assert.deepEqual(Array.from(dependencies.authorizedChannels), [
    'whatsapp:+5511999999999',
    'whatsapp:+5511888888888',
  ]);
});

test('uses the http OpenAI gateway when OpenAI env config is present', () => {
  const dependencies = buildAppDependencies({
    env: {
      OPENAI_API_KEY: 'openai-key-1',
      OPENAI_MODEL: 'gpt-5.2',
    },
  });

  assert.equal(
    dependencies.openAIBudgetAssistantGateway instanceof
      OpenAIHttpBudgetAssistantGateway,
    true,
  );
});
