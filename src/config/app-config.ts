export interface AppConfig {
  appPort: number;
  authorizedChannels: string[];
  openai: {
    apiKey: string | null;
    model: string | null;
    baseUrl: string | null;
  } | null;
  bling: {
    apiBaseUrl: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    clientId: string | null;
    clientSecret: string | null;
    redirectUri: string | null;
  } | null;
}

export function buildAppConfig(
  env: Record<string, string | undefined>,
): AppConfig {
  const appPort = parseAppPort(env.APP_PORT);
  const authorizedChannels = parseList(env.AUTHORIZED_CHANNELS);
  const hasAnyOpenAIConfig = [
    env.OPENAI_API_KEY,
    env.OPENAI_MODEL,
    env.OPENAI_BASE_URL,
  ].some((value) => Boolean(value));
  const hasAnyBlingConfig = [
    env.BLING_API_BASE_URL,
    env.BLING_ACCESS_TOKEN,
    env.BLING_REFRESH_TOKEN,
    env.BLING_CLIENT_ID,
    env.BLING_CLIENT_SECRET,
    env.BLING_REDIRECT_URI,
  ].some((value) => Boolean(value));

  const openai = hasAnyOpenAIConfig
    ? {
        apiKey: env.OPENAI_API_KEY ?? null,
        model: env.OPENAI_MODEL ?? null,
        baseUrl: env.OPENAI_BASE_URL ?? null,
      }
    : null;

  const bling = hasAnyBlingConfig
    ? {
        apiBaseUrl: env.BLING_API_BASE_URL ?? null,
        accessToken: env.BLING_ACCESS_TOKEN ?? null,
        refreshToken: env.BLING_REFRESH_TOKEN ?? null,
        clientId: env.BLING_CLIENT_ID ?? null,
        clientSecret: env.BLING_CLIENT_SECRET ?? null,
        redirectUri: env.BLING_REDIRECT_URI ?? null,
      }
    : null;

  return {
    appPort,
    authorizedChannels,
    openai,
    bling,
  };
}

function parseAppPort(rawValue?: string): number {
  if (!rawValue) {
    return 3000;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('APP_PORT must be a positive integer.');
  }

  return parsed;
}

function parseList(rawValue?: string): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}
