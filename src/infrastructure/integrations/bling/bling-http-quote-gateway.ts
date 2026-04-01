import type {
  BlingCreatedQuote,
  BlingQuoteList,
  BlingQuoteGateway,
  BlingQuotePayload,
} from '../../../application/gateways/bling-quote-gateway';
import { appendAppLog } from '../../observability/file-system-app-log';

interface BlingHttpQuoteGatewayDependencies {
  baseUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class BlingHttpQuoteGateway implements BlingQuoteGateway {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(dependencies: BlingHttpQuoteGatewayDependencies) {
    this.baseUrl = dependencies.baseUrl.replace(/\/$/, '');
    this.accessToken = dependencies.accessToken;
    this.fetchImpl = dependencies.fetchImpl ?? fetch;
    this.timeoutMs = dependencies.timeoutMs ?? 15000;
  }

  async listQuotes(input: {
    limit: number;
    page?: number;
    situation?: string;
    contactId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<BlingQuoteList> {
    const query = new URLSearchParams({
      limite: String(input.limit),
      ...(input.page ? { pagina: String(input.page) } : {}),
      ...(input.situation ? { situacao: input.situation } : {}),
      ...(input.contactId ? { idContato: input.contactId } : {}),
      ...(input.dateFrom ? { dataInicial: input.dateFrom } : {}),
      ...(input.dateTo ? { dataFinal: input.dateTo } : {}),
    });

    const response = await this.performFetch(
      `${this.baseUrl}/propostas-comerciais?${query.toString()}`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${this.accessToken}`,
        }),
      },
      'Bling quote listing',
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Bling quote listing failed with status ${response.status}: ${errorBody}`,
      );
    }

    const responseBody = (await response.json()) as {
      data?: Array<{
        id?: string | number;
        data?: string | null;
        situacao?: string | null;
        total?: number | null;
        totalProdutos?: number | null;
        numero?: string | number | null;
        contato?: {
          id?: string | number | null;
        };
        loja?: {
          id?: string | number | null;
        };
      }>;
    };

    const items = (responseBody.data ?? []).map((item) => ({
      id: String(item.id ?? ''),
      date: item.data ?? null,
      status: item.situacao ?? null,
      total: item.total ?? null,
      productsTotal: item.totalProdutos ?? null,
      number: item.numero === undefined || item.numero === null ? null : String(item.numero),
      contactId:
        item.contato?.id === undefined || item.contato?.id === null
          ? null
          : String(item.contato.id),
      storeId:
        item.loja?.id === undefined || item.loja?.id === null
          ? null
          : String(item.loja.id),
    }));

    return {
      items,
      total: items.length,
    };
  }

  async createQuote(payload: BlingQuotePayload): Promise<BlingCreatedQuote> {
    if (!payload.contactId) {
      throw new Error('Bling quote creation requires a resolved contactId.');
    }

    return this.writeQuote({
      id: null,
      payload,
      method: 'POST',
      label: 'Bling quote creation',
    });
  }

  async updateQuote(id: string, payload: BlingQuotePayload): Promise<BlingCreatedQuote> {
    if (!payload.contactId) {
      throw new Error('Bling quote update requires a resolved contactId.');
    }

    return this.writeQuote({
      id,
      payload,
      method: 'PUT',
      label: 'Bling quote update',
    });
  }

  private async writeQuote(input: {
    id: string | null;
    payload: BlingQuotePayload;
    method: 'POST' | 'PUT';
    label: string;
  }): Promise<BlingCreatedQuote> {
    const response = await this.performFetch(
      input.id
        ? `${this.baseUrl}/propostas-comerciais/${input.id}`
        : `${this.baseUrl}/propostas-comerciais`,
      {
        method: input.method,
        headers: new Headers({
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          ...(input.payload.number ? { numero: Number(input.payload.number) } : {}),
          contato: {
            id: input.payload.contactId,
          },
          introducao: input.payload.introduction ?? input.payload.description,
          observacoes: '',
          itens: (input.payload.items ?? []).map((item) => ({
            produto: {
              id: item.productId,
            },
            quantidade: item.quantity,
            valor: item.value,
          })),
        }),
      },
      input.label,
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `${input.label} failed with status ${response.status}: ${errorBody}`,
      );
    }

    const responseBody = await this.readOptionalJson<{
      data?: {
        id?: string | number;
        numero?: string | number;
      };
    }>(response);

    const id =
      input.id ??
      (responseBody.data?.id === undefined || responseBody.data?.id === null
        ? null
        : String(responseBody.data.id));

    if (!id) {
      throw new Error(`${input.label} failed: missing id in response.`);
    }

    const quoteDetailResponse = await this.performFetch(
      `${this.baseUrl}/propostas-comerciais/${id}`,
      {
        method: 'GET',
        headers: new Headers({
          Authorization: `Bearer ${this.accessToken}`,
        }),
      },
      'Bling quote detail lookup',
    );

    if (!quoteDetailResponse.ok) {
      const errorBody = await quoteDetailResponse.text();
      throw new Error(
        `Bling quote detail lookup failed with status ${quoteDetailResponse.status}: ${errorBody}`,
      );
    }

    const detailBody = (await quoteDetailResponse.json()) as {
      data?: {
        numero?: string | number;
      };
    };
    const number =
      detailBody.data?.numero === undefined || detailBody.data?.numero === null
        ? responseBody.data?.numero
        : detailBody.data.numero;

    if (number === undefined || number === null) {
      throw new Error(`${input.label} failed: missing number in response.`);
    }

    if ((String(number) === '0' || String(number).trim() === '') && input.method === 'POST') {
      const assignedNumber = await this.resolveNextQuoteNumber();

      return this.writeQuote({
        id,
        method: 'PUT',
        label: 'Bling quote number correction',
        payload: {
          ...input.payload,
          number: String(assignedNumber),
        },
      });
    }

    return {
      id,
      number: String(number),
      sourceConversationId: input.payload.sourceConversationId,
      description: input.payload.description,
      createdAt: input.payload.requestedAt,
    };
  }

  private async performFetch(
    url: string,
    init: RequestInit,
    label: string,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      await appendAppLog({
        source: 'bling',
        event: 'requisicao_iniciada',
        label,
        url,
        method: init.method ?? 'GET',
      }).catch(() => {});

      const response = await this.fetchImpl(url, {
        ...init,
        signal: controller.signal,
      });

      await appendAppLog({
        source: 'bling',
        event: 'requisicao_concluida',
        label,
        url,
        method: init.method ?? 'GET',
        statusCode: response.status,
      }).catch(() => {});

      return response;
    } catch (error) {
      if (isAbortError(error)) {
        await appendAppLog({
          source: 'bling',
          event: 'requisicao_expirada',
          label,
          url,
          method: init.method ?? 'GET',
          timeoutMs: this.timeoutMs,
        }).catch(() => {});
        throw new Error(`${label} timed out after ${this.timeoutMs}ms.`);
      }

      await appendAppLog({
        source: 'bling',
        event: 'requisicao_falhou',
        label,
        url,
        method: init.method ?? 'GET',
        error: error instanceof Error ? error.message : 'unknown',
      }).catch(() => {});
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readOptionalJson<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();

    if (!text.trim()) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  private async resolveNextQuoteNumber(): Promise<number> {
    const recentQuotes = await this.listQuotes({
      limit: 50,
    });

    const highestNumber = recentQuotes.items.reduce((highest, item) => {
      const current = Number(item.number);

      if (!Number.isFinite(current) || current <= 0) {
        return highest;
      }

      return Math.max(highest, current);
    }, 0);

    return highestNumber + 1;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'AbortError' || /aborted/i.test(error.message))
  );
}
