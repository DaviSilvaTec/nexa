import type {
  AiBudgetAssistantContextPayload,
  OpenAIBudgetAssistantGateway,
} from '../../../application/gateways/openai-budget-assistant-gateway';
import { appendAppLog } from '../../observability/file-system-app-log';

interface OpenAIHttpBudgetAssistantGatewayDependencies {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class OpenAIHttpBudgetAssistantGateway
  implements OpenAIBudgetAssistantGateway {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(dependencies: OpenAIHttpBudgetAssistantGatewayDependencies) {
    this.apiKey = dependencies.apiKey;
    this.model = dependencies.model;
    this.baseUrl = (dependencies.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    this.fetchImpl = dependencies.fetchImpl ?? fetch;
    this.timeoutMs = dependencies.timeoutMs ?? 120000;
  }

  async extractBudgetIntake(
    originalText: string,
    options?: { modelOverride?: string | null },
  ) {
    const payload = await this.createStructuredResponse({
      schemaName: 'budget_intake_extraction',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['customerQuery', 'materialQueries', 'serviceHints', 'ambiguities'],
        properties: {
          customerQuery: {
            type: ['string', 'null'],
          },
          materialQueries: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          serviceHints: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          ambiguities: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
      prompt: [
        'Extraia do texto natural apenas os elementos iniciais necessarios para o NEXA procurar dados locais.',
        'Retorne somente JSON valido no schema solicitado.',
        'Nao invente cliente nem materiais quando nao houver evidencia suficiente.',
        `Texto do usuario: ${originalText}`,
      ].join('\n'),
      ...(options?.modelOverride
        ? { modelOverride: options.modelOverride }
        : {}),
    });

    return {
      type: 'budget_intake_extracted' as const,
      extraction: {
        customerQuery: normalizeNullableString(payload.customerQuery),
        materialQueries: normalizeStringArray(payload.materialQueries),
        serviceHints: normalizeStringArray(payload.serviceHints),
        ambiguities: normalizeStringArray(payload.ambiguities),
      },
    };
  }

  async interpretBudgetRequest(
    payload: AiBudgetAssistantContextPayload,
    options?: { modelOverride?: string | null },
  ) {
    const result = await this.createStructuredResponse({
      schemaName: 'budget_request_interpretation',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: [
          'summaryTitle',
          'budgetDescription',
          'workDescription',
          'materialItems',
          'serviceItems',
          'laborPriceResearch',
          'pendingQuestions',
          'pointsOfAttention',
          'suggestions',
          'confidence',
          'rationale',
          'expectedUserAction',
        ],
        properties: {
          summaryTitle: { type: 'string' },
          budgetDescription: { type: 'string' },
          workDescription: { type: 'string' },
          materialItems: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'description',
                'quantityText',
                'sourceQuery',
                'catalogItemId',
                'catalogItemName',
              ],
              properties: {
                description: { type: 'string' },
                quantityText: { type: 'string' },
                sourceQuery: { type: ['string', 'null'] },
                catalogItemId: { type: ['string', 'null'] },
                catalogItemName: { type: ['string', 'null'] },
              },
            },
          },
          serviceItems: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['description', 'quantityText', 'estimatedValueText'],
              properties: {
                description: { type: 'string' },
                quantityText: { type: 'string' },
                estimatedValueText: { type: 'string' },
              },
            },
          },
          laborPriceResearch: {
            type: 'object',
            additionalProperties: false,
            required: [
              'status',
              'summary',
              'estimatedLaborRange',
              'estimatedHours',
              'basis',
              'confidence',
            ],
            properties: {
              status: {
                type: 'string',
                enum: ['pendente', 'estimado'],
              },
              summary: { type: 'string' },
              estimatedLaborRange: { type: ['string', 'null'] },
              estimatedHours: { type: ['string', 'null'] },
              basis: { type: ['string', 'null'] },
              confidence: {
                type: 'string',
                enum: ['alto', 'medio', 'baixo'],
              },
            },
          },
          pendingQuestions: {
            type: 'array',
            items: { type: 'string' },
          },
          pointsOfAttention: {
            type: 'array',
            items: { type: 'string' },
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
          },
          confidence: {
            type: 'string',
            enum: ['alto', 'medio', 'baixo'],
          },
          rationale: { type: 'string' },
          expectedUserAction: { type: 'string' },
        },
      },
      prompt: [
        'Você está auxiliando o NEXA a montar um orçamento no formato que já usamos na operação.',
        'Receba o texto cru e a shortlist de materiais enviada pelo backend.',
        'Monte a resposta em blocos operacionais curtos e úteis.',
        'Retorne também summaryTitle com um resumo operacional curtíssimo da proposta em no máximo 5 palavras, para ser usado como título do card da sessão.',
        'Considere materialCandidates[].query como a referencia atual de materiais canonicos normalizados pelo backend.',
        'Use a lista de materiais candidatos como base para a lista de materiais; não invente catálogo inteiro.',
        'Sempre retorne uma lista de serviços em serviceItems, com descrição, quantidade e valor estimado, mesmo que aproximado.',
        'Em serviceItems[].estimatedValueText use sempre uma faixa ou valor textual em reais brasileiros, por exemplo "R$ 350" ou "R$ 350 a R$ 500".',
        'Se a mao de obra for composta por mais de uma frente, separe em serviços distintos para facilitar revisão manual posterior.',
        'Quando faltarem metragens reais de cabos, fios, tubulações ou materiais lineares, estime as quantidades usando distancias, rotas, pontos, infraestrutura citada, tubulações e demais pistas do contexto técnico para chegar ao valor mais plausível possível.',
        'Use o mesmo raciocínio contextual para outros materiais proporcionais ou auxiliares, deixando claro em quantityText quando a quantidade for estimada.',
        'Quando o contexto mencionar eletrodutos, conduletes, suportes, caixas de passagem ou infraestrutura semelhante, raciocine também sobre acessórios de fixação e montagem que normalmente acompanham esses itens.',
        'Considere como heurística operacional inicial: eletrodutos costumam usar aproximadamente uma abraçadeira por metro; cada abraçadeira normalmente demanda uma bucha 6 e um parafuso; conduletes costumam usar dois parafusos; caixas de passagem costumam usar três parafusos.',
        'Use essas relações para lembrar itens auxiliares possivelmente faltantes e para estimar quantidades aproximadas, sempre deixando claro quando forem inferidas pelo contexto e dependerem de validação posterior.',
        'Quando houver correspondência suficientemente aderente na shortlist, selecione explicitamente o item usando catalogItemId e catalogItemName.',
        'Quando não houver correspondência suficientemente aderente, deixe catalogItemId e catalogItemName como null.',
        'Na primeira interação, sempre gere laborPriceResearch com status estimado.',
        'Essa estimativa deve ser fraca, servir apenas como parametro inicial e ser baseada na descricao do trabalho e nos materiais canonicos normalizados.',
        'Sempre preencha estimatedLaborRange com uma faixa textual inicial em reais brasileiros no formato "R$ 000 a R$ 000".',
        'Sempre preencha estimatedHours com uma faixa textual de horas no formato "X a Y horas".',
        'Sempre preencha basis com a base resumida usada e confidence com baixo, medio ou alto.',
        'Nao dependa de fonte externa, historico fechado ou validacao previa para montar essa estimativa inicial.',
        'Use status pendente apenas se for impossivel estimar minimamente a mao de obra a partir do contexto recebido.',
        'Nunca transforme itens sugeridos em itens aprovados ou confirmados.',
        'Nunca assuma aprovação nem execução operacional.',
        'Retorne somente JSON valido no schema solicitado.',
        `Contexto do NEXA: ${JSON.stringify(payload)}`,
      ].join('\n'),
      ...(options?.modelOverride
        ? { modelOverride: options.modelOverride }
        : {}),
    });

    const budgetDescription = normalizeString(result.budgetDescription);
    const workDescription = normalizeString(result.workDescription);
    const materialItems = normalizeMaterialItems(result.materialItems);
    const serviceItems = normalizeServiceItems(result.serviceItems);
    const laborPriceResearch = normalizeLaborPriceResearch(
      result.laborPriceResearch,
      {
        originalText: payload.originalText,
        workDescription,
        materialQueryCount: payload.materialCandidates.length,
        serviceItemCount: serviceItems.length,
      },
    );

    return {
      type: 'budget_request_interpreted' as const,
      interpretation: {
        summaryTitle: normalizeSummaryTitle(result.summaryTitle),
        budgetDescription,
        workDescription,
        materialItems,
        serviceItems,
        laborPriceResearch,
        pendingQuestions: normalizeStringArray(result.pendingQuestions),
        pointsOfAttention: normalizeStringArray(result.pointsOfAttention),
        suggestions: normalizeStringArray(result.suggestions),
        confidence: normalizeConfidence(result.confidence),
        rationale: normalizeString(result.rationale),
        expectedUserAction: normalizeString(result.expectedUserAction),
      },
    };
  }

  async reviewProposalDraft(input: {
    originalText: string;
    proposalDraft: string;
    reviewInstructions: string;
    modelOverride?: string | null;
    reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only';
    customerName: string | null;
    budgetDescription: string;
    workDescription: string;
    materialItems: Array<{
      description: string;
      quantityText: string;
    }>;
    materialCandidates: Array<{
      query: string;
      totalMatches: number;
      candidates: Array<{
        id: string;
        name: string;
        code: string | null;
        price: number | null;
        costPrice: number | null;
        stockQuantity: number | null;
        type: string | null;
        status: string | null;
      }>;
    }>;
    customerCandidates: Array<{
      id: string;
      name: string;
      code: string | null;
      documentNumber: string | null;
      phone: string | null;
      mobilePhone: string | null;
      score: number;
    }>;
    serviceItems: Array<{
      description: string;
      quantityText: string;
      estimatedValueText: string;
    }>;
    pointsOfAttention: string[];
  }) {
    const result = await this.createStructuredResponse({
      schemaName: 'proposal_draft_review',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: [
          'summary',
          'suggestedCommercialBody',
          'adjustmentNotes',
          'confidence',
        ],
        properties: {
          summary: { type: 'string' },
          suggestedCommercialBody: { type: 'string' },
          adjustmentNotes: {
            type: 'array',
            items: { type: 'string' },
          },
          confidence: {
            type: 'string',
            enum: ['alto', 'medio', 'baixo'],
          },
        },
      },
      prompt: [
        'Você está revisando um rascunho comercial do NEXA antes do envio ao Bling.',
        'O texto original transcrito representa apenas o pedido inicial do cliente e deve ser usado como contexto de referência, nunca como texto final a ser copiado automaticamente.',
        'Compare o pedido original com o rascunho atual e com as instruções adicionais do operador para entender o que foi mantido, o que mudou e o que ainda precisa ser corrigido.',
        'As instruções adicionais do operador devem ter prioridade prática sobre a formulação inicial do rascunho quando houver conflito explícito.',
        buildReviewInstructionsInstruction(input.reviewInstructions),
        'Analise clareza, objetividade, tom comercial e coerência técnica.',
        'Revise também os valores estimados dos serviços e da mão de obra para aproximá-los do que costuma ser praticado no mercado local, sem tratá-los como definitivos.',
        'Se houver necessidade, proponha redação mais clara para os serviços e seus valores aproximados.',
        'O NEXA está enviando uma lista ampliada de materiais candidatos e uma lista de clientes prováveis para apoiar esta revisão.',
        'Use essas listas como referência contextual para comparar o pedido original com o rascunho atual e perceber escolhas mais aderentes, omissões e inconsistências.',
        'Não trate nenhum candidato isoladamente como definitivo nesta etapa apenas por aparecer na lista; use o conjunto do contexto para revisar melhor.',
        'Quando houver materiais lineares ou proporcionais sem metragem fechada, refine as quantidades aproximadas usando distâncias, tubulações, rotas e demais pistas do contexto técnico, mantendo explícito que se trata de estimativa.',
        'Inclua no corpo sugerido somas, subtotais ou totais aproximados por agrupamento sempre que isso ajudar na conferência manual posterior, deixando claro que esses valores ainda podem ser ajustados antes do envio final.',
        'Quando houver soma consolidada de mão de obra, escreva uma linha explícita e padronizada com o nome exato "Soma mínima da mão de obra:" seguida do valor em reais, usando a soma dos menores valores estimados dos serviços, pois o NEXA usará essa linha como referência operacional no envio ao Bling.',
        'Formate o texto de forma elegante para o padrão visual de trabalho do orçamento no Bling, com espaçamentos entre agrupamentos e sem blocos densos.',
        buildReviewBehaviorInstruction(input.reviewBehavior),
        'Não invente materiais ou serviços fora do contexto.',
        'Retorne um parecer curto, uma sugestão de texto comercial ajustado e notas de ajuste.',
        'Retorne somente JSON válido no schema solicitado.',
        `Contexto: ${JSON.stringify(input)}`,
      ].join('\n'),
      ...(input.modelOverride ? { modelOverride: input.modelOverride } : {}),
    });

    return {
      type: 'proposal_draft_reviewed' as const,
      review: {
        summary: normalizeString(result.summary),
        suggestedCommercialBody: normalizeString(result.suggestedCommercialBody),
        adjustmentNotes: normalizeStringArray(result.adjustmentNotes),
        confidence: normalizeConfidence(result.confidence),
      },
    };
  }

  async reconcileProposalMaterials(input: {
    originalText: string;
    proposalDraft: string;
    customerName: string | null;
    materialItems: Array<{
      description: string;
      quantityText: string;
      sourceQuery: string | null;
      catalogItemId: string | null;
      catalogItemName: string | null;
    }>;
    materialCandidates: Array<{
      query: string;
      totalMatches: number;
      candidates: Array<{
        id: string;
        name: string;
        code: string | null;
        price: number | null;
        costPrice: number | null;
        stockQuantity: number | null;
        type: string | null;
        status: string | null;
      }>;
    }>;
  }) {
    const result = await this.createStructuredResponse({
      schemaName: 'proposal_material_reconciliation',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'materialItems', 'adjustmentNotes', 'confidence'],
        properties: {
          summary: { type: 'string' },
          materialItems: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'description',
                'quantityText',
                'sourceQuery',
                'catalogItemId',
                'catalogItemName',
              ],
              properties: {
                description: { type: 'string' },
                quantityText: { type: 'string' },
                sourceQuery: { type: ['string', 'null'] },
                catalogItemId: { type: ['string', 'null'] },
                catalogItemName: { type: ['string', 'null'] },
              },
            },
          },
          adjustmentNotes: {
            type: 'array',
            items: { type: 'string' },
          },
          confidence: {
            type: 'string',
            enum: ['alto', 'medio', 'baixo'],
          },
        },
      },
      prompt: [
        'Você está reconciliando os materiais finais de uma proposta do NEXA antes do envio ao Bling.',
        'Receba a lista de materiais que o modelo gerou anteriormente e a shortlist de materiais que o backend considera relacionados a cada consulta.',
        'Seu trabalho é escolher os materiais corretos para a proposta final usando o contexto técnico, o rascunho comercial e a shortlist enviada.',
        'Quando houver correspondência aderente, selecione explicitamente catalogItemId e catalogItemName do item correto.',
        'Quando não houver correspondência suficientemente aderente, mantenha catalogItemId e catalogItemName como null.',
        'Você pode ajustar descrição e quantidadeText para refletir melhor o item correto e o contexto do orçamento.',
        'Não invente produtos fora da shortlist enviada pelo backend.',
        'Não remova materiais necessários sem justificativa contextual.',
        'Retorne uma lista final de materiais reconciliados para substituir a lista anterior da proposta.',
        'Retorne somente JSON válido no schema solicitado.',
        `Contexto: ${JSON.stringify(input)}`,
      ].join('\n'),
    });

    return {
      type: 'proposal_materials_reconciled' as const,
      reconciliation: {
        summary: normalizeString(result.summary),
        materialItems: normalizeMaterialItems(result.materialItems),
        adjustmentNotes: normalizeStringArray(result.adjustmentNotes),
        confidence: normalizeConfidence(result.confidence),
      },
    };
  }

  private async createStructuredResponse(input: {
    schemaName: string;
    schema: object;
    prompt: string;
    modelOverride?: string;
  }): Promise<Record<string, unknown>> {
    const model = input.modelOverride ?? this.model;
    const maxAttempts = input.schemaName === 'proposal_draft_review' ? 2 : 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await appendAppLog({
        source: 'openai',
        event: 'requisicao_iniciada',
        schemaName: input.schemaName,
        model,
        attempt,
      }).catch(() => {});

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
          method: 'POST',
          headers: new Headers({
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            model,
            input: input.prompt,
            text: {
              format: {
                type: 'json_schema',
                name: input.schemaName,
                strict: true,
                schema: input.schema,
              },
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          await appendAppLog({
            source: 'openai',
            event: 'requisicao_falhou',
            schemaName: input.schemaName,
            statusCode: response.status,
            errorBody,
            attempt,
          }).catch(() => {});

          const failure = new Error(
            `OpenAI budget assistant request failed with status ${response.status}: ${errorBody}`,
          );

          if (
            attempt < maxAttempts &&
            shouldRetryCancelledReviewError(failure, input.schemaName)
          ) {
            lastError = failure;
            continue;
          }

          throw failure;
        }

        const body = (await response.json()) as {
          output_text?: string;
          output?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
            }>;
          }>;
        };

        const outputText = body.output_text ?? extractOutputText(body.output);

        if (!outputText) {
          const failure = new Error(
            'OpenAI budget assistant response did not include output_text.',
          );
          await appendAppLog({
            source: 'openai',
            event: 'requisicao_falhou',
            schemaName: input.schemaName,
            errorBody: failure.message,
            attempt,
          }).catch(() => {});

          if (
            attempt < maxAttempts &&
            shouldRetryCancelledReviewError(failure, input.schemaName)
          ) {
            lastError = failure;
            continue;
          }

          throw failure;
        }

        let parsed: Record<string, unknown>;

        try {
          parsed = JSON.parse(outputText) as Record<string, unknown>;
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'OpenAI budget assistant response could not be parsed as JSON.';
          await appendAppLog({
            source: 'openai',
            event: 'requisicao_falhou',
            schemaName: input.schemaName,
            errorBody: `invalid_json: ${message}`,
            attempt,
          }).catch(() => {});
          throw new Error(
            `OpenAI budget assistant response could not be parsed as JSON during ${input.schemaName}.`,
          );
        }

        await appendAppLog({
          source: 'openai',
          event: 'requisicao_concluida',
          schemaName: input.schemaName,
          statusCode: response.status,
          attempt,
        }).catch(() => {});

        return parsed;
      } catch (error) {
        lastError = error;

        if (isAbortError(error)) {
          await appendAppLog({
            source: 'openai',
            event: 'requisicao_expirada',
            schemaName: input.schemaName,
            model,
            timeoutMs: this.timeoutMs,
            attempt,
          }).catch(() => {});
          throw new Error(
            `OpenAI budget assistant request timed out after ${this.timeoutMs}ms during ${input.schemaName}.`,
          );
        }

        const errorMessage =
          error instanceof Error ? error.message : 'unknown error';

        await appendAppLog({
          source: 'openai',
          event: 'requisicao_falhou',
          schemaName: input.schemaName,
          errorBody: errorMessage,
          attempt,
        }).catch(() => {});

        if (
          attempt < maxAttempts &&
          shouldRetryCancelledReviewError(error, input.schemaName)
        ) {
          continue;
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(
          `OpenAI budget assistant request failed during ${input.schemaName}.`,
        );
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || /abort/i.test(error.message))
  );
}

