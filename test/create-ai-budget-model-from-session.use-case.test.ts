import test from 'node:test';
import assert from 'node:assert/strict';

import { createAiBudgetModelFromSession } from '../src/application/use-cases/create-ai-budget-model-from-session';
import { InMemoryAiBudgetModelRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-model-repository';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';

test('creates a reusable model from a finalized session and removes it from the session list', async () => {
  const sessionRepository = new InMemoryAiBudgetSessionRepository();
  const modelRepository = new InMemoryAiBudgetModelRepository();

  await sessionRepository.save({
    id: 'session-1',
    createdAt: '2026-03-30T18:00:00.000Z',
    updatedAt: '2026-03-30T18:30:00.000Z',
    originalText: 'Instalar duas câmeras IP no posto Alonso',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Finalizada',
    payload: {
      blingQuote: {
        id: 'bling-quote-1',
        number: '102',
      },
      proposalDraft: {
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Cliente: Posto Alonso\n\nDescrição principal:\nInstalação...',
      },
    },
  });

  const result = await createAiBudgetModelFromSession(
    {
      sessionId: 'session-1',
      createdAt: new Date('2026-03-30T18:40:00.000Z'),
    },
    {
      aiBudgetSessionRepository: sessionRepository,
      aiBudgetModelRepository: modelRepository,
    },
  );

  assert.equal(result.type, 'ai_budget_model_created_from_session');
  assert.equal(result.deletedSessionId, 'session-1');
  assert.match(result.model.title, /Posto Alonso/);
  assert.equal(result.model.blingQuoteId, 'bling-quote-1');
  assert.equal(result.model.blingQuoteNumber, '102');
  assert.equal(await sessionRepository.findById('session-1'), null);
  assert.equal((await modelRepository.listRecent()).length, 1);
});

test('rejects model creation from a non-finalized session', async () => {
  const sessionRepository = new InMemoryAiBudgetSessionRepository();
  const modelRepository = new InMemoryAiBudgetModelRepository();

  await sessionRepository.save({
    id: 'session-2',
    createdAt: '2026-03-30T18:00:00.000Z',
    updatedAt: '2026-03-30T18:30:00.000Z',
    originalText: 'Texto',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      proposalDraft: {
        title: 'Proposta comercial - Posto Alonso',
      },
    },
  });

  await assert.rejects(
    () =>
      createAiBudgetModelFromSession(
        {
          sessionId: 'session-2',
        },
        {
          aiBudgetSessionRepository: sessionRepository,
          aiBudgetModelRepository: modelRepository,
        },
      ),
    /must be finalized before becoming a model/,
  );
});

test('preserves the original Bling reference number in the model when the finalized session stores number 0 after an edit', async () => {
  const sessionRepository = new InMemoryAiBudgetSessionRepository();
  const modelRepository = new InMemoryAiBudgetModelRepository();

  await sessionRepository.save({
    id: 'session-3',
    createdAt: '2026-03-31T17:30:00.000Z',
    updatedAt: '2026-03-31T17:40:00.000Z',
    originalText: 'Editar proposta existente',
    customerQuery: 'Cliente Exemplo',
    confidence: 'medio',
    status: 'Finalizada',
    payload: {
      blingQuoteReference: {
        id: 'bling-quote-104',
        number: '104',
      },
      blingQuote: {
        id: 'bling-quote-104',
        number: '0',
      },
      proposalDraft: {
        title: 'Proposta comercial - Cliente Exemplo',
        commercialBody: 'Texto atualizado.',
      },
    },
  });

  const result = await createAiBudgetModelFromSession(
    {
      sessionId: 'session-3',
      createdAt: new Date('2026-03-31T17:45:00.000Z'),
    },
    {
      aiBudgetSessionRepository: sessionRepository,
      aiBudgetModelRepository: modelRepository,
    },
  );

  assert.equal(result.model.blingQuoteId, 'bling-quote-104');
  assert.equal(result.model.blingQuoteNumber, '104');
});
