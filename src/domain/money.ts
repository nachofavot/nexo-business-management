const MONEY_PATTERN = /^(\d+)(?:[.,](\d{1,2}))?$/;

/**
 * Convierte un importe escrito por el usuario a centavos.
 * Trabaja con el texto para evitar errores de redondeo: 19.99 * 100 da 1998.9999999999998.
 * Rechaza los separadores de miles porque "1.234" sería ambiguo.
 */
export function parseMoneyToCents(raw: string): number | null {
  const match = MONEY_PATTERN.exec(raw.trim());
  if (!match) return null;

  const [, whole = '', decimals = ''] = match;
  const cents = Number(whole + decimals.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Escribe un importe como lo lee parseMoneyToCents: sin símbolo ni separador de miles. */
export function formatCentsForInput(cents: number): string {
  const whole = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, '0');
  return `${whole},${decimals}`;
}

/**
 * Calcula un porcentaje de un importe y redondea las mitades hacia arriba.
 * Usa enteros porque 5000 * 1.13 da 5649.999999999999: el 1,13 % de 5000 es 56,5 y redondearía
 * a 56 en lugar de 57. Multiplica con BigInt porque, con importes grandes, centavos × centésimos
 * de porcentaje supera Number.MAX_SAFE_INTEGER y el producto deja de ser exacto.
 */
export function percentOfCents(cents: number, percent: number): number {
  const hundredthsOfPercent = BigInt(Math.round(percent * 100));
  return Number((BigInt(cents) * hundredthsOfPercent + 5000n) / 10000n);
}
