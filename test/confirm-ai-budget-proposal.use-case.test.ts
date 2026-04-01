import test from 'node:test';
import assert from 'node:assert/strict';

import { confirmAiBudgetProposal } from '../src/application/use-cases/confirm-ai-budget-proposal';
import { InMemoryAiBudgetSessionRepository } from '../src/infrastructure/persistence/in-memory/in-memory-ai-budget-session-repository';
import type { BlingContactCatalogCache } from '../src/application/catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import type { BlingQuoteGateway, BlingQuotePayload } from '../src/application/gateways/bling-quote-gateway';

class InMemoryContactCatalogCache implements BlingContactCatalogCache {
  async read() {
    return {
      syncedAt: '2026-03-30T20:00:00.000Z',
      items: [
        {
          id: 'contact-2',
          name: 'ALONSO Y ALONSO AUTO POSTO LTDA',
          code: '5',
          status: 'A',
          documentNumber: '02878955000171',
          phone: '(16) 3702-3577',
          mobilePhone: null,
        },
        {
          id: 'contact-1',
          name: 'Posto Alonso',
          code: null,
          status: 'A',
          documentNumber: null,
          phone: null,
          mobilePhone: null,
        },
      ],
    };
  }

  async write() {
    throw new Error('not used');
  }
}

class FormalNameOnlyContactCatalogCache implements BlingContactCatalogCache {
  async read() {
    return {
      syncedAt: '2026-03-30T20:00:00.000Z',
      items: [
        {
          id: 'contact-2',
          name: 'ALONSO Y ALONSO AUTO POSTO LTDA',
          code: '5',
          status: 'A',
          documentNumber: '02878955000171',
          phone: '(16) 3702-3577',
          mobilePhone: null,
        },
      ],
    };
  }

  async write() {
    throw new Error('not used');
  }
}

class InMemoryProductCatalogCache implements BlingProductCatalogCache {
  async read() {
    return {
      syncedAt: '2026-03-30T20:00:00.000Z',
      items: [
        {
          id: 'product-1',
          name: 'CAMERA IP 2MP',
          code: 'CAM001',
          price: 230,
          costPrice: 150,
          stockQuantity: 2,
          type: 'P',
          status: 'A',
        },
        {
          id: 'service-1',
          name: 'Mão de Obra - SERVIÇOS DIVERSOS',
          code: 'SERV001',
          price: 1,
          costPrice: 0,
          stockQuantity: null,
          type: 'S',
          status: 'A',
        },
        {
          id: 'bucha-6',
          name: 'BUCHA FIXAÇÃO 6MM P/ TIJOLO FURADO',
          code: 'BUC006',
          price: 0.2175,
          costPrice: 0.15,
          stockQuantity: 30,
          type: 'P',
          status: 'A',
        },
        {
          id: 'kit-bucha-6',
          name: 'kit 1000 parafuso 5,0x35 e 1000 bucha 6',
          code: 'KIT006',
          price: 214.965,
          costPrice: 143.31,
          stockQuantity: 0,
          type: 'P',
          status: 'A',
        },
        {
          id: 'abrac-cabos',
          name: '50 Abracadeiras Organizar Fios Enrrolar Cabos Chicote 15cm',
          code: 'ABR001',
          price: 89.97,
          costPrice: 29.99,
          stockQuantity: 1,
          type: 'P',
          status: 'A',
        },
      ],
    };
  }

  async write() {
    throw new Error('not used');
  }
}

class CapturingBlingQuoteGateway implements BlingQuoteGateway {
  public lastPayload: BlingQuotePayload | null = null;
  public updatedQuoteId: string | null = null;

  async createQuote(payload: BlingQuotePayload) {
    this.lastPayload = payload;

    return {
      id: 'bling-quote-1',
      number: '1001',
      sourceConversationId: payload.sourceConversationId,
      description: payload.description,
      createdAt: payload.requestedAt,
    };
  }

  async updateQuote(id: string, payload: BlingQuotePayload) {
    this.updatedQuoteId = id;
    this.lastPayload = payload;

    return {
      id,
      number: '102',
      sourceConversationId: payload.sourceConversationId,
      description: payload.description,
      createdAt: payload.requestedAt,
    };
  }

  async listQuotes() {
    return { items: [], total: 0 };
  }
}

