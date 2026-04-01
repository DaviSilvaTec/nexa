import type {
  BlingContactGateway,
  BlingContactList,
} from '../../../application/gateways/bling-contact-gateway';

interface BlingHttpContactGatewayDependencies {
  baseUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}

export class BlingHttpContactGateway implements BlingContactGateway {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly fetchImpl: typeof fetch;

  constructor(dependencies: BlingHttpContactGatewayDependencies) {
    this.baseUrl = dependencies.baseUrl.replace(/\/$/, '');
    this.accessToken = dependencies.accessToken;
    this.fetchImpl = dependencies.fetchImpl ?? fetch;
  }

  async listContacts(input: {
    limit: number;
    page?: number;
    search?: string;
    criterion?: number;
    documentNumber?: string;
    personType?: number;
  }): Promise<BlingContactList> {
    const query = new URLSearchParams({
      limite: String(input.limit),
      ...(input.page ? { pagina: String(input.page) } : {}),
      ...(input.search ? { pesquisa: input.search } : {}),
      ...(input.criterion !== undefined
        ? { criterio: String(input.criterion) }
        : {}),
      ...(input.documentNumber
        ? { numeroDocumento: input.documentNumber }
        : {}),
      ...(input.personType !== undefined
        ? { tipoPessoa: String(input.personType) }
        : {}),
    });

    const response = await this.fetchImpl(
      `${this.baseUrl}/contatos?${query.toString()}`,
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
        `Bling contact listing failed with status ${response.status}: ${errorBody}`,
      );
    }

    const responseBody = (await response.json()) as {
      data?: Array<{
        id?: string | number;
        nome?: string;
        codigo?: string | null;
        situacao?: string | null;
        numeroDocumento?: string | null;
        telefone?: string | null;
        celular?: string | null;
      }>;
    };

    const items = (responseBody.data ?? []).map((item) => ({
      id: String(item.id ?? ''),
      name: item.nome ?? '',
      code: item.codigo ?? null,
      status: item.situacao ?? null,
      documentNumber: item.numeroDocumento ?? null,
      phone: item.telefone ?? null,
      mobilePhone: item.celular ?? null,
    }));

    return {
      items,
      total: items.length,
    };
  }
}
