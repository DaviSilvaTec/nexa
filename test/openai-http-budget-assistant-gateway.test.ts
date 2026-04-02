import test from 'node:test';
import assert from 'node:assert/strict';

import { OpenAIHttpBudgetAssistantGateway } from '../src/infrastructure/integrations/openai/openai-http-budget-assistant-gateway';

test('extracts budget intake using the OpenAI Responses API contract', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5.2',
    fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            customerQuery: 'cliente exemplo',
            materialQueries: ['cabo pp 3 x 1,5'],
            serviceHints: ['instalacao'],
            ambiguities: ['Validar metragem.'],
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  const result = await gateway.extractBudgetIntake(
    'Instalar cabo pp 3 x 1,5 para cliente exemplo',
  );

  assert.equal(capturedUrl, 'https://api.openai.com/v1/responses');
  assert.equal(capturedInit?.method, 'POST');
  assert.equal(
    (capturedInit?.headers as Headers).get('Authorization'),
    'Bearer openai-key-1',
  );

  const body = JSON.parse(String(capturedInit?.body)) as {
    model: string;
    text: {
      format: {
        type: string;
        name: string;
        strict: boolean;
      };
    };
  };

  assert.equal(body.model, 'gpt-5.2');
  assert.equal(body.text.format.type, 'json_schema');
  assert.equal(body.text.format.name, 'budget_intake_extraction');
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(result, {
    type: 'budget_intake_extracted',
    extraction: {
      customerQuery: 'cliente exemplo',
      materialQueries: ['cabo pp 3 x 1,5'],
      serviceHints: ['instalacao'],
      ambiguities: ['Validar metragem.'],
    },
  });
});

test('uses a model override for intake extraction when requested', async () => {
  let capturedInit: RequestInit | undefined;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5-nano',
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            customerQuery: 'cliente exemplo',
            materialQueries: [],
            serviceHints: [],
            ambiguities: [],
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  await gateway.extractBudgetIntake('Texto de teste', {
    modelOverride: 'gpt-5.4',
  });

  const body = JSON.parse(String(capturedInit?.body)) as { model: string };
  assert.equal(body.model, 'gpt-5.4');
});

test('falls back to output message content when output_text is missing', async () => {
  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5-nano',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          output: [
            {
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    customerQuery: 'cliente exemplo',
                    materialQueries: ['cabo pp 3 x 1,5'],
                    serviceHints: ['instalacao'],
                    ambiguities: [],
                  }),
                },
              ],
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
  });

  const result = await gateway.extractBudgetIntake(
    'Instalar cabo pp 3 x 1,5 para cliente exemplo',
  );

  assert.equal(result.extraction.customerQuery, 'cliente exemplo');
  assert.deepEqual(result.extraction.materialQueries, ['cabo pp 3 x 1,5']);
});

