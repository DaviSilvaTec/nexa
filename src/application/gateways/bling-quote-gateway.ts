export interface BlingQuotePayload {
  sourceConversationId: string;
  description: string;
  introduction?: string;
  number?: string | null;
  contactId?: string;
  items?: Array<{
    productId: string;
    quantity: number;
    value: number;
  }>;
  requestedAt: Date;
}

export interface BlingQuoteSummary {
  id: string;
  date: string | null;
  status: string | null;
  total: number | null;
  productsTotal: number | null;
  number: string | null;
  contactId: string | null;
  storeId: string | null;
}

export interface BlingQuoteList {
  items: BlingQuoteSummary[];
  total: number;
}

export interface BlingCreatedQuote {
  id: string;
  number: string;
  sourceConversationId: string;
  description: string;
  createdAt: Date;
}

export interface BlingQuoteGateway {
  createQuote(payload: BlingQuotePayload): Promise<BlingCreatedQuote>;
  updateQuote(id: string, payload: BlingQuotePayload): Promise<BlingCreatedQuote>;
  listQuotes(input: {
    limit: number;
    page?: number;
    situation?: string;
    contactId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<BlingQuoteList>;
}
