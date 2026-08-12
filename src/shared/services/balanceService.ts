import { apiFetch } from "./apiClient";
import type { Balance } from "../types/models";

interface BalancesApiResponse {
  success: boolean;
  data: Balance[];
}

export function getBalances(token: string): Promise<Balance[]> {
  return apiFetch<BalancesApiResponse>("/balances", { token }).then((res) => res.data);
}
