import test from 'node:test';
import assert from 'node:assert/strict';

import { updateAiBudgetSessionStatus } from '../src/application/use-cases/update-ai-budget-session-status';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';

test('approves an existing AI budget session for proposal generation', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'sess-1',
    createdAt: '2026-03-30T18:00:00.000Z',
    updatedAt: '2026-03-30T18:00:00.000Z',
    originalText: 'Texto inicial',
    customerQuery: 'posto alonso',
    confidence: 'medio',
    status: 'Aguardando aprovacao',
    payload: {
      localResponse: {
        response: {
          status: 'Aguardando aprovacao',
        },
      },
    },
  });

  const result = await updateAiBudgetSessionStatus(
    {
      sessionId: 'sess-1',
      status: 'Aprovado para proposta',
      updatedAt: new Date('2026-03-30T18:10:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
    },
  );

  assert.equal(result.type, 'ai_budget_session_status_updated');
  assert.equal(result.session.id, 'sess-1');
  assert.equal(result.session.status, 'Aprovado para proposta');
  assert.equal(result.session.updatedAt, '2026-03-30T18:10:00.000Z');

  const stored = await repository.findById('sess-1');
  assert.equal(stored?.status, 'Aprovado para proposta');
});

test('cancels an existing AI budget session', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'sess-2',
    createdAt: '2026-03-30T18:00:00.000Z',
    updatedAt: '2026-03-30T18:00:00.000Z',
    originalText: 'Texto inicial',
    customerQuery: 'posto alonso',
    confidence: 'medio',
    status: 'Aguardando aprovacao',
    payload: {
      localResponse: {
        response: {
          status: 'Aguardando aprovacao',
        },
      },
    },
  });

  const result = await updateAiBudgetSessionStatus(
    {
      sessionId: 'sess-2',
      status: 'Cancelado',
      updatedAt: new Date('2026-03-30T18:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
    },
  );

  assert.equal(result.session.status, 'Cancelado');
  const stored = await repository.findById('sess-2');
  assert.equal(stored?.status, 'Cancelado');
});
