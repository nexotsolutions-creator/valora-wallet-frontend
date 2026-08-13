import type { User, Wallet } from "../types/models";

export const STORAGE_KEY = "valora_auth";

export interface StoredAuth {
  token: string;
  user: User;
  wallet: Wallet;
}

// Antes de este cambio, StoredAuth tenía walletId: string en vez de wallet:
// Wallet — una pestaña con una sesión guardada de esa versión vieja del
// frontend (o cualquier JSON incompleto/corrupto) pasaba el JSON.parse igual,
// solo que sin wallet de verdad. Mismo criterio que isValidChatMessage en
// useChatbot.ts: valida la forma antes de confiar en el dato guardado, no
// solo que sea JSON válido — si no cumple, se ignora la sesión (fuerza
// re-login en vez de arrancar con un wallet a medias).
export function isValidStoredAuth(value: unknown): value is StoredAuth {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const user = candidate.user as Record<string, unknown> | undefined;
  const wallet = candidate.wallet as Record<string, unknown> | undefined;
  return (
    typeof candidate.token === "string" &&
    typeof user?.id === "string" &&
    typeof wallet?.id === "string"
  );
}

export function readStoredAuth(): StoredAuth | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidStoredAuth(parsed) ? parsed : null;
  } catch {
    // sessionStorage puede tirar (modo privado, storage bloqueado) además de que
    // el JSON puede estar corrupto — cualquiera de los dos, se ignora la sesión guardada.
    return null;
  }
}
