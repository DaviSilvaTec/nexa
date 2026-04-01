export interface BlingServiceNoteSummary {
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
}

export interface BlingServiceNoteList {
  items: BlingServiceNoteSummary[];
  total: number;
}

export interface BlingServiceNoteGateway {
  listServiceNotes(input: {
    limit: number;
    page?: number;
    situation?: number;
    issueDateFrom?: string;
    issueDateTo?: string;
  }): Promise<BlingServiceNoteList>;
}
