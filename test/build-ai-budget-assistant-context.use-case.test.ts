import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAiBudgetAssistantContext } from '../src/application/use-cases/build-ai-budget-assistant-context';

test('builds a deterministic AI context package with local customer, materials and operating rules', async () => {
  const result = await buildAiBudgetAssistantContext({
    originalText: 'Instalar cabo pp 3 x 1,5 para Cliente Exemplo no barracao',
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
        quotes: [
          {
            id: '101',
            date: '2026-03-20',
            status: 'Aprovado',
            total: 4200.5,
            productsTotal: 3100,
            number: '87',
            contactId: '999',
            storeId: '5',
          },
        ],
        serviceNotes: [
          {
            id: '501',
            number: '1',
            rpsNumber: '000001',
            series: '1',
            status: 1,
            issueDate: '2026-03-28',
            value: 1212,
            contactId: '999',
            contactName: 'Cliente Exemplo Ltda',
            contactDocument: '12345678000199',
            contactEmail: 'cliente@example.com',
            link: null,
            verificationCode: null,
          },
        ],
        summary: {
          quoteCount: 1,
          serviceNoteCount: 1,
          latestQuoteDate: '2026-03-20',
          latestServiceNoteDate: '2026-03-28',
        },
      },
      materials: [
        {
          query: 'cabo pp 3 x 1,5',
          totalMatches: 2,
          matches: [
            {
              id: '1',
              name: 'Cabo PP 3x1,5mm',
              code: 'CABOPP315',
              price: 12.5,
              costPrice: 7.2,
              stockQuantity: 15,
              type: 'P',
              status: 'A',
            },
            {
              id: '2',
              name: 'Cabo PP 3 x 1,5mm Blindado',
              code: 'CABOBL315',
              price: 18,
              costPrice: 11,
              stockQuantity: 8,
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
            name: 'Cabo PP 3x1,5mm',
            code: 'CABOPP315',
            price: 12.5,
            costPrice: 7.2,
            stockQuantity: 15,
            type: 'P',
            status: 'A',
            sourceQuery: 'cabo pp 3 x 1,5',
          },
        ],
        financial: {
          totals: {
            sale: 12.5,
            cost: 7.2,
            grossProfit: 5.3,
          },
          itemsWithCompleteBase: 1,
          itemsMissingSalePrice: [],
          itemsMissingCostPrice: [],
        },
        alerts: [],
      },
    },
  });

  assert.equal(result.type, 'ai_budget_assistant_context_built');
  assert.equal(result.payload.task, 'interpret_budget_request');
  assert.equal(result.payload.customer?.contact.name, 'Cliente Exemplo Ltda');
  assert.equal(result.payload.customer?.history.quoteCount, 1);
  assert.equal(result.payload.materialCandidates[0]?.query, 'cabo pp 3 x 1,5');
  assert.equal(result.payload.materialCandidates[0]?.candidates.length, 2);
  assert.equal(result.payload.materialFinancialSummary.saleTotal, 12.5);
  assert.equal(result.payload.materialFinancialSummary.grossProfit, 5.3);
  assert.ok(
    result.payload.operatingRules.includes(
      'Nunca executar criacao de orçamento ou qualquer acao operacional sem aprovacao explicita do usuario.',
    ),
  );
  assert.ok(
    result.payload.operatingRules.includes(
      'Itens inferidos ou sugeridos nunca devem ser tratados como confirmados sem validacao do usuario.',
    ),
  );
});

