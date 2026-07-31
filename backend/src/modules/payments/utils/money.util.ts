export function toMinorUnits(amount: number): number {
  return Math.round(Number(amount) * 100);
}

export function fromMinorUnits(paise: number): number {
  return Number(paise) / 100;
}

/** Strip obvious secrets before logging gateway payloads. */
export function redactGatewayPayload(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const clone = { ...input };
  for (const key of Object.keys(clone)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('secret') ||
      lower.includes('cvv') ||
      lower.includes('pan') ||
      lower.includes('card_number') ||
      lower.includes('upi_pin')
    ) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}
