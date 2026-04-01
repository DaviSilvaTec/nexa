import test from 'node:test';
import assert from 'node:assert/strict';

import type { BlingProductCatalogCache } from '../src/application/catalog/bling-product-catalog-cache';
import { searchLocalProductCatalog } from '../src/application/use-cases/search-local-product-catalog';

class InMemoryProductCatalogCache implements BlingProductCatalogCache {
  constructor(
    private readonly value: Awaited<ReturnType<BlingProductCatalogCache['read']>>,
  ) {}

  async read() {
    return this.value;
  }

  async write() {
    throw new Error('not needed in this test');
  }
}

test('finds local products by partial name and sorts stronger matches first', async () => {
  const result = await searchLocalProductCatalog(
    {
      query: 'cabo pp',
      limit: 3,
    },
    {
      productCatalogCache: new InMemoryProductCatalogCache({
        syncedAt: '2026-03-30T06:17:49.286Z',
        items: [
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
          {
            id: '2',
            name: 'Cabo Flex 2,5mm',
            code: 'FLEX25',
            price: 6.7,
            costPrice: 4.4,
            stockQuantity: 9,
            type: 'P',
            status: 'A',
          },
          {
            id: '3',
            name: 'Conector BNC',
            code: 'BNC1',
            price: 3,
            costPrice: 1.5,
            stockQuantity: 30,
            type: 'P',
            status: 'A',
          },
        ],
      }),
    },
  );

  assert.equal(result.type, 'local_product_catalog_searched');
  assert.equal(result.products.totalMatches, 2);
  assert.deepEqual(
    result.products.items.map((item: { id: string }) => item.id),
    ['1', '2'],
  );
});

test('finds local products by code', async () => {
  const result = await searchLocalProductCatalog(
    {
      query: 'BNC1',
    },
    {
      productCatalogCache: new InMemoryProductCatalogCache({
        syncedAt: '2026-03-30T06:17:49.286Z',
        items: [
          {
            id: '3',
            name: 'Conector BNC',
            code: 'BNC1',
            price: 3,
            costPrice: 1.5,
            stockQuantity: 30,
            type: 'P',
            status: 'A',
          },
        ],
      }),
    },
  );

  assert.equal(result.products.totalMatches, 1);
  assert.equal(result.products.items[0]?.code, 'BNC1');
});

test('requires stronger correspondence for composite cable measurements like 3 x 1,5', async () => {
  const result = await searchLocalProductCatalog(
    {
      query: '3 x 1,5',
      limit: 10,
    },
    {
      productCatalogCache: new InMemoryProductCatalogCache({
        syncedAt: '2026-03-30T06:17:49.286Z',
        items: [
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
          {
            id: '3',
            name: 'Cabo Flex 1,5mm',
            code: 'FLEX15',
            price: 6,
            costPrice: 3.8,
            stockQuantity: 22,
            type: 'P',
            status: 'A',
          },
          {
            id: '4',
            name: 'Tomada 3 pinos 1,5m',
            code: 'TOM315',
            price: 9,
            costPrice: 4.5,
            stockQuantity: 10,
            type: 'P',
            status: 'A',
          },
        ],
      }),
    },
  );

  assert.equal(result.products.totalMatches, 2);
  assert.deepEqual(
    result.products.items.map((item: { id: string }) => item.id),
    ['2', '1'],
  );
});

test('returns empty result when local catalog is missing', async () => {
  const result = await searchLocalProductCatalog(
    {
      query: 'cabo',
    },
    {
      productCatalogCache: new InMemoryProductCatalogCache(null),
    },
  );

  assert.equal(result.products.totalMatches, 0);
  assert.equal(result.products.items.length, 0);
});

