import type {
  BlingProductGateway,
  BlingProductList,
} from '../../../application/gateways/bling-product-gateway';

interface BlingHttpProductGatewayDependencies {
  baseUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}

export class BlingHttpProductGateway implements BlingProductGateway {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly fetchImpl: typeof fetch;

  constructor(dependencies: BlingHttpProductGatewayDependencies) {
    this.baseUrl = dependencies.baseUrl.replace(/\/$/, '');
    this.accessToken = dependencies.accessToken;
    this.fetchImpl = dependencies.fetchImpl ?? fetch;
  }

  async listProducts(input: {
    search?: string;
    limit: number;
    page?: number;
  }): Promise<BlingProductList> {
    const query = new URLSearchParams({
      limite: String(input.limit),
      ...(input.page ? { pagina: String(input.page) } : {}),
      ...(input.search ? { pesquisa: input.search } : {}),
    });

    const response = await this.fetchImpl(
      `${this.baseUrl}/produtos?${query.toString()}`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${this.accessToken}`,
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Bling product listing failed with status ${response.status}: ${errorBody}`,
      );
    }

    const responseBody = (await response.json()) as {
      data?: Array<{
        id?: string;
        nome?: string;
        codigo?: string | null;
        preco?: number | null;
        precoCusto?: number | null;
        estoque?: {
          saldoVirtualTotal?: number | null;
        };
        tipo?: string | null;
        situacao?: string | null;
      }>;
    };

    const items = (responseBody.data ?? []).map((item) => ({
      id: item.id ?? '',
      name: item.nome ?? '',
      code: item.codigo ?? null,
      price: item.preco ?? null,
      costPrice: item.precoCusto ?? null,
      stockQuantity: item.estoque?.saldoVirtualTotal ?? null,
      type: item.tipo ?? null,
      status: item.situacao ?? null,
    }));

    return {
      items,
      total: items.length,
      appliedSearch: input.search ?? null,
    };
  }
}
