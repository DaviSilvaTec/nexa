import type {
  AiBudgetAssistantContextPayload,
  OpenAIBudgetAssistantGateway,
} from '../../../application/gateways/openai-budget-assistant-gateway';

export class InMemoryOpenAIBudgetAssistantGateway
  implements OpenAIBudgetAssistantGateway {
  public lastPayload: AiBudgetAssistantContextPayload | null = null;

  async extractBudgetIntake(
    originalText: string,
    _options?: { modelOverride?: string | null },
  ) {
    const normalizedText = normalizeText(originalText);
    const customerMatch = originalText.match(/cliente\s+([a-z0-9\s]+)/i);
    const materialQueries = extractMaterialQueries(normalizedText);

    return {
      type: 'budget_intake_extracted' as const,
      extraction: {
        customerQuery: customerMatch?.[1]?.trim() ?? null,
        materialQueries,
        serviceHints: extractServiceHints(normalizedText),
        ambiguities: materialQueries.length === 0
          ? ['Nenhum material foi extraido automaticamente do texto.']
          : [],
      },
    };
  }

  async interpretBudgetRequest(
    payload: AiBudgetAssistantContextPayload,
    _options?: { modelOverride?: string | null },
  ) {
    this.lastPayload = payload;

    return {
      type: 'budget_request_interpreted' as const,
      interpretation: {
        summaryTitle: buildSummaryTitle(payload.originalText),
        budgetDescription:
          'Interpretação assistida em memória. Validar cliente, materiais e pontos de atenção antes da aprovação.',
        workDescription:
          'Estrutura inicial de trabalho gerada em memória apenas para exercitar o fluxo.',
        materialItems: [],
        serviceItems: [],
        laborPriceResearch: {
          status: 'estimado' as const,
          summary:
            'Estimativa inicial fraca indisponivel no modo em memoria; configurar OPENAI_API_KEY para receber uma estimativa assistida real desde a primeira interação.',
          estimatedLaborRange: null,
          estimatedHours: null,
          basis: 'gateway em memoria sem pesquisa assistida real',
          confidence: 'baixo' as const,
        },
        pendingQuestions: [],
        pointsOfAttention: ['Gateway de OpenAI em memoria ativo para testes locais.'],
        suggestions: ['Configurar OPENAI_API_KEY para ativar a chamada real.'],
        confidence: 'baixo' as const,
        rationale: 'Sem integracao real ativa, a resposta serve apenas para exercitar o fluxo.',
        expectedUserAction: 'Revisar o fluxo e configurar a integracao real quando necessario.',
      },
    };
  }

  async reviewProposalDraft(input: {
    proposalDraft: string;
    modelOverride?: string | null;
  }) {
    return {
      type: 'proposal_draft_reviewed' as const,
      review: {
        summary:
          'Revisão em memória ativa. Validar clareza comercial, cliente e escopo antes do envio.',
        suggestedCommercialBody: input.proposalDraft,
        adjustmentNotes: [
          'Gateway em memória ativo para testes locais.',
          ...(input.modelOverride
            ? [`Modelo solicitado para revisão: ${input.modelOverride}.`]
            : []),
          'Configurar OPENAI_API_KEY para receber revisão assistida real do rascunho.',
        ],
        confidence: 'baixo' as const,
      },
    };
  }

  async reconcileProposalMaterials(input: {
    materialItems: Array<{
      description: string;
      quantityText: string;
      sourceQuery: string | null;
      catalogItemId: string | null;
      catalogItemName: string | null;
    }>;
  }) {
    return {
      type: 'proposal_materials_reconciled' as const,
      reconciliation: {
        summary:
          'Reconciliação de materiais em memória ativa. Validar os itens antes do envio.',
        materialItems: input.materialItems,
        adjustmentNotes: [
          'Gateway em memória ativo para testes locais.',
          'Configurar OPENAI_API_KEY para receber reconciliação real dos materiais.',
        ],
        confidence: 'baixo' as const,
      },
    };
  }
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extractMaterialQueries(normalizedText: string): string[] {
  const materialPatterns = [
    /cabo(?:\s+[a-z0-9/.,-]+){0,4}/g,
    /fio(?:\s+[a-z0-9/.,-]+){0,4}/g,
    /conector(?:\s+[a-z0-9/.,-]+){0,4}/g,
    /camera(?:\s+[a-z0-9/.,-]+){0,4}/g,
    /interfone(?:\s+[a-z0-9/.,-]+){0,4}/g,
  ];

  const matches = materialPatterns.flatMap((pattern) =>
    Array.from(normalizedText.matchAll(pattern), (match) => match[0].trim()),
  );

  return [...new Set(matches)].filter((value) => value.length > 0);
}

function extractServiceHints(normalizedText: string): string[] {
  const hints = [
    'instalacao',
    'troca',
    'revisao',
    'manutencao',
    'montagem',
  ].filter((hint) => normalizedText.includes(hint));

  return hints;
}

function buildSummaryTitle(originalText: string): string {
  const words = originalText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 5);

  return words.join(' ') || 'Proposta em revisão';
}