function shouldRetryCancelledReviewError(
  error: unknown,
  schemaName: string,
): boolean {
  if (schemaName !== 'proposal_draft_review') {
    return false;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /cancelled during proposal_draft_review|cancell?ed/i.test(error.message);
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeConfidence(value: unknown): 'alto' | 'medio' | 'baixo' {
  return value === 'alto' || value === 'medio' || value === 'baixo'
    ? value
    : 'baixo';
}

function normalizeSummaryTitle(value: unknown): string {
  const normalized = normalizeString(value)
    .split(/\s+/)
    .filter((item) => item.length > 0)
    .slice(0, 5)
    .join(' ')
    .trim();

  return normalized || 'Proposta em revisão';
}

function normalizeMaterialItems(
  value: unknown,
): Array<{
  description: string;
  quantityText: string;
  sourceQuery: string | null;
  catalogItemId: string | null;
  catalogItemName: string | null;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      description:
        typeof item === 'object' && item !== null && 'description' in item
          ? normalizeString(item.description)
          : '',
      quantityText:
        typeof item === 'object' && item !== null && 'quantityText' in item
          ? normalizeString(item.quantityText)
          : '',
      sourceQuery:
        typeof item === 'object' && item !== null && 'sourceQuery' in item
          ? normalizeNullableString(item.sourceQuery)
          : null,
      catalogItemId:
        typeof item === 'object' && item !== null && 'catalogItemId' in item
          ? normalizeNullableString(item.catalogItemId)
          : null,
      catalogItemName:
        typeof item === 'object' && item !== null && 'catalogItemName' in item
          ? normalizeNullableString(item.catalogItemName)
          : null,
    }))
    .filter((item) => item.description.length > 0);
}

