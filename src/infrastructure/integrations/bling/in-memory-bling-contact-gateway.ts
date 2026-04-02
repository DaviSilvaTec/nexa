import type {
  BlingContactGateway,
  BlingContactList,
} from '../../../application/gateways/bling-contact-gateway';

export class InMemoryBlingContactGateway implements BlingContactGateway {
  async listContacts(): Promise<BlingContactList> {
    return {
      items: [],
      total: 0,
    };
  }
}
