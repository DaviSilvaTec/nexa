import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAppConfig } from '../src/config/app-config';

test('builds app config from env values', () => {
  const config = buildAppConfig({
    APP_PORT: '4000',
    AUTHORIZED_CHANNELS: 'whatsapp:+5511999999999,whatsapp:+5511888888888',
    OPENAI_API_KEY: 'openai-key-1',
    OPENAI_MODEL: 'gpt-5.2',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    BLING_API_BASE_URL: 'https://api.bling.com.br/Api/v3',
    BLING_ACCESS_TOKEN: 'test-token',
    BLING_CLIENT_ID: 'client-id-1',
    BLING_CLIENT_SECRET: 'client-secret-1',
    BLING_REDIRECT_URI: 'http://localhost:3000/auth/bling/callback',
  });

  assert.deepEqual(config, {
    appPort: 4000,
    authorizedChannels: [
      'whatsapp:+5511999999999',
      'whatsapp:+5511888888888',
    ],
    openai: {
      apiKey: 'openai-key-1',
      model: 'gpt-5.2',
      baseUrl: 'https://api.openai.com/v1',
    },
    bling: {
      apiBaseUrl: 'https://api.bling.com.br/Api/v3',
      accessToken: 'test-token',
      refreshToken: null,
      clientId: 'client-id-1',
      clientSecret: 'client-secret-1',
      redirectUri: 'http://localhost:3000/auth/bling/callback',
    },
  });
});

test('uses defaults when optional env values are not provided', () => {
  const config = buildAppConfig({});

  assert.deepEqual(config, {
    appPort: 3000,
    authorizedChannels: [],
    openai: null,
    bling: null,
  });
});

test('includes refresh token when provided', () => {
  const config = buildAppConfig({
    BLING_REFRESH_TOKEN: 'refresh-token-1',
  });

  assert.deepEqual(config, {
    appPort: 3000,
    authorizedChannels: [],
    openai: null,
    bling: {
      apiBaseUrl: null,
      accessToken: null,
      refreshToken: 'refresh-token-1',
      clientId: null,
      clientSecret: null,
      redirectUri: null,
    },
  });
});

test('rejects invalid APP_PORT values', () => {
  assert.throws(
    () =>
      buildAppConfig({
        APP_PORT: 'abc',
      }),
    /app_port/i,
  );
});

test('includes OpenAI config when provided', () => {
  const config = buildAppConfig({
    OPENAI_API_KEY: 'openai-key-1',
    OPENAI_MODEL: 'gpt-5.2',
  });

  assert.deepEqual(config, {
    appPort: 3000,
    authorizedChannels: [],
    openai: {
      apiKey: 'openai-key-1',
      model: 'gpt-5.2',
      baseUrl: null,
    },
    bling: null,
  });
});
