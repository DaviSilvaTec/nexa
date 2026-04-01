export function extractCustomerFromCommercialBody(
  commercialBody: string | null | undefined,
): string | null {
  if (typeof commercialBody !== 'string') {
    return null;
  }

  const match = commercialBody.match(/^[ \t]*cliente\s*[:\-]\s*(.+)$/im);

  if (!match) {
    return null;
  }

  const customer = match[1]?.trim();

  if (!customer) {
    return null;
  }

  return customer.replace(/[. ]+$/g, '').trim() || null;
}
