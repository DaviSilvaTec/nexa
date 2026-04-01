import type {
  BlingCreatedQuote,
  BlingQuoteGateway,
  BlingQuotePayload,
} from '../../../application/gateways/bling-quote-gateway';

export class InMemoryBlingQuoteGateway implements BlingQuoteGateway {
  private sequence = 0;
  private readonly quotes = new Map<string, BlingCreatedQuote>();

  async createQuote(payload: BlingQuotePayload): Promise<BlingCreatedQuote> {
    this.sequence += 1;

    const quote = {
      id: `bling-quote-${this.sequence}`,
      number: payload.number || String(1000 + this.sequence),
      sourceConversationId: payload.sourceConversationId,
      description: payload.description,
      createdAt: payload.requestedAt,
    };

    this.quotes.set(quote.id, quote);
    return quote;
  }

  async updateQuote(id: string, payload: BlingQuotePayload): Promise<BlingCreatedQuote> {
    const existing = this.quotes.get(id);

    if (!existing) {
      throw new Error(`Bling quote "${id}" was not found.`);
    }

    const updated = {
      ...existing,
      number: payload.number || existing.number,
      sourceConversationId: payload.sourceConversationId,
      description: payload.description,
      createdAt: payload.requestedAt,
    };

    this.quotes.set(id, updated);
    return updated;
  }

  async listQuotes(): Promise<{ items: []; total: number }> {
    return {
      items: [],
      total: 0,
    };
  }
}