test('interprets budget request using the OpenAI Responses API contract', async () => {
  let capturedInit: RequestInit | undefined;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5.2',
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            summaryTitle: 'Instalação de cabeamento validada',
            budgetDescription: 'Orçamento para instalação de cabeamento com validação final.',
            workDescription: 'Execução do serviço de instalação e conferência da infraestrutura.',
            materialItems: [
              {
                description: 'Cabo PP 3x1,5',
                quantityText: 'quantidade a confirmar',
                sourceQuery: 'cabo pp 3 x 1,5',
                catalogItemId: '1',
                catalogItemName: 'Cabo PP 3x1,5mm',
              },
            ],
            serviceItems: [
              {
                description: 'Instalação do cabeamento',
                quantityText: '1 serviço',
                estimatedValueText: 'R$ 180 a R$ 320',
              },
            ],
            laborPriceResearch: {
              status: 'estimado',
              summary:
                'Estimativa inicial fraca de mão de obra baseada nos materiais normalizados e na descrição do serviço; validar depois no fechamento final.',
              estimatedLaborRange: 'R$ 180 a R$ 320',
              estimatedHours: '3 a 5 horas',
              basis: 'descrição do serviço e materiais canônicos normalizados',
              confidence: 'baixo',
            },
            pendingQuestions: ['Confirmar metragem do cabo.'],
            pointsOfAttention: ['Cliente localizado localmente.'],
            suggestions: ['Confirmar metragem antes da aprovacao.'],
            confidence: 'medio',
            rationale: 'Texto com contexto suficiente, mas ainda sem quantidade fechada.',
            expectedUserAction: 'Revisar e confirmar os detalhes pendentes.',
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  const result = await gateway.interpretBudgetRequest({
    task: 'interpret_budget_request',
    originalText: 'Instalar cabo pp 3 x 1,5 para cliente exemplo',
    customer: null,
    materialCandidates: [],
    materialFinancialSummary: {
      saleTotal: 0,
      costTotal: 0,
      grossProfit: 0,
      itemsWithCompleteBase: 0,
      alerts: [],
    },
    operatingRules: ['Nunca executar sem aprovacao.'],
  });

  const body = JSON.parse(String(capturedInit?.body)) as {
    input: string;
    text: {
      format: {
        name: string;
      };
    };
  };

  assert.equal(body.text.format.name, 'budget_request_interpretation');
  assert.match(
    body.input,
    /estimativa deve ser fraca/i,
  );
  assert.match(
    body.input,
    /materiais canonicos/i,
  );
  assert.match(
    body.input,
    /distancias|tubula[cç][õo]es|rotas|contexto t[eé]cnico/i,
  );
  assert.match(
    body.input,
    /eletrodutos|conduletes|abra[cç]adeira|bucha 6|parafuso/i,
  );
  assert.match(
    body.input,
    /reais brasileiros|R\$/i,
  );
  assert.equal(result.type, 'budget_request_interpreted');
  assert.equal(
    result.interpretation.summaryTitle,
    'Instalação de cabeamento validada',
  );
  assert.equal(result.interpretation.confidence, 'medio');
  assert.equal(
    result.interpretation.serviceItems[0]?.estimatedValueText,
    'R$ 180 a R$ 320',
  );
  assert.equal(result.interpretation.laborPriceResearch.status, 'estimado');
  assert.equal(
    result.interpretation.laborPriceResearch.estimatedLaborRange,
    'R$ 180 a R$ 320',
  );
  assert.equal(
    result.interpretation.laborPriceResearch.estimatedHours,
    '3 a 5 horas',
  );
  assert.equal(
    result.interpretation.laborPriceResearch.basis,
    'descrição do serviço e materiais canônicos normalizados',
  );
  assert.equal(result.interpretation.laborPriceResearch.confidence, 'baixo');
  assert.equal(
    result.interpretation.budgetDescription,
    'Orçamento para instalação de cabeamento com validação final.',
  );
  assert.equal(
    result.interpretation.materialItems[0]?.description,
    'Cabo PP 3x1,5',
  );
  assert.equal(result.interpretation.materialItems[0]?.catalogItemId, '1');
});

test('uses a model override for request interpretation when requested', async () => {
  let capturedInit: RequestInit | undefined;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5-nano',
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            summaryTitle: 'Resumo de teste',
            budgetDescription: 'Descrição.',
            workDescription: 'Escopo.',
            materialItems: [],
            serviceItems: [],
            laborPriceResearch: {
              status: 'estimado',
              summary: 'Estimativa.',
              estimatedLaborRange: 'R$ 100 a R$ 200',
              estimatedHours: '1 a 2 horas',
              basis: 'teste',
              confidence: 'baixo',
            },
            pendingQuestions: [],
            pointsOfAttention: [],
            suggestions: [],
            confidence: 'baixo',
            rationale: 'Teste.',
            expectedUserAction: 'Revisar.',
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  await gateway.interpretBudgetRequest(
    {
      task: 'interpret_budget_request',
      originalText: 'Texto de teste',
      customer: null,
      materialCandidates: [],
      materialFinancialSummary: {
        saleTotal: 0,
        costTotal: 0,
        grossProfit: 0,
        itemsWithCompleteBase: 0,
        alerts: [],
      },
      operatingRules: [],
    },
    {
      modelOverride: 'gpt-5.4-mini',
    },
  );

  const body = JSON.parse(String(capturedInit?.body)) as { model: string };
  assert.equal(body.model, 'gpt-5.4-mini');
});

