import type { BlingServiceNoteHistoryCache } from '../application/catalog/bling-service-note-history-cache';
import type { BlingContactCatalogCache } from '../application/catalog/bling-contact-catalog-cache';
import type { BlingProductCatalogCache } from '../application/catalog/bling-product-catalog-cache';
import type { BlingQuoteHistoryCache } from '../application/catalog/bling-quote-history-cache';
import type { BlingOAuthGateway } from '../application/gateways/bling-oauth-gateway';
import type { BlingProductGateway } from '../application/gateways/bling-product-gateway';
import type { BlingQuoteGateway } from '../application/gateways/bling-quote-gateway';
import type { OpenAIBudgetAssistantGateway } from '../application/gateways/openai-budget-assistant-gateway';
import type { AiBudgetModelRepository } from '../application/repositories/ai-budget-model-repository';
import type { AiBudgetSessionRepository } from '../application/repositories/ai-budget-session-repository';
import type {
  ConversationRepository,
  SuspendedAnalysisRepository,
} from '../domain/conversation/conversation-repository';
import { BlingHttpProductGateway } from '../infrastructure/integrations/bling/bling-http-product-gateway';
import { BlingHttpQuoteGateway } from '../infrastructure/integrations/bling/bling-http-quote-gateway';
import { BlingOAuthHttpGateway } from '../infrastructure/integrations/bling/bling-oauth-http-gateway';
import { InMemoryBlingProductGateway } from '../infrastructure/integrations/bling/in-memory-bling-product-gateway';
import { InMemoryBlingQuoteGateway } from '../infrastructure/integrations/bling/in-memory-bling-quote-gateway';
import { OpenAIHttpBudgetAssistantGateway } from '../infrastructure/integrations/openai/openai-http-budget-assistant-gateway';
import { InMemoryOpenAIBudgetAssistantGateway } from '../infrastructure/integrations/openai/in-memory-openai-budget-assistant-gateway';
import { FileSystemBlingContactCatalogCache } from '../infrastructure/persistence/file-system/file-system-bling-contact-catalog-cache';
import { FileSystemAiBudgetModelRepository } from '../infrastructure/persistence/file-system/file-system-ai-budget-model-repository';
import { FileSystemAiBudgetSessionRepository } from '../infrastructure/persistence/file-system/file-system-ai-budget-session-repository';
import { FileSystemBlingProductCatalogCache } from '../infrastructure/persistence/file-system/file-system-bling-product-catalog-cache';
import { FileSystemBlingQuoteHistoryCache } from '../infrastructure/persistence/file-system/file-system-bling-quote-history-cache';
import { FileSystemBlingServiceNoteHistoryCache } from '../infrastructure/persistence/file-system/file-system-bling-service-note-history-cache';
import { InMemoryConversationRepository } from '../infrastructure/persistence/in-memory/in-memory-conversation-repository';
import { InMemorySuspendedAnalysisRepository } from '../infrastructure/persistence/in-memory/in-memory-suspended-analysis-repository';

export interface AppDependencies {
  authorizedChannels: Set<string>;
  conversationRepository: ConversationRepository;
  suspendedAnalysisRepository: SuspendedAnalysisRepository;
  blingQuoteGateway: BlingQuoteGateway;
  blingProductGateway: BlingProductGateway;
  blingOAuthGateway: BlingOAuthGateway;
  openAIBudgetAssistantGateway: OpenAIBudgetAssistantGateway;
  blingRedirectUri: string;
  contactCatalogCache: BlingContactCatalogCache;
  productCatalogCache: BlingProductCatalogCache;
  quoteHistoryCache: BlingQuoteHistoryCache;
  serviceNoteHistoryCache: BlingServiceNoteHistoryCache;
  aiBudgetSessionRepository: AiBudgetSessionRepository;
  aiBudgetModelRepository: AiBudgetModelRepository;
}

interface BuildAppDependenciesInput {
  env?: Record<string, string | undefined>;
  overrides?: Partial<AppDependencies>;
}

