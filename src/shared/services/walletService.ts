import { apiFetch } from "./apiClient";
import type { Wallet } from "../types/models";

interface UpdateAliasApiResponse {
  success: boolean;
  data: { wallet: Wallet };
  message: string;
}

// 409 (DuplicateAliasError) llega como un ApiError normal vía apiFetch — el
// caller lo distingue leyendo err.status, no hay nada especial que hacer acá.
export function updateAlias(token: string, alias: string): Promise<Wallet> {
  return apiFetch<UpdateAliasApiResponse>("/wallet/alias", {
    method: "PUT",
    token,
    body: JSON.stringify({ alias }),
  }).then((res) => res.data.wallet);
}
