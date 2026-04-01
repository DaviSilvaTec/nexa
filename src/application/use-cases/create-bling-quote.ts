import type { BlingCreatedQuote, BlingQuoteGateway } from '../gateways/bling-quote-gateway';
import type { ConversationRepository } from '../../domain/conversation/conversation-repository';

interface CreateBlingQuoteInput {
  conversationId: string;
  requestedAt: Date;
}

interface CreateBlingQuoteDependencies {
  conversationRepository: ConversationRepository;
  blingQuoteGateway: BlingQuoteGateway;
}

type CreateBlingQuoteResult = {
  type: 'bling_quote_created';
  quote: BlingCreatedQuote;
};

export async function createBlingQuote(
  input: CreateBlingQuoteInput,
  dependencies: CreateBlingQuoteDependencies,
): Promise<CreateBlingQuoteResult> {
  const conversation = await dependencies.conversationRepository.findById(
    input.conversationId,
  );

  if (!conversation) {
    throw new Error('Cannot create a Bling quote for a conversation that does not exist.');
  }

  if (conversation.status !== 'executing_bling_creation') {
    throw new Error('Conversation is not ready for Bling execution.');
  }

  const approvedVersionId = conversation.approvedDraftVersionId;
  const approvedVersion = conversation.draft.versions.find(
    (version) => version.id === approvedVersionId,
  );

  if (!approvedVersion) {
    throw new Error('Cannot create a Bling quote without an approved draft version.');
  }

  const quote = await dependencies.blingQuoteGateway.createQuote({
    sourceConversationId: conversation.id,
    description: approvedVersion.structuredText,
    requestedAt: input.requestedAt,
  });

  return {
    type: 'bling_quote_created',
    quote,
  };
}
