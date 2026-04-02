import type {
  BlingServiceNoteGateway,
  BlingServiceNoteList,
} from '../../../application/gateways/bling-service-note-gateway';

export class InMemoryBlingServiceNoteGateway implements BlingServiceNoteGateway {
  async listServiceNotes(): Promise<BlingServiceNoteList> {
    return {
      items: [],
      total: 0,
    };
  }
}
