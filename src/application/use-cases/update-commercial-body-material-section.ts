interface CommercialMaterialItem {
  description: string;
  quantityText?: string;
}

export function updateCommercialBodyMaterialSection(input: {
  commercialBody: string;
  materialItems: CommercialMaterialItem[];
}): string {
  const commercialBody = input.commercialBody.trim();
  const lines = commercialBody.split('\n');
  const sanitizedLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? '').trim().toLowerCase();

    if (trimmed === 'materiais previstos:') {
      index = skipMaterialSection(lines, index);
      continue;
    }

    sanitizedLines.push(lines[index] ?? '');
  }

  if (input.materialItems.length === 0) {
    return sanitizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  const materialSectionLines = [
    'Materiais previstos:',
    ...input.materialItems.map((item) =>
      `- ${item.description}${item.quantityText ? ` (${item.quantityText})` : ''}`,
    ),
  ];

  const serviceHeadingIndex = sanitizedLines.findIndex(
    (line) => line.trim().toLowerCase() === 'serviços contemplados:',
  );

  if (serviceHeadingIndex >= 0) {
    return [
      ...ensureSingleBlankLineBeforeSection(sanitizedLines, serviceHeadingIndex),
      ...materialSectionLines,
      '',
      ...sanitizedLines.slice(serviceHeadingIndex),
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return [...sanitizedLines, '', ...materialSectionLines]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function skipMaterialSection(lines: string[], headingIndex: number): number {
  let index = headingIndex + 1;

  for (; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? '').trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('-')) {
      continue;
    }

    if (isSectionHeading(trimmed)) {
      return index - 1;
    }

    return index - 1;
  }

  return lines.length;
}

function ensureSingleBlankLineBeforeSection(
  lines: string[],
  insertIndex: number,
): string[] {
  const before = lines.slice(0, insertIndex);

  while (before.length > 0 && before[before.length - 1]?.trim() === '') {
    before.pop();
  }

  return [...before, ''];
}

function isSectionHeading(value: string): boolean {
  return /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^:]*:$/.test(value);
}
