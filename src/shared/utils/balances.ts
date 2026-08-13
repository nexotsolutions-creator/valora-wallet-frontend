import type { Balance, CurrencyCode } from "../types/models";

export function balanceFor(balances: Balance[] | null, code: CurrencyCode): number {
  return balances?.find((bal) => bal.currencyCode === code)?.amount ?? 0;
}