function normalizeServiceItems(
  value: unknown,
): Array<{
  description: string;
  quantityText: string;
  estimatedValueText: string;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => ({
      description:
        typeof item === 'object' && item !== null && 'description' in item
          ? normalizeString(item.description)
          : '',
      quantityText:
        typeof item === 'object' && item !== null && 'quantityText' in item
          ? normalizeString(item.quantityText)
          : '',
      estimatedValueText:
        typeof item === 'object' && item !== null && 'estimatedValueText' in item
          ? normalizeString(item.estimatedValueText)
          : '',
    }))
    .filter((item) => item.description.length > 0);
}

function normalizeLaborPriceResearch(value: unknown, context: {
  originalText: string;
  workDescription: string;
  materialQueryCount: number;
  serviceItemCount: number;
}): {
  status: 'pendente' | 'estimado';
  summary: string;
  estimatedLaborRange: string | null;
  estimatedHours: string | null;
  basis: string | null;
  confidence: 'alto' | 'medio' | 'baixo';
} {
  if (typeof value !== 'object' || value === null) {
    return {
      status: 'pendente',
      summary: '',
      estimatedLaborRange: null,
      estimatedHours: null,
      basis: null,
      confidence: 'baixo',
    };
  }

  const status =
    'status' in value && value.status === 'estimado'
      ? 'estimado'
      : 'pendente';

  const summary =
    'summary' in value ? normalizeString(value.summary) : '';
  const estimatedLaborRange =
    'estimatedLaborRange' in value
      ? normalizeNullableString(value.estimatedLaborRange)
      : null;
  const estimatedHours =
    'estimatedHours' in value
      ? normalizeNullableString(value.estimatedHours)
      : null;
  const basis =
    'basis' in value ? normalizeNullableString(value.basis) : null;
  const confidence =
    'confidence' in value ? normalizeConfidence(value.confidence) : 'baixo';

  const fallbackEstimate = buildWeakLaborEstimate(context);

  return {
    status,
    summary,
    estimatedLaborRange:
      status === 'estimado'
        ? estimatedLaborRange ?? fallbackEstimate.estimatedLaborRange
        : estimatedLaborRange,
    estimatedHours:
      status === 'estimado'
        ? estimatedHours ?? fallbackEstimate.estimatedHours
        : estimatedHours,
    basis:
      status === 'estimado'
        ? basis ?? fallbackEstimate.basis
        : basis,
    confidence,
  };
}

