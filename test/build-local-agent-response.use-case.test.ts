import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLocalAgentResponse } from '../src/application/use-cases/build-local-agent-response';

test('builds a deterministic local agent response from the original text and local analysis', async () => {
  const result = await buildLocalAgentResponse({
    originalText: 'Instalar cabo pp e conector bnc para o cliente exemplo',
    budgetContext: {
      type: 'local_budget_context_built',
      customer: {
        contact: {
          id: '999',
          name: 'Cliente Exemplo Ltda',
          code: 'CLI001',
          status: 'A',
          documentNumber: '12345678000199',
          phone: '(16) 3000-0000',
          mobilePhone: '(16) 99999-0000',
        },
        quotes: [],
        serviceNotes: [],
        summary: {
          quoteCount: 2,
          serviceNoteCount: 1,
          latestQuoteDate: '2026-03-25',
          latestServiceNoteDate: '2026-03-28',
        },
      },
      materials: [
        {
          query: 'cabo pp',
          totalMatches: 1,
          matches: [
            {
              id: '1',
              name: 'Cabo PP 2x1,5mm',
              code: 'CABO215',
              price: 8.5,
              costPrice: 5.2,
              stockQuantity: 12,
              type: 'P',
              status: 'A',
            },
          ],
        },
        {
          query: 'conector bnc',
          totalMatches: 1,
          matches: [
            {
              id: '2',
              name: 'Conector BNC',
              code: 'BNC1',
              price: 3,
              costPrice: 1.5,
              stockQuantity: 30,
              type: 'P',
              status: 'A',
            },
          ],
        },
      ],
    },
    materialAnalysis: {
      type: 'local_budget_materials_analyzed',
      summary: {
        matchedItems: [
          {
            id: '1',
            name: 'Cabo PP 2x1,5mm',
            code: 'CABO215',
            price: 8.5,
            costPrice: 5.2,
            stockQuantity: 12,
            type: 'P',
            status: 'A',
            sourceQuery: 'cabo pp',
          },
          {
            id: '2',
            name: 'Conector BNC',
            code: 'BNC1',
            price: 3,
            costPrice: 1.5,
            stockQuantity: 30,
            type: 'P',
            status: 'A',
            sourceQuery: 'conector bnc',
          },
        ],
        financial: {
          totals: {
            sale: 11.5,
            cost: 6.7,
            grossProfit: 4.8,
          },
          itemsWithCompleteBase: 2,
          itemsMissingSalePrice: [],
          itemsMissingCostPrice: [],
        },
        alerts: [],
      },
    },
  });

  assert.equal(result.type, 'local_agent_response_built');
  assert.equal(result.response.status, 'Aguardando aprovacao');
  assert.equal(result.response.confidence, 'medio');
  assert.equal(result.response.receivedText, 'Instalar cabo pp e conector bnc para o cliente exemplo');
  assert.match(result.response.structuredSuggestion, /Cliente Exemplo Ltda/);
  assert.match(result.response.structuredSuggestion, /Cabo PP 2x1,5mm/);
  assert.equal(result.response.financialSummary.saleTotal, 11.5);
  assert.equal(result.response.baseUsed.includes('catalogo local de produtos'), true);
});

test('downgrades confidence and emits points of attention when local material analysis has alerts', async () => {
  const result = await buildLocalAgentResponse({
    originalText: 'Verificar item sem base',
    budgetContext: {
      type: 'local_budget_context_built',
      customer: null,
      materials: [],
    },
    materialAnalysis: {
      type: 'local_budget_materials_analyzed',
      summary: {
        matchedItems: [],
        financial: {
          totals: {
            sale: 0,
            cost: 0,
            grossProfit: 0,
          },
          itemsWithCompleteBase: 0,
          itemsMissingSalePrice: [],
          itemsMissingCostPrice: [],
        },
        alerts: ['Nenhum material local encontrado para a consulta "item sem base".'],
      },
    },
  });

  assert.equal(result.response.confidence, 'baixo');
  assert.equal(result.response.pointsOfAttention.length, 2);
});
