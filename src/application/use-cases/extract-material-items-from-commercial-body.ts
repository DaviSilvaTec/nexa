export function extractMaterialItemsFromCommercialBody(commercialBody: string): Array<{
  description: string;
  quantityText: string;
  sourceQuery: string | null;
  catalogItemId: string | null;
  catalogItemName: string | null;
}> {
  const lines = commercialBody.split('\n');
  const materialHeadingIndex = lines.findIndex(
    (line) => line.trim().toLowerCase() === 'materiais previstos:',
  );

  if (materialHeadingIndex < 0) {
    return [];
  }

  const materialLines: string[] = [];

  for (let index = materialHeadingIndex + 1; index < lines.length; index += 1) {
    const trimmed = (lines[index] ?? '').trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('- ')) {
      materialLines.push(trimmed);
      continue;
    }

    if (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][^:]*:$/u.test(trimmed)) {
      break;
    }
  }

  return materialLines
    .map((line) => line.replace(/^- /, '').trim())
    .map((line) => {
      const quantityMatch = line.match(/^(.*?)(?:\s+\((.*)\))$/);
      const description = quantityMatch?.[1]?.trim() ?? line;
      const quantityText = quantityMatch?.[2]?.trim() ?? '1 unidade';

      return {
        description,
        quantityText,
        sourceQuery: description,
        catalogItemId: null,
        catalogItemName: null,
      };
    })
    .filter((item) => item.description.length > 0);
}