test('penalizes incompatible matches for network material searches', async () => {
  const cableResult = await searchLocalProductCatalog(
    {
      query: 'cabo de rede furukawa',
      limit: 3,
    },
    {
      productCatalogCache: new InMemoryProductCatalogCache({
        syncedAt: '2026-03-30T06:17:49.286Z',
        items: [
          {
            id: '1',
            name: 'Cabo De Extensao Ugreen Usb 3.0 Macho Para Usb Femea',
            code: '',
            price: 51.794,
            costPrice: 35.72,
            stockQuantity: 1,
            type: 'P',
            status: 'A',
          },
          {
            id: '2',
            name: 'CABO DE REDE CAT5E AZUL 100% COBRE FURUKAWA',
            code: '',
            price: 4.63,
            costPrice: 3.19,
            stockQuantity: 21,
            type: 'P',
            status: 'A',
          },
        ],
      }),
    },
  );

  assert.deepEqual(
    cableResult.products.items.map((item: { id: string }) => item.id),
    ['2'],
  );

  const connectorResult = await searchLocalProductCatalog(
    {
      query: 'conector rj45',
      limit: 3,
    },
    {
      productCatalogCache: new InMemoryProductCatalogCache({
        syncedAt: '2026-03-30T06:17:49.286Z',
        items: [
          {
            id: '3',
            name: 'MODULO TOMADA INFORMATICA RJ45 CAT5E SLEEK BC',
            code: '',
            price: 19.749,
            costPrice: 13.62,
            stockQuantity: 2,
            type: 'P',
            status: 'A',
          },
          {
            id: '4',
            name: 'CONECTOR MACHO RJ45 CAT-5E - SOHOPLUS 35050290 - FURUKAWA',
            code: '',
            price: 3.5,
            costPrice: 1.77,
            stockQuantity: 42,
            type: 'P',
            status: 'A',
          },
        ],
      }),
    },
  );

  assert.equal(connectorResult.products.items[0]?.id, '4');

  const switchResult = await searchLocalProductCatalog(
    {
      query: 'switch 4 portas',
      limit: 3,
    },
    {
      productCatalogCache: new InMemoryProductCatalogCache({
        syncedAt: '2026-03-30T06:17:49.286Z',
        items: [
          {
            id: '5',
            name: 'Switch 4 Portas Fast Ethernet',
            code: '',
            price: 89.9,
            costPrice: 55,
            stockQuantity: 5,
            type: 'P',
            status: 'A',
          },
          {
            id: '6',
            name: 'Switch de Monitor KVM 2 Portas',
            code: '',
            price: 59.76,
            costPrice: 29.88,
            stockQuantity: 2,
            type: 'P',
            status: 'A',
          },
          {
            id: '7',
            name: 'PLACA CAIXA DE PISO 4X4 2 MODULOS',
            code: '',
            price: 58.288,
            costPrice: 36.43,
            stockQuantity: 1,
            type: 'P',
            status: 'A',
          },
        ],
      }),
    },
  );

  assert.deepEqual(
    switchResult.products.items.map((item: { id: string }) => item.id),
    ['5'],
  );

  const cameraResult = await searchLocalProductCatalog(
    {
      query: 'camera ip 2mp',
      limit: 3,
    },
    {
      productCatalogCache: new InMemoryProductCatalogCache({
        syncedAt: '2026-03-30T06:17:49.286Z',
        items: [
          {
            id: '8',
            name: 'CAMERA IP BULLET 2MP',
            code: '',
            price: 250,
            costPrice: 180,
            stockQuantity: 3,
            type: 'P',
            status: 'A',
          },
          {
            id: '9',
            name: 'CAMERA IP BULLET 3MP',
            code: '',
            price: 320,
            costPrice: 220,
            stockQuantity: 2,
            type: 'P',
            status: 'A',
          },
          {
            id: '10',
            name: 'Instalação de Câmera IP',
            code: '',
            price: 120,
            costPrice: 0,
            stockQuantity: 0,
            type: 'S',
            status: 'A',
          },
        ],
      }),
    },
  );

  assert.deepEqual(
    cameraResult.products.items.map((item: { id: string }) => item.id),
    ['8', '9'],
  );
});
