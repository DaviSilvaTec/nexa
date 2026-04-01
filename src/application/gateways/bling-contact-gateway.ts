export interface BlingContactSummary {
  id: string;
  name: string;
  code: string | null;
  status: string | null;
  documentNumber: string | null;
  phone: string | null;
  mobilePhone: string | null;
}

export interface BlingContactList {
  items: BlingContactSummary[];
  total: number;
}

export interface BlingContactGateway {
  listContacts(input: {
    limit: number;
    page?: number;
    search?: string;
    criterion?: number;
    documentNumber?: string;
    personType?: number;
  }): Promise<BlingContactList>;
}
