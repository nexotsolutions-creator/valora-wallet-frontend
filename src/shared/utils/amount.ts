// Nombre agnóstico de "exchange" a propósito: lo usan ExchangeForm y
// ConversionModal (conversión de moneda) pero también el formulario de
// Depositar en Dashboard.tsx — es un validador genérico de "monto positivo",
// no una regla exclusiva de conversión.
export const INVALID_AMOUNT_MESSAGE = "Ingresá un monto válido, mayor a cero.";

export function parsePositiveAmount(raw: string): number | null {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
