import test from 'node:test';
import assert from 'node:assert/strict';

import { startServer } from '../src/server';

test('starts the server using the runtime app and configured port', async () => {
  let listenedPort: number | undefined;
  let listenedHost: string | undefined;

  const fakeApp = {
    listen: async (options: { port: number; host: string }) => {
      listenedPort = options.port;
      listenedHost = options.host;
      return `http://${options.host}:${options.port}`;
    },
  };

  const result = await startServer({
    app: fakeApp as never,
    config: {
      appPort: 3000,
      authorizedChannels: [],
      openai: null,
      bling: null,
    },
  });

  assert.equal(listenedPort, 3000);
  assert.equal(listenedHost, '0.0.0.0');
  assert.equal(result.address, 'http://0.0.0.0:3000');
});
