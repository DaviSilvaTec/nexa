import test from 'node:test';
import assert from 'node:assert/strict';

import { parseEnvContent } from '../src/config/load-local-env';

test('parses a simple env file content with comments and quoted values', () => {
  const parsed = parseEnvContent(`
# comentario
OPENAI_API_KEY="openai-key"
OPENAI_MODEL=gpt-5-nano
BLING_ACCESS_TOKEN='bling-token'

INVALID_LINE
`);

  assert.deepEqual(parsed, {
    OPENAI_API_KEY: 'openai-key',
    OPENAI_MODEL: 'gpt-5-nano',
    BLING_ACCESS_TOKEN: 'bling-token',
  });
});
