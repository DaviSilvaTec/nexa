import { buildAppConfig, type AppConfig } from './config/app-config';
import { loadLocalEnv } from './config/load-local-env';
import {
  buildAppDependencies,
  type AppDependencies,
} from './app/build-app-dependencies';
import { createApp } from './app/create-app';

interface Runtime {
  app: ReturnType<typeof createApp>;
  config: AppConfig;
  dependencies: AppDependencies;
}

export function createRuntime(
  env: Record<string, string | undefined> = process.env,
): Runtime {
  const mergedEnv = {
    ...loadLocalEnv(),
    ...env,
  };
  const config = buildAppConfig(mergedEnv);
  const dependencies = buildAppDependencies({
    env: {
      AUTHORIZED_CHANNELS: config.authorizedChannels.join(','),
      OPENAI_API_KEY: config.openai?.apiKey ?? undefined,
      OPENAI_MODEL: config.openai?.model ?? undefined,
      OPENAI_BASE_URL: config.openai?.baseUrl ?? undefined,
      BLING_API_BASE_URL: config.bling?.apiBaseUrl ?? undefined,
      BLING_ACCESS_TOKEN: config.bling?.accessToken ?? undefined,
      BLING_CLIENT_ID: config.bling?.clientId ?? undefined,
      BLING_CLIENT_SECRET: config.bling?.clientSecret ?? undefined,
      BLING_REDIRECT_URI: config.bling?.redirectUri ?? undefined,
    },
  });
  const app = createApp(dependencies);

  return {
    app,
    config,
    dependencies,
  };
}
