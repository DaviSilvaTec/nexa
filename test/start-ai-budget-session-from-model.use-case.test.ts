import test from 'node:test';
import assert from 'node:assert/strict';

import { startAiBudgetSessionFromModel } from '../src/application/use-cases/start-ai-budget-session-from-model';
import { InMemoryAiBudgetModelRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-model-repository';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';

test('starts a proposal-ready session from a model in use mode without carrying Bling reference', async () => {
  const modelRepository = new InMemoryAiBudgetModelRepository();
  const sessionRepository = new InMemoryAiBudgetSessionRepository();

  await modelRepository.save({
    id: 'model-1',
    title: 'Modelo - Posto Alonso',
    createdAt: '2026-03-31T10:00:00.000Z',
    updatedAt: '2026-03-31T10:00:00.000Z',
    customerQuery: 'Posto Alonso',
    sourceSessionId: 'session-1',
    previewText: 'Cliente: Posto Alonso',
    blingQuoteId: 'bling-quote-1',
    blingQuoteNumber: '102',
    draftText: 'Cliente: Posto Alonso\n\nDescrição principal:\nTeste.',
    payload: {
      proposalDraft: {
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Cliente: Posto Alonso\n\nDescrição principal:\nTeste.',
      },
      resolvedCustomer: {
        id: 'contact-1',
        name: 'Posto Alonso',
      },
    },
  });

  const result = await startAiBudgetSessionFromModel(
    {
      modelId: 'model-1',
      mode: 'use',
      createdAt: new Date('2026-03-31T10:10:00.000Z'),
    },
    {
      aiBudgetModelRepository: modelRepository,
      aiBudgetSessionRepository: sessionRepository,
    },
  );

  assert.equal(result.session.status, 'Proposta comercial pronta');
  assert.equal(
    (result.session.payload as Record<string, unknown>).blingQuoteReference,
    undefined,
  );
});

test('starts a proposal-ready session from a model in edit mode carrying Bling reference', async () => {
  const modelRepository = new InMemoryAiBudgetModelRepository();
  const sessionRepository = new InMemoryAiBudgetSessionRepository();

  await modelRepository.save({
    id: 'model-1',
    title: 'Modelo - Posto Alonso',
    createdAt: '2026-03-31T10:00:00.000Z',
    updatedAt: '2026-03-31T10:00:00.000Z',
    customerQuery: 'Posto Alonso',
    sourceSessionId: 'session-1',
    previewText: 'Cliente: Posto Alonso',
    blingQuoteId: 'bling-quote-1',
    blingQuoteNumber: '102',
    draftText: 'Cliente: Posto Alonso\n\nDescrição principal:\nTeste.',
    payload: {
      proposalDraft: {
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Cliente: Posto Alonso\n\nDescrição principal:\nTeste.',
      },
      resolvedCustomer: {
        id: 'contact-1',
        name: 'Posto Alonso',
      },
    },
  });

  const result = await startAiBudgetSessionFromModel(
    {
      modelId: 'model-1',
      mode: 'edit',
      createdAt: new Date('2026-03-31T10:10:00.000Z'),
    },
    {
      aiBudgetModelRepository: modelRepository,
      aiBudgetSessionRepository: sessionRepository,
    },
  );

  assert.equal(result.session.status, 'Proposta comercial pronta');
  assert.deepEqual(
    (result.session.payload as { blingQuoteReference?: unknown }).blingQuoteReference,
    {
      id: 'bling-quote-1',
      number: '102',
      sourceModelId: 'model-1',
    },
  );
});
