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
  assert.match(response.body, /microphone-button--listening/);
  assert.match(response.body, /nexa-response/);
  assert.match(response.body, /ai-session-list/);
  assert.match(response.body, /ai-model-list/);
  assert.match(response.body, /loadRecentSessions/);
  assert.match(response.body, /loadRecentModels/);
  assert.match(response.body, /renderOperationWaiting/);
  assert.match(response.body, /Tempo restante:/);
  assert.match(response.body, /primary-actions/);
  assert.match(response.body, /button-pill/);
  assert.match(response.body, /session-actions/);
  assert.match(response.body, /list-tabs/);
  assert.match(response.body, /session-item-actions/);
  assert.match(response.body, /Continuar/);
  assert.match(response.body, /\+ Modelo/);
  assert.match(response.body, /Usar modelo/);
  assert.match(response.body, /Editar/);
  assert.match(response.body, /Apagar/);
  assert.match(response.body, /Confirma a exclusão desta sessão/);
  assert.match(response.body, /Excluir sessão criada em/);
  assert.match(response.body, /Deseja guardá-lo antes de continuar/);
  assert.match(response.body, /Deseja ignorar o texto atual e continuar sem salvá-lo/);
  assert.match(response.body, /Deseja atualizá-lo antes de continuar/);
  assert.match(response.body, /submitAiAgentResponse/);
  assert.match(response.body, /budget-finished-checkbox/);
  assert.match(response.body, /submit-ai-agent-button/);
  assert.match(response.body, /cancel-ai-agent-button/);
  assert.match(response.body, /proposal-review-model-selector/);
  assert.match(response.body, /Modelo de IA para revisão/);
  assert.match(response.body, /Terminado\. Liberar envio ao NEXA\./);
  assert.match(response.body, /Tela limpa\. O NEXA está pronto para um novo orçamento\./);
  assert.match(response.body, /pelo menos 30 palavras/);
  assert.doesNotMatch(response.body, /A comunicação com a OpenAI está ativa/);
  assert.match(response.body, /A comunicação com o NEXA está ativa/);
  assert.match(response.body, /buildRenderablePayloadFromLoadedSession/);
  assert.match(response.body, /Reabrir revisão/);
  assert.match(response.body, /Aprovar/);
  assert.match(response.body, /Cancelar sessão/);
  assert.match(response.body, /Gerar proposta comercial/);
  assert.match(response.body, /Confirmar e enviar ao Bling/);
  assert.match(response.body, /Salvar mudanças/);
  assert.match(response.body, /Mandar pra revisão/);
  assert.match(response.body, /Revisão do Rascunho/);
  assert.match(response.body, /Aceitar revisão/);
  assert.match(response.body, /Rejeitar revisão/);
  assert.match(response.body, /proposal-draft-review-editor/);
  assert.match(response.body, /Configurações/);
  assert.match(response.body, /Nível de log/);
  assert.match(response.body, /Modelo de IA/);
  assert.match(response.body, /default-ai-model-selector/);
  assert.match(response.body, /Tema visual/);
  assert.match(response.body, /Comportamento de revisão/);
  assert.match(response.body, /Token Bling:/);
  assert.match(response.body, /Validade:/);
  assert.match(response.body, /Renovar token Bling/);
  assert.match(response.body, /proposal-draft-editor/);
  assert.match(response.body, /Cliente Bling:/);
  assert.match(response.body, /getSessionActionState/);
  assert.match(response.body, /session-status-badge/);
  assert.match(response.body, /session-item-status/);
  assert.match(response.body, /session-item--ready/);
  assert.match(response.body, /data-session-status-action/);

  await app.close();
});
