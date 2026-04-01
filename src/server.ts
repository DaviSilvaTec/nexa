import type { AppConfig } from './config/app-config';
import { createRuntime } from './main';

interface StartableApp {
  listen(options: { port: number; host: string }): Promise<string>;
}

interface RuntimeLike {
  app: StartableApp;
  config: AppConfig;
}

export async function startServer(runtime: RuntimeLike): Promise<{
  address: string;
}> {
  const address = await runtime.app.listen({
    port: runtime.config.appPort,
    host: '0.0.0.0',
  });

  return { address };
}

async function bootstrap(): Promise<void> {
  const runtime = createRuntime();
  const { address } = await startServer(runtime);

  process.stdout.write(`ALLTEC NEXA listening at ${address}\n`);
}

if (require.main === module) {
  void bootstrap();
}
