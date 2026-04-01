import test from 'node:test';
import assert from 'node:assert/strict';

import { generateAiBudgetProposalDraft } from '../src/application/use-cases/generate-ai-budget-proposal-draft';
import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';

class FakeProductCatalogCache implements BlingProductCatalogCache {
  async read() {
    return {
      syncedAt: '2026-03-31T00:00:00.000Z',
      items: [
        {
          id: 'cam-1',
          name: 'Câmera IP 2MP',
          code: 'CAM',
          price: 220,
          costPrice: 140,
          stockQuantity: 10,
          type: 'P',
          status: 'A',
        },
        {
          id: 'cabo-1',
          name: 'Cabo de rede CAT5E Furukawa',
          code: 'CABO',
          price: 180.5,
          costPrice: 120.3,
          stockQuantity: 5,
          type: 'P',
          status: 'A',
        },
      ],
    };
  }

  async write() {}
}

test('generates a proposal draft from an approved AI budget session', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'sess-1',
    createdAt: '2026-03-30T18:00:00.000Z',
    updatedAt: '2026-03-30T18:00:00.000Z',
    originalText: 'Instalar duas câmeras IP no posto Alonso',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Aprovado para proposta',
    payload: {
      resolvedCustomer: {
        id: 'contact-1',
        name: 'Posto Alonso LTDA',
        code: 'CLI001',
        documentNumber: '12345678000199',
        phone: '(16) 3000-0000',
        mobilePhone: '(16) 99999-0000',
      },
      aiResponse: {
        interpretation: {
          budgetDescription: 'Instalação de duas câmeras IP com infraestrutura de rede.',
          workDescription: 'Execução com cabeamento, fixação e configuração básica.',
          materialItems: [
            {
              description: 'Câmera IP 2MP',
              quantityText: '2 unidades',
              catalogItemId: 'cam-1',
              catalogItemName: 'Câmera IP 2MP',
            },
            {
              description: 'Cabo de rede CAT5E Furukawa',
              quantityText: '1 rolo',
              catalogItemId: 'cabo-1',
              catalogItemName: 'Cabo de rede CAT5E Furukawa',
            },
          ],
          serviceItems: [
            {
              description: 'Instalação e configuração das câmeras',
              quantityText: '2 pontos',
              estimatedValueText: 'R$ 350 a R$ 520',
            },
          ],
          pointsOfAttention: ['Confirmar necessidade de switch PoE.'],
        },
      },
      localResponse: {
        response: {
          financialSummary: {
            saleTotal: 620.5,
            costTotal: 401.2,
            grossProfit: 219.3,
          },
        },
      },
    },
  });

  const result = await generateAiBudgetProposalDraft(
    {
      sessionId: 'sess-1',
      generatedAt: new Date('2026-03-30T18:15:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      productCatalogCache: new FakeProductCatalogCache(),
    },
  );

  assert.equal(result.type, 'ai_budget_proposal_draft_generated');
  assert.equal(result.session.status, 'Proposta comercial pronta');
  assert.equal(result.proposalDraft.customerQuery, 'Posto Alonso');
  assert.match(result.proposalDraft.title, /Posto Alonso LTDA/);
  assert.match(result.proposalDraft.commercialBody, /Instalação de duas câmeras IP/);
  assert.match(result.proposalDraft.commercialBody, /Cliente: Posto Alonso LTDA/);
  assert.match(result.proposalDraft.commercialBody, /Serviços contemplados:/);
  assert.match(result.proposalDraft.commercialBody, /Instalação e configuração das câmeras/);
  assert.doesNotMatch(result.proposalDraft.commercialBody, /Pontos de atenção:/);
  assert.doesNotMatch(
    result.proposalDraft.commercialBody,
    /Resumo financeiro preliminar dos materiais|Venda estimada|Custo estimado|Lucro bruto estimado/,
  );
  assert.equal(result.proposalDraft.materialItems.length, 2);
  assert.equal(result.proposalDraft.serviceItems.length, 1);
  assert.equal(result.proposalDraft.resolvedCustomer?.id, 'contact-1');
  assert.equal(result.proposalDraft.financialSummary.saleTotal, 620.5);
  assert.equal(result.proposalDraft.financialSummary.costTotal, 400.3);
  assert.equal(result.proposalDraft.financialSummary.grossProfit, 220.2);

  const stored = await repository.findById('sess-1');
  assert.equal(stored?.status, 'Proposta comercial pronta');
  assert.equal(
    (stored?.payload as { proposalDraft?: { generatedAt?: string } }).proposalDraft?.generatedAt,
    '2026-03-30T18:15:00.000Z',
  );
});

test('rejects proposal draft generation when the session is not approved yet', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'sess-2',
    createdAt: '2026-03-30T18:00:00.000Z',
    updatedAt: '2026-03-30T18:00:00.000Z',
    originalText: 'Texto inicial',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Aguardando aprovacao',
    payload: {},
  });

  await assert.rejects(
    () =>
      generateAiBudgetProposalDraft(
        {
          sessionId: 'sess-2',
        },
        {
          aiBudgetSessionRepository: repository,
          productCatalogCache: new FakeProductCatalogCache(),
        },
      ),
    /must be approved/,
  );
});