function buildWeakLaborEstimate(context: {
  originalText: string;
  workDescription: string;
  materialQueryCount: number;
  serviceItemCount: number;
}): {
  estimatedLaborRange: string;
  estimatedHours: string;
  basis: string;
} {
  const normalizedContext = normalizeString(
    `${context.originalText} ${context.workDescription}`.toLowerCase(),
  );

  let minValue = 180;
  let maxValue = 320;
  let minHours = 3;
  let maxHours = 5;

  if (
    /servidor|windows server|firebird|licenca|licen[çc]a|desktop virtual|virtual/i.test(
      normalizedContext,
    )
  ) {
    minValue = 650;
    maxValue = 1400;
    minHours = 8;
    maxHours = 16;
  } else if (
    /camera|cameras|câmera|câmeras|switch|rj45|cabo|rede/i.test(normalizedContext)
  ) {
    minValue = 220;
    maxValue = 520;
    minHours = 4;
    maxHours = 8;
  } else if (
    /quadro|eletric|fiação|fiacao|refletor|interfone/i.test(normalizedContext)
  ) {
    minValue = 260;
    maxValue = 680;
    minHours = 4;
    maxHours = 10;
  }

  const complexityBoost = Math.max(
    0,
    context.materialQueryCount - 2,
  ) * 35 + Math.max(0, context.serviceItemCount - 1) * 60;

  minValue += complexityBoost;
  maxValue += complexityBoost * 2;
  minHours += Math.floor(Math.max(0, context.materialQueryCount - 2) / 2);
  maxHours += Math.max(0, context.serviceItemCount - 1);

  return {
    estimatedLaborRange: `R$ ${minValue} a R$ ${maxValue}`,
    estimatedHours: `${minHours} a ${maxHours} horas`,
    basis: 'estimativa local fraca derivada do contexto operacional',
  };
}