export function buildAppDependencies(
  input: BuildAppDependenciesInput = {},
): AppDependencies {
  const env = input.env ?? process.env;
  const authorizedChannels = parseAuthorizedChannels(env.AUTHORIZED_CHANNELS);

  return {
    authorizedChannels:
      input.overrides?.authorizedChannels ?? authorizedChannels,
    conversationRepository:
      input.overrides?.conversationRepository ??
      new InMemoryConversationRepository(),
    suspendedAnalysisRepository:
      input.overrides?.suspendedAnalysisRepository ??
      new InMemorySuspendedAnalysisRepository(),
    blingQuoteGateway:
      input.overrides?.blingQuoteGateway ?? buildBlingQuoteGateway(env),
    blingProductGateway:
      input.overrides?.blingProductGateway ?? buildBlingProductGateway(env),
    blingOAuthGateway:
      input.overrides?.blingOAuthGateway ?? buildBlingOAuthGateway(env),
    openAIBudgetAssistantGateway:
      input.overrides?.openAIBudgetAssistantGateway ??
      buildOpenAIBudgetAssistantGateway(env),
    blingRedirectUri:
      input.overrides?.blingRedirectUri ??
      env.BLING_REDIRECT_URI ??
      'http://localhost:3000/auth/bling/callback',
    contactCatalogCache:
      input.overrides?.contactCatalogCache ??
      new FileSystemBlingContactCatalogCache({
        filePath: 'data/bling/contacts/catalog.json',
      }),
    productCatalogCache:
      input.overrides?.productCatalogCache ??
      new FileSystemBlingProductCatalogCache({
        filePath: 'data/bling/products/catalog.json',
      }),
    quoteHistoryCache:
      input.overrides?.quoteHistoryCache ??
      new FileSystemBlingQuoteHistoryCache({
        filePath: 'data/bling/quotes/history.json',
      }),
    serviceNoteHistoryCache:
      input.overrides?.serviceNoteHistoryCache ??
      new FileSystemBlingServiceNoteHistoryCache({
        filePath: 'data/bling/service-notes/history.json',
      }),
    aiBudgetSessionRepository:
      input.overrides?.aiBudgetSessionRepository ??
      new FileSystemAiBudgetSessionRepository({
        filePath: 'data/nexa/ai-budget-sessions/sessions.json',
      }),
    aiBudgetModelRepository:
      input.overrides?.aiBudgetModelRepository ??
      new FileSystemAiBudgetModelRepository({
        filePath: 'data/nexa/ai-budget-models/models.json',
      }),
  };
}

function buildBlingQuoteGateway(
  env: Record<string, string | undefined>,
): BlingQuoteGateway {
  const baseUrl = env.BLING_API_BASE_URL;
  const accessToken = env.BLING_ACCESS_TOKEN;

  if (baseUrl && accessToken) {
    return new BlingHttpQuoteGateway({
      baseUrl,
      accessToken,
    });
  }

  return new InMemoryBlingQuoteGateway();
}

function buildBlingProductGateway(
  env: Record<string, string | undefined>,
): BlingProductGateway {
  const baseUrl = env.BLING_API_BASE_URL;
  const accessToken = env.BLING_ACCESS_TOKEN;

  if (baseUrl && accessToken) {
    return new BlingHttpProductGateway({
      baseUrl,
      accessToken,
    });
  }

  return new InMemoryBlingProductGateway();
}

function buildBlingOAuthGateway(
  env: Record<string, string | undefined>,
): BlingOAuthGateway {
  const baseUrl = env.BLING_OAUTH_BASE_URL ?? 'https://www.bling.com.br/Api/v3';
  const clientId = env.BLING_CLIENT_ID;
  const clientSecret = env.BLING_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return new BlingOAuthHttpGateway({
      baseUrl,
      clientId,
      clientSecret,
    });
  }

  return {
    async exchangeAuthorizationCode() {
      throw new Error(
        'Bling OAuth gateway is not configured. Set BLING_CLIENT_ID and BLING_CLIENT_SECRET.',
      );
    },
    async refreshAccessToken() {
      throw new Error(
        'Bling OAuth gateway is not configured. Set BLING_CLIENT_ID and BLING_CLIENT_SECRET.',
      );
    },
  };
}

function buildOpenAIBudgetAssistantGateway(
  env: Record<string, string | undefined>,
): OpenAIBudgetAssistantGateway {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL ?? 'gpt-5.2';
  const baseUrl = env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const timeoutMs = Number(env.OPENAI_REQUEST_TIMEOUT_MS ?? '120000');

  if (apiKey) {
    return new OpenAIHttpBudgetAssistantGateway({
      apiKey,
      model,
      baseUrl,
      timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 120000,
    });
  }

  return new InMemoryOpenAIBudgetAssistantGateway();
}

function parseAuthorizedChannels(rawValue?: string): Set<string> {
  if (!rawValue) {
    return new Set<string>();
  }

  const channels = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return new Set(channels);
}
