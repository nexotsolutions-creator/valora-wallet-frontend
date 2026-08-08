const rawApiBaseUrl = import.meta.env.VITE_API_URL;
const MISSING_URL_MESSAGE = "VITE_API_URL no está configurada — revisá tu .env/.env.local.";

if (!rawApiBaseUrl) {
  // No tirar acá: esto corre al importar el módulo, y sin ErrorBoundary deja la
  // app en blanco antes de que se intente ningún request. Se valida de nuevo,
  // y recién ahí se lanza, dentro de apiFetch.
  console.error(MISSING_URL_MESSAGE);
}
// sin esto, una URL con "/" final + un path que arranca con "/" queda con "//".
const API_BASE_URL = (rawApiBaseUrl ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Cualquier error que no sea un ApiError (falló el fetch en sí, no la respuesta
// del servidor) no trae un mensaje pensado para mostrarle al usuario.
export function getApiErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "No se pudo conectar con el servidor. Intentá de nuevo.";
}

interface ApiFetchOptions extends RequestInit {
  token?: string;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  if (!rawApiBaseUrl) {
    throw new ApiError(MISSING_URL_MESSAGE, 0);
  }

  const { token, headers, ...rest } = options;

  // new Headers(headers) normaliza los 3 tipos válidos de HeadersInit (Headers,
  // string[][], Record<string,string>), a diferencia de un object-spread que solo
  // funciona bien con el último. `token` siempre gana sobre un Authorization manual.
  const mergedHeaders = new Headers(headers);
  // Solo forzar JSON si de verdad hay un body y no es FormData: si no, un GET sin
  // body dispara un preflight CORS de más, y con FormData rompemos el boundary
  // que el navegador tiene que setear solo.
  const hasJsonBody = rest.body !== undefined && !(rest.body instanceof FormData);
  if (hasJsonBody && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    mergedHeaders.set("Authorization", `Bearer ${token}`);
  }

  // si el caller pasa el path sin "/" inicial (ej. "auth/login"), la URL queda
  // pegada al dominio sin separador ("...comauth/login") — se normaliza acá.
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...rest,
    headers: mergedHeaders,
  });

  const data = await parseJsonSafely(response);

  if (!response.ok) {
    // El backend manda el texto pensado para mostrarle al usuario en `message`
    // (ej. "Tasa de cambio no disponible..."), no en `error` — ese campo es el
    // código de error interno (ej. "RATE_NOT_AVAILABLE"), no texto para UI. Pero
    // algún endpoint (o un proxy intermedio) puede seguir mandando el texto útil
    // en `error` en vez de `message` — `||` (no `??`) para que también caiga acá
    // si `message` viene como string vacío, no solo undefined/null.
    const errorBody = data as { message?: string; error?: string } | undefined;
    const message = errorBody?.message || errorBody?.error || "Ocurrió un error inesperado. Intentá de nuevo.";
    throw new ApiError(message, response.status);
  }

  return data as T;
}
