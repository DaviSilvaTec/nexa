import type { BlingProductSummary } from '../gateways/bling-product-gateway';

interface MaterialSummaryItem {
  description: string;
  quantityText?: string;
  catalogItemId?: string | null;
  catalogItemName?: string | null;
}

export function calculateMaterialFinancialSummary(input: {
  materialItems: MaterialSummaryItem[];
  products: BlingProductSummary[];
}) {
  const productsById = new Map(
    input.products.map((product) => [String(product.id), product]),
  );

  let saleTotal = 0;
  let costTotal = 0;
  let itemsWithCompleteBase = 0;
  const alerts: string[] = [];

  for (const item of input.materialItems) {
    const catalogItemId = asString(item.catalogItemId);

    if (!catalogItemId) {
      alerts.push(
        `Material "${item.description}" sem vínculo confirmado com o catálogo local.`,
      );
      continue;
    }

    const product = productsById.get(catalogItemId);

    if (!product) {
      alerts.push(
        `Material "${item.description}" vinculado ao catálogo, mas sem registro encontrado na base local.`,
      );
      continue;
    }

    const quantity = extractQuantity(item.quantityText);
    const unitSale = asNullableNumber(product.price);
    const unitCost = asNullableNumber(product.costPrice);

    if (unitSale === null) {
      alerts.push(
        `Material "${product.name}" sem preço de venda local para compor o resumo financeiro.`,
      );
    } else {
      saleTotal += unitSale * quantity;
    }

    if (unitCost === null) {
      alerts.push(
        `Material "${product.name}" sem preço de custo local para compor o resumo financeiro.`,
      );
    } else {
      costTotal += unitCost * quantity;
    }

    if (unitSale !== null && unitCost !== null) {
      itemsWithCompleteBase += 1;
    }
  }

  return {
    saleTotal,
    costTotal,
    grossProfit: saleTotal - costTotal,
    itemsWithCompleteBase,
    alerts,
  };
}

function extractQuantity(quantityText?: string): number {
  const normalized = asString(quantityText).replace(',', '.');
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  const parsed = match?.[1] ? Number.parseFloat(match[1]) : 1;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