function buildReviewBehaviorInstruction(
  reviewBehavior?: 'manual' | 'double-check' | 'suggestion-only',
): string {
  if (reviewBehavior === 'double-check') {
    return 'Modo de revisão ativo: dupla conferência. Seja mais conservador, destaque inconsistências, confirme coerência entre blocos e evite aceitar ambiguidades sem apontá-las explicitamente.';
  }

  if (reviewBehavior === 'suggestion-only') {
    return 'Modo de revisão ativo: somente sugestão assistida. Preserve ao máximo a estrutura atual do rascunho e proponha ajustes mínimos e objetivos, sem reescrever tudo desnecessariamente.';
  }

  return 'Modo de revisão ativo: manual com aprovação. Faça a revisão comercial padrão do NEXA, com liberdade para reorganizar o texto quando isso melhorar clareza e conferência.';
}

function buildReviewInstructionsInstruction(reviewInstructions: string): string {
  if (reviewInstructions.trim().length === 0) {
    return 'Não há instruções adicionais do operador nesta revisão. Portanto, faça somente a revisão padrão do orçamento: confira coerência do texto, corrija problemas óbvios, revise valores de serviços e mão de obra, e inclua somas, subtotais e totais que ajudem na conferência manual.';
  }

  return 'Há instruções adicionais do operador nesta revisão. Use-as como orientação complementar prioritária para acrescentar, remover, corrigir ou reorganizar o rascunho conforme solicitado.';
}

function extractOutputText(
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>,
): string | null {
  for (const item of output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  return null;
}
