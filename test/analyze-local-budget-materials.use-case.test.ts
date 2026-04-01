import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeLocalBudgetMaterials } from '../src/application/use-cases/analyze-local-budget-materials';

test('builds a local material analysis with matched items, financial summary and missing-base alerts', async () => {
  const result = await analyzeLocalBudgetMaterials({
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
      {
        query: 'caixa de passagem',
        totalMatches: 0,
        matches: [],
      },
      {
        query: 'fonte 12v',
        totalMatches: 1,
        matches: [
          {
            id: '3',
            name: 'Fonte 12V 5A',
            code: 'FONTE12V',
            price: null,
            costPrice: 18,
            stockQuantity: 4,
            type: 'P',
            status: 'A',
          },
        ],
      },
    ],
  });

  assert.equal(result.type, 'local_budget_materials_analyzed');
  assert.equal(result.summary.matchedItems.length, 3);
  assert.deepEqual(result.summary.matchedItems.map((item: { id: string }) => item.id), [
    '1',
    '2',
    '3',
  ]);
  assert.equal(result.summary.financial.totals.sale, 11.5);
  assert.equal(result.summary.financial.totals.cost, 24.7);
  assert.equal(result.summary.financial.totals.grossProfit, -13.2);
  assert.equal(result.summary.financial.itemsWithCompleteBase, 2);
  assert.equal(result.summary.financial.itemsMissingSalePrice.length, 1);
  assert.equal(result.summary.alerts.length, 2);
});

test('returns empty analysis when there are no candidate materials', async () => {
  const result = await analyzeLocalBudgetMaterials({
    materials: [],
  });

  assert.equal(result.summary.matchedItems.length, 0);
  assert.equal(result.summary.financial.totals.sale, 0);
  assert.equal(result.summary.alerts.length, 0);
});

test('does not accept incompatible switch size as the primary material match', async () => {
  const result = await analyzeLocalBudgetMaterials({
    materials: [
      {
        query: 'switch 4 portas',
        totalMatches: 2,
        matches: [
          {
            id: '1',
            name: 'Switch 8 Portas Multilaser GIGABIT RE608',
            code: null,
            price: 226.32,
            costPrice: 106.21,
            stockQuantity: 0,
            type: 'P',
            status: 'A',
          },
          {
            id: '2',
            name: 'SWITCH TENDA TEG1024D 24P GIGABIT RACK IMP',
            code: null,
            price: 725,
            costPrice: 489.8,
            stockQuantity: 0,
            type: 'P',
            status: 'A',
          },
        ],
      },
    ],
  });

  assert.equal(result.summary.matchedItems.length, 0);
  assert.equal(result.summary.alerts.length, 1);
  assert.match(
    result.summary.alerts[0] ?? '',
    /Sem correspondencia local suficientemente aderente/,
  );
});