test('fills a weak labor estimate in BRL when the model omits the monetary range', async () => {
  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5.2',
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            summaryTitle: 'Revisão de orçamento do posto',
            budgetDescription: 'Orçamento inicial.',
            workDescription: 'Instalação de duas câmeras IP com cabeamento e switch.',
            materialItems: [],
            serviceItems: [
              {
                description: 'Instalação de câmeras',
                quantityText: '2 unidades',
                estimatedValueText: 'R$ 250 a R$ 420',
              },
            ],
            laborPriceResearch: {
              status: 'estimado',
              summary: 'Estimativa inicial fraca para planejamento.',
              estimatedLaborRange: null,
              estimatedHours: null,
              basis: null,
              confidence: 'baixo',
            },
            pendingQuestions: [],
            pointsOfAttention: [],
            suggestions: [],
            confidence: 'medio',
            rationale: 'ok',
            expectedUserAction: 'ok',
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
  });

  const result = await gateway.interpretBudgetRequest({
    task: 'interpret_budget_request',
    originalText:
      'Instalar duas câmeras IP com cabo de rede, conectores RJ45 e switch 4 portas.',
    customer: null,
    materialCandidates: [
      { query: 'camera ip 2mp', totalMatches: 1, candidates: [] },
      { query: 'switch 4 portas', totalMatches: 1, candidates: [] },
      { query: 'cabo de rede', totalMatches: 1, candidates: [] },
    ],
    materialFinancialSummary: {
      saleTotal: 0,
      costTotal: 0,
      grossProfit: 0,
      itemsWithCompleteBase: 0,
      alerts: [],
    },
    operatingRules: ['Nunca executar sem aprovacao.'],
  });

  assert.equal(result.interpretation.laborPriceResearch.status, 'estimado');
  assert.equal(result.interpretation.summaryTitle, 'Revisão de orçamento do posto');
  assert.match(
    result.interpretation.laborPriceResearch.estimatedLaborRange || '',
    /^R\$\s*\d+/,
  );
  assert.match(
    result.interpretation.laborPriceResearch.estimatedHours || '',
    /\d+\s+a\s+\d+\s+horas/i,
  );
  assert.equal(
    result.interpretation.laborPriceResearch.basis,
    'estimativa local fraca derivada do contexto operacional',
  );
});