test('confirms a generated proposal and stores confirmation metadata', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const blingQuoteGateway = new CapturingBlingQuoteGateway();

  await repository.save({
    id: 'session-1',
    createdAt: '2026-03-30T18:00:00.000Z',
    updatedAt: '2026-03-30T18:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      proposalDraft: {
        generatedAt: '2026-03-30T18:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Texto comercial final',
      },
      aiResponse: {
        interpretation: {
          materialItems: [
            {
              description: 'Camera IP 2MP',
              quantityText: '2 unidades',
              catalogItemId: 'product-1',
              catalogItemName: 'CAMERA IP 2MP',
            },
          ],
          serviceItems: [
            {
              description: 'Instalação',
              quantityText: '1 serviço',
              estimatedValueText: 'R$ 180 a R$ 320',
            },
            {
              description: 'Configuração',
              quantityText: '1 serviço',
              estimatedValueText: 'R$ 100',
            },
          ],
        },
      },
    },
  });

  const result = await confirmAiBudgetProposal(
    {
      sessionId: 'session-1',
      confirmedAt: new Date('2026-03-30T18:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.equal(result.type, 'ai_budget_proposal_confirmed');
  assert.equal(result.session.status, 'Finalizada');
  assert.equal(result.blingQuote.id, 'bling-quote-1');
  assert.equal(
    (result.session.payload as { proposalConfirmation?: { confirmedAt?: string } })
      .proposalConfirmation?.confirmedAt,
    '2026-03-30T18:20:00.000Z',
  );
  assert.equal(
    (result.session.payload as { proposalDraft?: { confirmedAt?: string } }).proposalDraft
      ?.confirmedAt,
    '2026-03-30T18:20:00.000Z',
  );
  assert.deepEqual(blingQuoteGateway.lastPayload?.items, [
    {
      productId: 'product-1',
      quantity: 2,
      value: 230,
    },
    {
      productId: 'service-1',
      quantity: 280,
      value: 1,
    },
  ]);
  assert.equal(blingQuoteGateway.lastPayload?.introduction, 'Texto comercial final');
});

test('uses only the services section from the commercial body to compose the labor item', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const blingQuoteGateway = new CapturingBlingQuoteGateway();

  await repository.save({
    id: 'session-labor-body',
    createdAt: '2026-03-31T23:00:00.000Z',
    updatedAt: '2026-03-31T23:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      proposalDraft: {
        generatedAt: '2026-03-31T23:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: `Cliente: Posto Alonso

Descrição principal:
Texto comercial.

Materiais previstos:
- Item 1 — R$ 540 a 940

Serviços contemplados:
- Instalação do ventilador de teto — R$ 180 a 400
- Montagem da rede elétrica — R$ 350 a 750

Totais estimados:
- Materiais: R$ 540 a 940
- Serviços: R$ 530 a 1.150
- Subtotal estimado (Materiais + Serviços): R$ 1.070 a 2.090

Observações técnicas:
- Observação final.`,
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
          serviceItems: [
            {
              description: 'Instalação do ventilador de teto',
              quantityText: '1 unidade',
              estimatedValueText: 'R$ 180 a R$ 400',
            },
            {
              description: 'Montagem da rede elétrica',
              quantityText: '1 serviço',
              estimatedValueText: 'R$ 350 a R$ 750',
            },
          ],
          laborPriceResearch: {
            status: 'estimado',
            summary: 'Estimativa inicial',
            estimatedLaborRange: 'R$ 530 a R$ 1.150',
            estimatedHours: '4 a 8 horas',
            basis: 'Base local',
            confidence: 'medio',
          },
        },
      },
    },
  });

  await confirmAiBudgetProposal(
    {
      sessionId: 'session-labor-body',
      confirmedAt: new Date('2026-03-31T23:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.deepEqual(blingQuoteGateway.lastPayload?.items, [
    {
      productId: 'service-1',
      quantity: 530,
      value: 1,
    },
  ]);
});

test('prioritizes the named minimum labor line from the commercial body when it exists', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const blingQuoteGateway = new CapturingBlingQuoteGateway();

  await repository.save({
    id: 'session-labor-named-average',
    createdAt: '2026-03-31T23:00:00.000Z',
    updatedAt: '2026-03-31T23:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      proposalDraft: {
        generatedAt: '2026-03-31T23:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: `Cliente: Posto Alonso

Descrição principal:
Texto comercial.

Serviços contemplados:
- Instalação do ventilador de teto — R$ 180 a 400
- Montagem da rede elétrica — R$ 350 a 750

Soma mínima da mão de obra: R$ 530

Totais estimados:
- Subtotal estimado (Materiais + Serviços): R$ 1.070 a 2.090`,
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
          serviceItems: [
            {
              description: 'Instalação do ventilador de teto',
              quantityText: '1 unidade',
              estimatedValueText: 'R$ 180 a R$ 400',
            },
            {
              description: 'Montagem da rede elétrica',
              quantityText: '1 serviço',
              estimatedValueText: 'R$ 350 a R$ 750',
            },
          ],
        },
      },
    },
  });

  await confirmAiBudgetProposal(
    {
      sessionId: 'session-labor-named-average',
      confirmedAt: new Date('2026-03-31T23:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.deepEqual(blingQuoteGateway.lastPayload?.items, [
    {
      productId: 'service-1',
      quantity: 530,
      value: 1,
    },
  ]);
});

test('filters incompatible packaging and cable-tie matches before sending items to Bling', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const blingQuoteGateway = new CapturingBlingQuoteGateway();

  await repository.save({
    id: 'session-material-filter',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      aiContext: {
        payload: {
          materialCandidates: [
            {
              query: 'bucha',
              totalMatches: 3,
              candidates: [
                {
                  id: 'kit-bucha-6',
                  name: 'kit 1000 parafuso 5,0x35 e 1000 bucha 6',
                  code: 'KIT006',
                  price: 214.965,
                  costPrice: 143.31,
                  stockQuantity: 0,
                  type: 'P',
                  status: 'A',
                },
                {
                  id: 'bucha-6',
                  name: 'BUCHA FIXAÇÃO 6MM P/ TIJOLO FURADO',
                  code: 'BUC006',
                  price: 0.2175,
                  costPrice: 0.15,
                  stockQuantity: 30,
                  type: 'P',
                  status: 'A',
                },
              ],
            },
            {
              query: 'bracadeiras',
              totalMatches: 1,
              candidates: [
                {
                  id: 'abrac-cabos',
                  name: '50 Abracadeiras Organizar Fios Enrrolar Cabos Chicote 15cm',
                  code: 'ABR001',
                  price: 89.97,
                  costPrice: 29.99,
                  stockQuantity: 1,
                  type: 'P',
                  status: 'A',
                },
              ],
            },
          ],
        },
      },
      proposalDraft: {
        generatedAt: '2026-04-01T00:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Texto comercial atualizado',
        materialItems: [
          {
            description: 'Buchas 6 mm para fixação',
            quantityText: '20 unidades',
            sourceQuery: 'bucha',
            catalogItemId: 'kit-bucha-6',
            catalogItemName: 'kit 1000 parafuso 5,0x35 e 1000 bucha 6',
          },
          {
            description: 'Abraçadeiras para condução',
            quantityText: '15 unidades',
            sourceQuery: 'bracadeiras',
            catalogItemId: 'abrac-cabos',
            catalogItemName: '50 Abracadeiras Organizar Fios Enrrolar Cabos Chicote 15cm',
          },
        ],
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
        },
      },
    },
  });

  await confirmAiBudgetProposal(
    {
      sessionId: 'session-material-filter',
      confirmedAt: new Date('2026-04-01T00:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.deepEqual(blingQuoteGateway.lastPayload?.items, [
    {
      productId: 'bucha-6',
      quantity: 20,
      value: 0.2175,
    },
  ]);
});

test('preserves the reconciled catalog item id when the original shortlist is stale', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const blingQuoteGateway = new CapturingBlingQuoteGateway();

  await repository.save({
    id: 'session-preserve-id',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      aiContext: {
        payload: {
          materialCandidates: [
            {
              query: 'bucha',
              totalMatches: 1,
              candidates: [
                {
                  id: 'kit-bucha-6',
                  name: 'kit 1000 parafuso 5,0x35 e 1000 bucha 6',
                  code: 'KIT006',
                  price: 214.965,
                  costPrice: 143.31,
                  stockQuantity: 0,
                  type: 'P',
                  status: 'A',
                },
              ],
            },
          ],
        },
      },
      proposalDraft: {
        generatedAt: '2026-04-01T00:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Texto comercial atualizado',
        materialItems: [
          {
            description: 'Buchas 6 mm para fixação',
            quantityText: '20 unidades',
            sourceQuery: 'bucha',
            catalogItemId: 'bucha-6',
            catalogItemName: 'BUCHA FIXAÇÃO 6MM P/ TIJOLO FURADO',
          },
        ],
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
        },
      },
    },
  });

  await confirmAiBudgetProposal(
    {
      sessionId: 'session-preserve-id',
      confirmedAt: new Date('2026-04-01T00:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.deepEqual(blingQuoteGateway.lastPayload?.items, [
    {
      productId: 'bucha-6',
      quantity: 20,
      value: 0.2175,
    },
  ]);
});

test('updates an existing Bling quote when the session was started from model edit mode', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const blingQuoteGateway = new CapturingBlingQuoteGateway();

  await repository.save({
    id: 'session-3',
    createdAt: '2026-03-31T09:00:00.000Z',
    updatedAt: '2026-03-31T09:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      blingQuoteReference: {
        id: 'bling-quote-102',
        number: '102',
      },
      proposalDraft: {
        generatedAt: '2026-03-31T09:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Texto comercial atualizado',
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
        },
      },
    },
  });

  const result = await confirmAiBudgetProposal(
    {
      sessionId: 'session-3',
      confirmedAt: new Date('2026-03-31T09:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new FormalNameOnlyContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.equal(result.blingQuote.id, 'bling-quote-102');
  assert.equal(result.blingQuote.number, '102');
  assert.equal(blingQuoteGateway.updatedQuoteId, 'bling-quote-102');
});

test('resolves the Bling contact from the reviewed commercial body when the extracted customer query is polluted', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const blingQuoteGateway = new CapturingBlingQuoteGateway();

  await repository.save({
    id: 'session-5',
    createdAt: '2026-03-31T20:00:00.000Z',
    updatedAt: '2026-03-31T20:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'instalação de ventilador de teto no posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      proposalDraft: {
        generatedAt: '2026-03-31T20:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody:
          'Cliente: Posto Alonso\n\nDescrição principal:\nInstalação de ventilador de teto.',
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
        },
      },
    },
  });

  const result = await confirmAiBudgetProposal(
    {
      sessionId: 'session-5',
      confirmedAt: new Date('2026-03-31T20:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.equal(result.type, 'ai_budget_proposal_confirmed');
  assert.equal(blingQuoteGateway.lastPayload?.contactId, 'contact-1');
  assert.equal(result.session.status, 'Finalizada');
});

test('resolves the Bling contact by relevant token overlap when the cache stores a formal company name', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();
  const blingQuoteGateway = new CapturingBlingQuoteGateway();

  await repository.save({
    id: 'session-6',
    createdAt: '2026-03-31T20:00:00.000Z',
    updatedAt: '2026-03-31T20:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'posto Alonso instalação de ventilador de teto',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      proposalDraft: {
        generatedAt: '2026-03-31T20:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        customerQuery: 'posto Alonso instalação de ventilador de teto',
        commercialBody:
          'Cliente: posto Alonso instalação de ventilador de teto\n\nDescrição principal:\nInstalação de ventilador de teto.',
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
        },
      },
    },
  });

  const result = await confirmAiBudgetProposal(
    {
      sessionId: 'session-6',
      confirmedAt: new Date('2026-03-31T20:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new FormalNameOnlyContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.equal(result.type, 'ai_budget_proposal_confirmed');
  assert.equal(blingQuoteGateway.lastPayload?.contactId, 'contact-2');
});

test('preserves the original reference number when Bling returns number 0 during quote update', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  class ZeroNumberOnUpdateGateway extends CapturingBlingQuoteGateway {
    override async updateQuote(id: string, payload: BlingQuotePayload) {
      this.updatedQuoteId = id;
      this.lastPayload = payload;

      return {
        id,
        number: '0',
        sourceConversationId: payload.sourceConversationId,
        description: payload.description,
        createdAt: payload.requestedAt,
      };
    }
  }

  const blingQuoteGateway = new ZeroNumberOnUpdateGateway();

  await repository.save({
    id: 'session-4',
    createdAt: '2026-03-31T09:00:00.000Z',
    updatedAt: '2026-03-31T09:10:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Proposta comercial pronta',
    payload: {
      localResponse: {
        response: {
          status: 'Proposta comercial pronta',
        },
      },
      blingQuoteReference: {
        id: 'bling-quote-104',
        number: '104',
      },
      proposalDraft: {
        generatedAt: '2026-03-31T09:10:00.000Z',
        title: 'Proposta comercial - Posto Alonso',
        commercialBody: 'Texto comercial atualizado',
      },
      aiResponse: {
        interpretation: {
          materialItems: [],
        },
      },
    },
  });

  const result = await confirmAiBudgetProposal(
    {
      sessionId: 'session-4',
      confirmedAt: new Date('2026-03-31T09:20:00.000Z'),
    },
    {
      aiBudgetSessionRepository: repository,
      blingQuoteGateway,
      contactCatalogCache: new InMemoryContactCatalogCache(),
      productCatalogCache: new InMemoryProductCatalogCache(),
    },
  );

  assert.equal(result.blingQuote.id, 'bling-quote-104');
  assert.equal(result.blingQuote.number, '104');
});

test('rejects proposal confirmation when no proposal draft exists', async () => {
  const repository = new InMemoryAiBudgetSessionRepository();

  await repository.save({
    id: 'session-2',
    createdAt: '2026-03-30T18:00:00.000Z',
    updatedAt: '2026-03-30T18:05:00.000Z',
    originalText: 'Texto original',
    customerQuery: 'Posto Alonso',
    confidence: 'medio',
    status: 'Aprovado para proposta',
    payload: {
      localResponse: {
        response: {
          status: 'Aprovado para proposta',
        },
      },
    },
  });

  await assert.rejects(
    () =>
      confirmAiBudgetProposal(
        {
          sessionId: 'session-2',
        },
        {
          aiBudgetSessionRepository: repository,
          blingQuoteGateway: new CapturingBlingQuoteGateway(),
          contactCatalogCache: new InMemoryContactCatalogCache(),
          productCatalogCache: new InMemoryProductCatalogCache(),
        },
      ),
    /must have a generated proposal draft before confirmation/,
  );
});
