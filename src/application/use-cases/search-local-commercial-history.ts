import type { BlingContactCatalogCache } from '../catalog/bling-contact-catalog-cache';
import type { BlingQuoteHistoryCache } from '../catalog/bling-quote-history-cache';
import type { BlingServiceNoteHistoryCache } from '../catalog/bling-service-note-history-cache';

interface SearchLocalCommercialHistoryInput {
  query: string;
  contactLimit?: number;
  quoteLimitPerContact?: number;
}

interface SearchLocalCommercialHistoryDependencies {
  contactCatalogCache: BlingContactCatalogCache;
  quoteHistoryCache: BlingQuoteHistoryCache;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
}

type SearchLocalCommercialHistoryResult = {
  type: 'local_commercial_history_found';
  query: string;
  matches: Array<{
    contact: {
      id: string;
      name: string;
      code: string | null;
      status: string | null;
      documentNumber: string | null;
      phone: string | null;
      mobilePhone: string | null;
    };
    quotes: Array<{
      id: string;
      date: string | null;
      status: string | null;
      total: number | null;
      productsTotal: number | null;
      number: string | null;
      contactId: string | null;
      storeId: string | null;
    }>;
    serviceNotes: Array<{
      id: string;
      number: string | null;
      rpsNumber: string | null;
      series: string | null;
      status: number | null;
      issueDate: string | null;
      value: number | null;
      contactId: string | null;
      contactName: string | null;
      contactDocument: string | null;
      contactEmail: string | null;
      link: string | null;
      verificationCode: string | null;
    }>;
    summary: {
      quoteCount: number;
      serviceNoteCount: number;
      latestQuoteDate: string | null;
      latestServiceNoteDate: string | null;
    };
  }>;
};

export async function searchLocalCommercialHistory(
  input: SearchLocalCommercialHistoryInput,
  dependencies: SearchLocalCommercialHistoryDependencies,
): Promise<SearchLocalCommercialHistoryResult> {
  const [contactCatalog, quoteHistory, serviceNoteHistory] = await Promise.all([
    dependencies.contactCatalogCache.read(),
    dependencies.quoteHistoryCache.read(),
    dependencies.serviceNoteHistoryCache.read(),
  ]);

  const normalizedQuery = normalizeText(input.query);
  const normalizedDigits = onlyDigits(input.query);
  const contactLimit = input.contactLimit ?? 5;
  const quoteLimitPerContact = input.quoteLimitPerContact ?? 3;

  const matchedContacts = (contactCatalog?.items ?? [])
    .filter((contact) => {
      const searchableText = normalizeText(
        [
          contact.name,
          contact.code,
          contact.documentNumber,
          contact.phone,
          contact.mobilePhone,
        ]
          .filter(Boolean)
          .join(' '),
      );

      if (normalizedQuery && searchableText.includes(normalizedQuery)) {
        return true;
      }

      if (!normalizedDigits) {
        return false;
      }

      const contactDigits = onlyDigits(
        [contact.documentNumber, contact.phone, contact.mobilePhone]
          .filter(Boolean)
          .join(' '),
      );

      return contactDigits.includes(normalizedDigits);
    })
    .slice(0, contactLimit);

  const matches = matchedContacts.map((contact) => {
    const quotes = (quoteHistory?.items ?? [])
      .filter((quote) => quote.contactId === contact.id)
      .sort(compareQuotesByNewest)
      .slice(0, quoteLimitPerContact);

    const serviceNotes = (serviceNoteHistory?.items ?? [])
      .filter((serviceNote) => serviceNote.contactId === contact.id)
      .sort(compareServiceNotesByNewest)
      .slice(0, quoteLimitPerContact);

    return {
      contact,
      quotes,
      serviceNotes,
      summary: {
        quoteCount: quotes.length,
        serviceNoteCount: serviceNotes.length,
        latestQuoteDate: quotes[0]?.date ?? null,
        latestServiceNoteDate: serviceNotes[0]?.issueDate ?? null,
      },
    };
  });

  return {
    type: 'local_commercial_history_found',
    query: input.query,
    matches,
  };
}

function compareServiceNotesByNewest(
  left: {
    issueDate: string | null;
    number: string | null;
  },
  right: {
    issueDate: string | null;
    number: string | null;
  },
): number {
  const dateCompare = (right.issueDate ?? '').localeCompare(left.issueDate ?? '');

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return (right.number ?? '').localeCompare(left.number ?? '', undefined, {
    numeric: true,
  });
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

function compareQuotesByNewest(
  left: {
    date: string | null;
    number: string | null;
  },
  right: {
    date: string | null;
    number: string | null;
  },
): number {
  const dateCompare = (right.date ?? '').localeCompare(left.date ?? '');

  if (dateCompare !== 0) {
    return dateCompare;
  }

  return (right.number ?? '').localeCompare(left.number ?? '', undefined, {
    numeric: true,
  });
}