test('times out OpenAI requests in a controlled way', async () => {
  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5.2',
    timeoutMs: 10,
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;

        signal?.addEventListener('abort', () => {
          const error = new Error('Request aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
  });

  await assert.rejects(
    () => gateway.extractBudgetIntake('Texto longo de teste'),
    /timed out/i,
  );
});

test('uses a model override only for proposal draft review when requested', async () => {
  let capturedInit: RequestInit | undefined;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5-nano',
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            summary: 'Parecer',
            suggestedCommercialBody: 'Texto revisado',
            resolvedCustomer: null,
            resolvedMaterialItems: [],
            adjustmentNotes: [],
            confidence: 'medio',
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  await gateway.reviewProposalDraft({
    originalText: 'Texto original',
    proposalDraft: 'Rascunho',
    reviewInstructions: '',
    modelOverride: 'gpt-5.4',
    customerName: 'Cliente',
    budgetDescription: 'Descrição',
    workDescription: 'Escopo',
    materialItems: [],
    materialCandidates: [],
    customerCandidates: [],
    serviceItems: [],
    pointsOfAttention: [],
  });

  const body = JSON.parse(String(capturedInit?.body)) as { model: string };
  assert.equal(body.model, 'gpt-5.4');
});

test('asks proposal draft review to include approximate sums and subtotals', async () => {
  let capturedInit: RequestInit | undefined;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5-nano',
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            summary: 'Parecer',
            suggestedCommercialBody: 'Texto revisado',
            resolvedCustomer: null,
            resolvedMaterialItems: [],
            adjustmentNotes: [],
            confidence: 'medio',
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  await gateway.reviewProposalDraft({
    originalText: 'Texto original',
    proposalDraft: 'Rascunho',
    reviewInstructions: 'Remover um item duplicado e reorganizar os blocos.',
    customerName: 'Cliente',
    budgetDescription: 'Descrição',
    workDescription: 'Escopo',
    materialItems: [],
    materialCandidates: [],
    customerCandidates: [],
    serviceItems: [],
    pointsOfAttention: [],
  });

  const body = JSON.parse(String(capturedInit?.body)) as { input: string };
  assert.match(body.input, /somas|subtotais|totais aproximados/i);
  assert.match(body.input, /dist[aâ]ncias|tubula[cç][õo]es|rotas/i);
  assert.match(body.input, /pedido inicial.*contexto de refer[eê]ncia/i);
  assert.match(body.input, /instru[cç][õo]es adicionais do operador/i);
});

test('falls back to standard review guidance when there are no extra review instructions', async () => {
  let capturedInit: RequestInit | undefined;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5-nano',
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            summary: 'Parecer',
            suggestedCommercialBody: 'Texto revisado',
            resolvedCustomer: null,
            resolvedMaterialItems: [],
            adjustmentNotes: [],
            confidence: 'medio',
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  await gateway.reviewProposalDraft({
    originalText: 'Texto original',
    proposalDraft: 'Rascunho',
    reviewInstructions: '',
    customerName: 'Cliente',
    budgetDescription: 'Descrição',
    workDescription: 'Escopo',
    materialItems: [],
    materialCandidates: [],
    customerCandidates: [],
    serviceItems: [],
    pointsOfAttention: [],
  });

  const body = JSON.parse(String(capturedInit?.body)) as { input: string };
  assert.match(body.input, /não há instruções adicionais do operador/i);
  assert.match(body.input, /faça somente a revisão padrão do orçamento/i);
});

test('retries proposal draft review once when OpenAI cancels the request transiently', async () => {
  let attempts = 0;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5.4-mini',
    fetchImpl: async () => {
      attempts += 1;

      if (attempts === 1) {
        throw new Error(
          'OpenAI budget assistant request was cancelled during proposal_draft_review.',
        );
      }

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            summary: 'Parecer',
            suggestedCommercialBody: 'Texto revisado',
            resolvedCustomer: {
              id: '999',
              name: 'Cliente Exemplo Ltda',
              code: 'CLI001',
              documentNumber: '12345678000199',
            },
            resolvedMaterialItems: [
              {
                description: 'Cabo PP 3x1,5mm',
                quantity: 10,
                catalogItemId: '1',
                catalogItemName: 'Cabo PP 3x1,5mm',
              },
            ],
            adjustmentNotes: [],
            confidence: 'medio',
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  const result = await gateway.reviewProposalDraft({
    originalText: 'Texto original',
    proposalDraft: 'Rascunho',
    reviewInstructions: '',
    customerName: 'Cliente',
    budgetDescription: 'Descrição',
    workDescription: 'Escopo',
    materialItems: [],
    materialCandidates: [],
    customerCandidates: [],
    serviceItems: [],
    pointsOfAttention: [],
  });

  assert.equal(attempts, 2);
  assert.equal(result.review.summary, 'Parecer');
  assert.equal(result.review.resolvedCustomer?.id, '999');
  assert.equal(result.review.resolvedMaterialItems[0]?.catalogItemId, '1');
  assert.equal(result.review.resolvedMaterialItems[0]?.quantity, 10);
});

test('reconciles proposal materials using shortlist candidates', async () => {
  let capturedInit: RequestInit | undefined;

  const gateway = new OpenAIHttpBudgetAssistantGateway({
    apiKey: 'openai-key-1',
    model: 'gpt-5-nano',
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      capturedInit = init;

      return new Response(
        JSON.stringify({
          output_text: JSON.stringify({
            summary: 'Materiais conciliados.',
            materialItems: [
              {
                description: 'Cabo PP 3x1,5mm',
                quantityText: '10 metros',
                sourceQuery: 'cabo pp',
                catalogItemId: '1',
                catalogItemName: 'Cabo PP 3x1,5mm',
              },
            ],
            adjustmentNotes: ['Item principal conciliado com a shortlist.'],
            confidence: 'medio',
          }),
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    },
  });

  const result = await gateway.reconcileProposalMaterials({
    originalText: 'Instalar cabo pp',
    proposalDraft: 'Cliente: Posto Alonso',
    customerName: 'Posto Alonso',
    materialItems: [
      {
        description: 'Cabo PP',
        quantityText: '10 metros',
        sourceQuery: 'cabo pp',
        catalogItemId: null,
        catalogItemName: null,
      },
    ],
    materialCandidates: [
      {
        query: 'cabo pp',
        totalMatches: 1,
        candidates: [
          {
            id: '1',
            name: 'Cabo PP 3x1,5mm',
            code: 'CABO',
            price: 12.5,
            costPrice: 7.2,
            stockQuantity: 15,
            type: 'P',
            status: 'A',
          },
        ],
      },
    ],
  });

  const body = JSON.parse(String(capturedInit?.body)) as { input: string };
  assert.match(body.input, /reconciliando os materiais finais/i);
  assert.match(body.input, /shortlist enviada pelo backend/i);
  assert.equal(result.reconciliation.materialItems[0]?.catalogItemId, '1');
});
