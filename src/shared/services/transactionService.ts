import { apiFetch } from "./apiClient";
import type { CurrencyCode, Transaction, TransactionType } from "../types/models";

export interface TransactionsPagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface TransactionsApiResponse {
  success: boolean;
  data: Transaction[];
  pagination: TransactionsPagination;
}

interface TransactionApiResponse {
  success: boolean;
  data: Transaction;
}

export interface GetTransactionsParams {
  limit?: number;
  page?: number;
  type?: TransactionType;
}

export function getTransactions(
  token: string,
  params: GetTransactionsParams = {},
): Promise<{ transactions: Transaction[]; pagination: TransactionsPagination }> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.page) query.set("page", String(params.page));
  if (params.type) query.set("type", params.type);
  const queryString = query.toString();

  return apiFetch<TransactionsApiResponse>(`/transactions${queryString ? `?${queryString}` : ""}`, {
    token,
  }).then((res) => ({ transactions: res.data, pagination: res.pagination }));
}

export type AmountSide = "source" | "target";

export interface Quote {
  exchangeRate: number;
  sourceAmount: number;
  targetAmount: number;
}

interface QuoteApiResponse {
  success: boolean;
  data: Quote;
}

// De solo lectura, no crea ninguna transacción — misma tasa real que usan
// /buy, /sell y /exchange (ver getExchangeQuote en transactionService.ts del
// backend). El backend rechaza fromCurrency === toCurrency y amount <= 0
// (SAME_CURRENCY / INVALID_AMOUNT) — el caller tiene que evitar esos casos
// antes de llamar, acá no se resuelve solo.
export function getQuote(
  token: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  amount: number,
  amountSide?: AmountSide,
  signal?: AbortSignal,
): Promise<Quote> {
  return apiFetch<QuoteApiResponse>("/transactions/quote", {
    method: "POST",
    token,
    body: JSON.stringify({ fromCurrency, toCurrency, amount, amountSide }),
    signal,
  }).then((res) => res.data);
}

// /exchange, /buy y /sell toman exactamente el mismo body — el backend los
// procesa con la misma lógica de conversión, solo cambia la etiqueta que le
// pone a la transacción (ver executeConversion en transactionService.ts del
// back). amountSide es opcional en el schema del backend (default "source",
// retrocompatible) — solo Comprar lo manda como "target", así "amount"
// representa cuánto se quiere recibir en vez de cuánto se paga.
function postConversion(
  endpoint: "exchange" | "buy" | "sell",
  token: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  amount: number,
  amountSide?: AmountSide,
): Promise<Transaction> {
  return apiFetch<TransactionApiResponse>(`/transactions/${endpoint}`, {
    method: "POST",
    token,
    body: JSON.stringify({ fromCurrency, toCurrency, amount, amountSide }),
  }).then((res) => res.data);
}

export function exchange(
  token: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  amount: number,
): Promise<Transaction> {
  return postConversion("exchange", token, fromCurrency, toCurrency, amount);
}

export function buy(
  token: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  amount: number,
  amountSide?: AmountSide,
): Promise<Transaction> {
  return postConversion("buy", token, fromCurrency, toCurrency, amount, amountSide);
}

export function sell(
  token: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  amount: number,
  amountSide?: AmountSide,
): Promise<Transaction> {
  return postConversion("sell", token, fromCurrency, toCurrency, amount, amountSide);
}

export function deposit(token: string, currency: CurrencyCode, amount: number): Promise<Transaction> {
  return apiFetch<TransactionApiResponse>("/transactions/deposit", {
    method: "POST",
    token,
    body: JSON.stringify({ currency, amount }),
  }).then((res) => res.data);
}

export interface TransferDestination {
  firstName: string;
  lastName: string;
  alias: string | null;
  cvu: string | null;
  email: string;
  document: string | null;
}

interface ResolveTransferApiResponse {
  success: boolean;
  data: TransferDestination;
}

// Le pega al backend por cada alias/CVU/email que se tipea para mostrar a
// quién le vas a transferir antes de confirmar — ver TransferModal. El campo
// se llama "identifier" acá (no "destination", como en el POST real de abajo)
// porque son dos schemas de Zod distintos del lado del backend.
export function resolveTransferDestination(token: string, identifier: string): Promise<TransferDestination> {
  return apiFetch<ResolveTransferApiResponse>("/transactions/transfer/resolve", {
    method: "POST",
    token,
    body: JSON.stringify({ identifier }),
  }).then((res) => res.data);
}

export function transfer(
  token: string,
  currency: CurrencyCode,
  amount: number,
  destination: string,
  concepto?: string,
): Promise<Transaction> {
  return apiFetch<TransactionApiResponse>("/transactions/transfer", {
    method: "POST",
    token,
    body: JSON.stringify({ currency, amount, destination, concepto }),
  }).then((res) => res.data);
}
