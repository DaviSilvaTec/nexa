import test from 'node:test';
import assert from 'node:assert/strict';

import type { OpenAIBudgetAssistantGateway } from '../src/application/gateways/openai-budget-assistant-gateway';
import { reviewAiBudgetProposalDraft } from '../src/application/use-cases/review-ai-budget-proposal-draft';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';

class FakeOpenAIBudgetAssistantGateway implements OpenAIBudgetAssistantGateway {
  public lastReviewModelOverride: string | null = null;
  public lastReviewBehavior:
    | 'manual'
    | 'double-check'
    | 'suggestion-only'
    | null = null;
  public lastReviewInstructions: string | null = null;

  async extractBudgetIntake() {
    return {
      type: 'budget_intake_extracted' as const,
      extraction: {
        customerQuery: null,
        materialQueries: [],
        serviceHints: [],
        ambiguities: [],
      },
    };
  }

  async interpretBudgetRequest() {
    return {
      type: 'budget_request_interpreted' as const,
      interpretation: {
        summaryTitle: 'Resumo de teste',
        budgetDescription: '',
        workDescription: '',
        materialItems: [],
        serviceItems: [],
        laborPriceResearch: {
          status: 'estimado' as const,
          summary: '',
          estimatedLaborRange: null,
          estimatedHours: null,
          basis: null,
          confidence: 'baixo' as const,
        },
        pendingQuestions: [],
        pointsOfAttention: [],
        suggestions: [],
        confidence: 'baixo' as const,
        rationale: '',
        expectedUserAction: '',
      },
    };
  }

  async reviewProposalDraft(input: {
    proposalDraft: string;
    reviewInstructions: string;
    modelOverride?: string | null;
    reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only';
  }) {
    this.lastReviewModelOverride = input.modelOverride ?? null;
    this.lastReviewBehavior = input.reviewBehavior ?? null;
    this.lastReviewInstructions = input.reviewInstructions ?? null;

    return {
      type: 'proposal_draft_reviewed' as const,
      review: {
        summary: 'Rascunho revisado com pequenos ajustes.',
        suggestedCommercialBody: `${input.proposalDraft}\n\nSugestão final.`,
        adjustmentNotes: ['Ajustar abertura comercial.'],
        confidence: 'medio' as const,
      },
    };
  }

  async reconcileProposalMaterials() {
    return {
      type: 'proposal_materials_reconciled' as const,
      reconciliation: {
        summary: 'Reconciliação não utilizada neste teste.',
        materialItems: [],
        adjustmentNotes: [],
        confidence: 'baixo' as const,
      },
    };
  }
}

test('reviews a generated proposal draft with AI and persists the result', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const gateway = new FakeOpenAIBudgetAssistantGateway();

  await repository.save({
    id: 'session-1',
    createdAt: '2026-03-31T10:00:00.000Z',
    updatedAt: '2026-03-31T10:00:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Cliente Exemplo',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      resolvedCustomer: {
        id: '999',
        name: 'Cliente Exemplo Ltda',
      },
      aiResponse: {
        interpretation: {
          budgetDescription: 'Descrição principal.',
          workDescription: 'Escopo técnico.',
          materialItems: [
            {
              description: 'Material A',
              quantityText: '1 unidade',
            },
          ],
          serviceItems: [
            {
              description: 'Serviço A',
              quantityText: '1 serviço',
              estimatedValueText: 'R$ 350',
            },
          ],
          pointsOfAttention: ['Validar estoque.'],
        },
      },
      proposalDraft: {
        commercialBody: 'Rascunho comercial atual.',
        reviewInstructions: 'Retirar um item condicional e melhorar a abertura.',
      },
    },
  });

  const result = await reviewAiBudgetProposalDraft(
    {
      sessionId: 'session-1',
      reviewedAt: new Date('2026-03-31T11:00:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      openAIBudgetAssistantGateway: gateway,
    },
  );

  assert.equal(result.type, 'ai_budget_proposal_draft_reviewed');
  assert.equal(result.review.summary, 'Rascunho revisado com pequenos ajustes.');
  assert.match(result.review.suggestedCommercialBody, /Sugestão final\./);
  assert.equal(gateway.lastReviewModelOverride, null);
  assert.equal(
    gateway.lastReviewInstructions,
    'Retirar um item condicional e melhorar a abertura.',
  );

  const persisted = await repository.findById('session-1');
  assert.ok(persisted);
  assert.equal(
    (persisted.payload as Record<string, unknown>).proposalDraftReview &&
      typeof (persisted.payload as Record<string, unknown>).proposalDraftReview === 'object',
    true,
  );
  assert.equal(
    (
      persisted.payload as {
        workflowState?: {
          currentStage?: string;
          hasReviewResult?: boolean;
        };
      }
    ).workflowState?.currentStage,
    'proposal_review_completed',
  );
  assert.equal(
    (
      persisted.payload as {
        workflowState?: { hasReviewResult?: boolean };
      }
    ).workflowState?.hasReviewResult,
    true,
  );
});

test('forwards the selected review model only to proposal draft review', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const gateway = new FakeOpenAIBudgetAssistantGateway();

  await repository.save({
    id: 'session-2',
    createdAt: '2026-03-31T10:00:00.000Z',
    updatedAt: '2026-03-31T10:00:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Cliente Exemplo',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      aiResponse: {
        interpretation: {
          budgetDescription: 'Descrição principal.',
          workDescription: 'Escopo técnico.',
          materialItems: [],
          serviceItems: [],
          pointsOfAttention: [],
        },
      },
      proposalDraft: {
        commercialBody: 'Rascunho comercial atual.',
        reviewInstructions: '',
      },
    },
  });

  await reviewAiBudgetProposalDraft(
    {
      sessionId: 'session-2',
      reviewModel: 'gpt-5.4-mini',
    },
    {
      aiBudgetSessionRepository: repository,
      openAIBudgetAssistantGateway: gateway,
    },
  );

  assert.equal(gateway.lastReviewModelOverride, 'gpt-5.4-mini');
});

test('forwards the selected review behavior to proposal draft review', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const gateway = new FakeOpenAIBudgetAssistantGateway();

  await repository.save({
    id: 'session-3',
    createdAt: '2026-03-31T10:00:00.000Z',
    updatedAt: '2026-03-31T10:00:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Cliente Exemplo',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      aiResponse: {
        interpretation: {
          budgetDescription: 'Descrição principal.',
          workDescription: 'Escopo técnico.',
          materialItems: [],
          serviceItems: [],
          pointsOfAttention: [],
        },
      },
      proposalDraft: {
        commercialBody: 'Rascunho comercial atual.',
        reviewInstructions: 'Conferir se o cliente aparece corretamente no início.',
      },
    },
  });

  await reviewAiBudgetProposalDraft(
    {
      sessionId: 'session-3',
      reviewBehavior: 'double-check',
    },
    {
      aiBudgetSessionRepository: repository,
      openAIBudgetAssistantGateway: gateway,
    },
  );

  assert.equal(gateway.lastReviewBehavior, 'double-check');
  assert.equal(
    gateway.lastReviewInstructions,
    'Conferir se o cliente aparece corretamente no início.',
  );
});
