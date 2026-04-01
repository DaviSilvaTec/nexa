import type {
  BlingServiceNoteGateway,
  BlingServiceNoteList,
} from '../../../application/gateways/bling-service-note-gateway';

interface BlingHttpServiceNoteGatewayDependencies {
  baseUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}

export class BlingHttpServiceNoteGateway implements BlingServiceNoteGateway {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly fetchImpl: typeof fetch;

  constructor(dependencies: BlingHttpServiceNoteGatewayDependencies) {
    this.baseUrl = dependencies.baseUrl.replace(/\/$/, '');
    this.accessToken = dependencies.accessToken;
    this.fetchImpl = dependencies.fetchImpl ?? fetch;
  }

  async listServiceNotes(input: {
    limit: number;
    page?: number;
    situation?: number;
    issueDateFrom?: string;
    issueDateTo?: string;
  }): Promise<BlingServiceNoteList> {
    const query = new URLSearchParams({
      limite: String(input.limit),
      ...(input.page ? { pagina: String(input.page) } : {}),
      ...(input.situation !== undefined
        ? { situacao: String(input.situation) }
        : {}),
      ...(input.issueDateFrom ? { dataEmissaoInicial: input.issueDateFrom } : {}),
      ...(input.issueDateTo ? { dataEmissaoFinal: input.issueDateTo } : {}),
    });

    const response = await this.fetchImpl(`${this.baseUrl}/nfse?${query.toString()}`, {
      method: 'GET',
      headers: new Headers({
        Authorization: `Bearer ${this.accessToken}`,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Bling service note listing failed with status ${response.status}: ${errorBody}`,
      );
    }

    const responseBody = (await response.json()) as {
      data?: Array<{
        id?: string | number;
        numero?: string | number | null;
        numeroRPS?: string | number | null;
        serie?: string | number | null;
        situacao?: number | null;
        dataEmissao?: string | null;
        valor?: number | null;
        contato?: {
          id?: string | number | null;
          nome?: string | null;
          numeroDocumento?: string | null;
          email?: string | null;
        };
        link?: string | null;
        codigoVerificacao?: string | null;
      }>;
    };

    const items = (responseBody.data ?? []).map((item) => ({
      id: String(item.id ?? ''),
      number:
        item.numero === undefined || item.numero === null ? null : String(item.numero),
      rpsNumber:
        item.numeroRPS === undefined || item.numeroRPS === null
          ? null
          : String(item.numeroRPS),
      series:
        item.serie === undefined || item.serie === null ? null : String(item.serie),
      status: item.situacao ?? null,
      issueDate: item.dataEmissao ?? null,
      value: item.valor ?? null,
      contactId:
        item.contato?.id === undefined || item.contato?.id === null
          ? null
          : String(item.contato.id),
      contactName: item.contato?.nome ?? null,
      contactDocument: item.contato?.numeroDocumento ?? null,
      contactEmail: item.contato?.email ?? null,
      link: item.link ?? null,
      verificationCode: item.codigoVerificacao ?? null,
    }));

    return {
      items,
      total: items.length,
    };
  }
}
