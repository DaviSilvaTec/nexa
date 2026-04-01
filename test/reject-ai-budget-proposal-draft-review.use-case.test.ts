import test from 'node:test';
import assert from 'node:assert/strict';

import { rejectAiBudgetProposalDraftReview } from '../src/application/use-cases/reject-ai-budget-proposal-draft-review';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';

test('rejects the AI review suggestion and keeps the main proposal draft unchanged', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'session-1',
    createdAt: '2026-03-31T16:00:00.000Z',
    updatedAt: '2026-03-31T16:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      proposalDraft: {
        generatedAt: '2026-03-31T16:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Versão principal mantida',
      },
      proposalDraftReview: {
        reviewedAt: '2026-03-31T16:12:00.000Z',
        summary: 'Sugestão disponível.',
        suggestedCommercialBody: 'Versão revisada',
        resolvedCustomer: null,
        resolvedMaterialItems: [],
        adjustmentNotes: ['Melhorar abertura comercial.'],
        confidence: 'medio',
      },
    },
  });

  const result = await rejectAiBudgetProposalDraftReview(
    {
      sessionId: 'session-1',
      rejectedAt: new Date('2026-03-31T16:15:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
    },
  );

  assert.equal(result.type, 'ai_budget_proposal_draft_review_rejected');
  assert.equal(
    (result.session.payload as { proposalDraft?: { commercialBody?: string } }).proposalDraft
      ?.commercialBody,
    'Versão principal mantida',
  );
  assert.equal(
    'proposalDraftReview' in (result.session.payload as Record<string, unknown>),
    false,
  );
  assert.equal(
    (
      result.session.payload as {
        workflowState?: { currentStage?: string; hasReviewResult?: boolean };
      }
    ).workflowState?.currentStage,
    'proposal_review_rejected',
  );
  assert.equal(
    (
      result.session.payload as {
        workflowState?: { hasReviewResult?: boolean };
      }
    ).workflowState?.hasReviewResult,
    false,
  );
});
