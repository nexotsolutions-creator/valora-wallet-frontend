// Nombre agnóstico de "exchange" a propósito: lo usan ExchangeForm y
// ConversionModal (conversión de moneda) pero también el formulario de
// Depositar en Dashboard.tsx — es un validador genérico de "monto positivo",
// no una regla exclusiva de conversión.
export const INVALID_AMOUNT_MESSAGE = "Ingresá un monto válido, mayor a cero.";

export function parsePositiveAmount(raw: string): number | null {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const COMPACT_THRESHOLD = 1_000_000;

// Debajo de 1 millón, el número completo con separador de miles (es-AR usa
// "." — ej. "10.000,00") entra bien en las tarjetas de saldo del Dashboard.
// A partir de 1 millón (posible con el tope de ARS 10.000.000 por
// transacción, o acumulando varios depósitos), esa misma cadena ("ARS
// 10.000.000,00") desborda el ancho fijo de la tarjeta — se abrevia a "10M"
// en vez de romper el layout. El valor exacto no se pierde: quien llama a
// esto lo sigue teniendo disponible para mostrarlo completo en un title/tooltip.
export function formatCompactAmount(value: number): string {
  if (Math.abs(value) < COMPACT_THRESHOLD) {
    return value.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  }
  const millions = value / COMPACT_THRESHOLD;
  return `${millions.toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
}
