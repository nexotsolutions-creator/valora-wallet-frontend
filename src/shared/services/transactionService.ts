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

// /exchange, /buy y /sell toman exactamente el mismo body — el backend los
// procesa con la misma lógica de conversión, solo cambia la etiqueta que le
// pone a la transacción (ver executeConversion en transactionService.ts del back).
function postConversion(
  endpoint: "exchange" | "buy" | "sell",
  token: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  amount: number,
): Promise<Transaction> {
  return apiFetch<TransactionApiResponse>(`/transactions/${endpoint}`, {
    method: "POST",
    token,
    body: JSON.stringify({ fromCurrency, toCurrency, amount }),
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
): Promise<Transaction> {
  return postConversion("buy", token, fromCurrency, toCurrency, amount);
}

export function sell(
  token: string,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  amount: number,
): Promise<Transaction> {
  return postConversion("sell", token, fromCurrency, toCurrency, amount);
}

export function deposit(token: string, currency: CurrencyCode, amount: number): Promise<Transaction> {
  return apiFetch<TransactionApiResponse>("/transactions/deposit", {
    method: "POST",
    token,
    body: JSON.stringify({ currency, amount }),
  }).then((res) => res.data);
}
