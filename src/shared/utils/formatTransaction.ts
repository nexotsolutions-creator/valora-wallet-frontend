import type { CurrencyCode, Transaction } from "../types/models";

export type TransactionTone = "pos" | "neg" | "gold";

export interface TransactionDisplay {
  title: string;
  date: string;
  amount: string;
  currency: CurrencyCode;
  glyph: string;
  tone: TransactionTone;
  /** Presente en EXCHANGE, BUY y SELL — cuántas unidades de la moneda destino
   *  vale 1 unidad de la moneda origen, tal como la calculó el backend. Las
   *  tres comparten la misma lógica de conversión del lado del backend (ver
   *  executeConversion en transactionService.ts del repo backend). */
  rateNote?: string;
}

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = { USD: "US$", EUR: "€", ARS: "$" };

function formatAmount(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOL[currency];
  return `${symbol}${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function buildRateNote(tx: Transaction): string | undefined {
  if (!tx.exchangeRate) return undefined;
  return `1 ${tx.sourceCurrency ?? "?"} = ${tx.exchangeRate.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${tx.targetCurrency ?? "?"}`;
}

// El backend no siempre llena los dos lados (ej. un DEPOSIT no tiene source) —
// para tipos donde no sabemos de antemano cuál lado viene poblado (TRANSFER_*,
// o cualquier tipo nuevo que caiga en el default), se usa el primero disponible
// en vez de asumir uno fijo y mostrar "$0.00" si justo viene vacío.
function pickAvailableAmount(tx: Transaction): { amount: number; currency: CurrencyCode } {
  if (tx.targetAmount !== null && tx.targetCurrency !== null) {
    return { amount: tx.targetAmount, currency: tx.targetCurrency };
  }
  if (tx.sourceAmount !== null && tx.sourceCurrency !== null) {
    return { amount: tx.sourceAmount, currency: tx.sourceCurrency };
  }
  return { amount: 0, currency: "USD" };
}

// Mapea la forma "cruda" que devuelve el backend (con source/target nulleables
// según el tipo de movimiento) a lo que necesita la fila de UI. Un solo lugar
// para esto — lo consumen Dashboard e Historial, para no duplicar el mapeo.
export function formatTransaction(tx: Transaction): TransactionDisplay {
  const date = formatDate(tx.createdAt);

  switch (tx.transactionType) {
    case "DEPOSIT": {
      const currency = tx.targetCurrency ?? "USD";
      return {
        title: "Depósito recibido",
        date,
        amount: `+${formatAmount(tx.targetAmount ?? 0, currency)}`,
        currency,
        glyph: "arrow_downward",
        tone: "pos",
      };
    }
    case "EXCHANGE": {
      const currency = tx.targetCurrency ?? tx.sourceCurrency ?? "USD";
      return {
        title: `Intercambio ${tx.sourceCurrency ?? "?"} → ${tx.targetCurrency ?? "?"}`,
        date,
        amount: formatAmount(tx.targetAmount ?? 0, currency),
        currency,
        glyph: "sync_alt",
        tone: "gold",
        rateNote: buildRateNote(tx),
      };
    }
    case "BUY": {
      const currency = tx.sourceCurrency ?? "USD";
      return {
        title: `Compra de ${tx.targetCurrency ?? ""}`,
        date,
        amount: `-${formatAmount(tx.sourceAmount ?? 0, currency)}`,
        currency,
        glyph: "arrow_upward",
        tone: "neg",
        rateNote: buildRateNote(tx),
      };
    }
    case "SELL": {
      const currency = tx.targetCurrency ?? "USD";
      return {
        title: `Venta de ${tx.sourceCurrency ?? ""}`,
        date,
        amount: `+${formatAmount(tx.targetAmount ?? 0, currency)}`,
        currency,
        glyph: "arrow_downward",
        tone: "pos",
        rateNote: buildRateNote(tx),
      };
    }
    case "TRANSFER_OUT": {
      const { amount, currency } = pickAvailableAmount(tx);
      return {
        title: "Transferencia enviada",
        date,
        amount: `-${formatAmount(amount, currency)}`,
        currency,
        glyph: "north_east",
        tone: "neg",
      };
    }
    case "TRANSFER_IN": {
      const { amount, currency } = pickAvailableAmount(tx);
      return {
        title: "Transferencia recibida",
        date,
        amount: `+${formatAmount(amount, currency)}`,
        currency,
        glyph: "south_west",
        tone: "pos",
      };
    }
    default: {
      // Red de seguridad: un transactionType que el frontend todavía no conoce
      // (pasó de verdad — ver historial de este archivo) no debe tirar abajo
      // Dashboard/Historial/notificaciones enteros. Degrada a una fila
      // genérica en vez de un TypeError por desestructurar undefined.
      const { amount, currency } = pickAvailableAmount(tx);
      return {
        title: "Movimiento",
        date,
        amount: formatAmount(amount, currency),
        currency,
        glyph: "swap_horiz",
        tone: "gold",
      };
    }
  }
}
