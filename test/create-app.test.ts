import test from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app/create-app';

test('returns health status from the HTTP app', async () => {
  const app = createApp();

  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    status: 'ok',
    service: 'alltec-nexa',
  });

  await app.close();
});

test('serves the local test web app page', async () => {
  const app = createApp();

  const response = await app.inject({
    method: 'GET',
    url: '/app',
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.headers['content-type'] ?? '', /text\/html/);
  assert.match(response.body, /<title>NEXA<\/title>/);
  assert.match(response.body, /<h1>NEXA<\/h1>/);
  assert.match(response.body, /Networked EXecution Agent/);
  assert.match(response.body, /ai-agent-response-form/);
  assert.match(response.body, /speech-button/);
  assert.match(response.body, /microphone-button--idle/);
  assert.match(response.body, /nexa-response/);
  assert.match(response.body, /ai-session-list/);
  assert.match(response.body, /ai-model-list/);
  assert.match(response.body, /primary-actions/);
  assert.match(response.body, /button-pill/);
  assert.match(response.body, /session-actions/);
  assert.match(response.body, /bulk-selection-actions/);
  assert.match(response.body, /bulk-save-model-button/);
  assert.match(response.body, /bulk-delete-button/);
  assert.match(response.body, /list-tabs/);
  assert.match(response.body, /Apagar selecionados/);
  assert.match(response.body, /Salvar como modelo/);
  assert.match(response.body, /budget-finished-checkbox/);
  assert.match(response.body, /submit-ai-agent-button/);
  assert.match(response.body, /cancel-ai-agent-button/);
  assert.match(response.body, /Terminado\. Liberar envio ao NEXA\./);
  assert.match(response.body, /30 palavras mínimas/);
  assert.match(response.body, /Configurações/);
  assert.match(response.body, /Nível de log/);
  assert.match(response.body, /Modelo de IA/);
  assert.match(response.body, /default-ai-model-selector/);
  assert.match(response.body, /Tema visual/);
  assert.match(response.body, /Comportamento de revisão/);
  assert.match(response.body, /Token Bling:/);
  assert.match(response.body, /Validade:/);
  assert.match(response.body, /Renovar token Bling/);
  assert.match(response.body, /<script src="\/public\/js\/app\.js"><\/script>/);
  assert.match(response.body, /<link rel="stylesheet" href="\/public\/css\/app\.css" \/>/);

  await app.close();
});
