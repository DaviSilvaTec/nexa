import fs from 'node:fs/promises';
import path from 'node:path';

const LOG_FILE_PATH = path.resolve(
  process.cwd(),
  'data/nexa/logs/app-events.jsonl',
);

export async function appendAppLog(entry: Record<string, unknown>) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });

  await fs.mkdir(path.dirname(LOG_FILE_PATH), { recursive: true });
  await fs.appendFile(LOG_FILE_PATH, `${record}\n`, 'utf-8');
}
