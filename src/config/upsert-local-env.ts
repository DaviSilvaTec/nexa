import fs from 'node:fs/promises';
import path from 'node:path';

export async function upsertLocalEnv(
  entries: Record<string, string>,
  filePath = path.resolve(process.cwd(), '.env.local'),
): Promise<void> {
  let currentContent = '';

  try {
    currentContent = await fs.readFile(filePath, 'utf-8');
  } catch {
    currentContent = '';
  }

  const lines = currentContent.length > 0 ? currentContent.split(/\r?\n/) : [];
  const seenKeys = new Set<string>();

  const updatedLines = lines.map((line) => {
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      return line;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!(key in entries)) {
      return line;
    }

    seenKeys.add(key);
    return `${key}=${entries[key]}`;
  });

  for (const [key, value] of Object.entries(entries)) {
    if (!seenKeys.has(key)) {
      updatedLines.push(`${key}=${value}`);
    }
  }

  await fs.writeFile(
    filePath,
    `${updatedLines.filter(Boolean).join('\n')}\n`,
    'utf-8',
  );
}
