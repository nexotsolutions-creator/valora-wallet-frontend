import { apiFetch, ApiError, getApiErrorMessage } from "../../shared/services/apiClient";

// Contrato real (confirmado por Daniel, verificado contra el repo del backend):
// POST /chatbot/message, sin prefijo /api (mismo host que el resto — router.use
// en routes/index.ts monta /auth, /transactions, /balances y /chatbot todos al
// mismo nivel), JWT en header vía Authorization: Bearer <token>, request
// { message } (máx CHATBOT_MAX_MESSAGE_LENGTH, sin conversationId — no existe).
// Sin streaming, sin persistencia, sin memoria de contexto entre mensajes del
// lado del back.
export const CHATBOT_MAX_MESSAGE_LENGTH = 1000;

// El backend no tiene timeout propio alrededor de la llamada a Gemini (verificado
// contra geminiService.ts del repo real — sin AbortController/setTimeout en
// ningún lado de ese archivo ni del resto de src/) — este es la única protección
// real contra que la llamada a Gemini se cuelgue indefinidamente.
export const CHATBOT_TIMEOUT_MS = 25000;

export interface ChatbotRequest {
  message: string;
}

export interface ChatbotSuccessResponse {
  success: true;
  data: { reply: string };
}

export interface ChatbotErrorResponse {
  success: false;
  error: string;
  message: string;
}

export type ChatbotResponse = ChatbotSuccessResponse | ChatbotErrorResponse;

const TIMEOUT_MESSAGE = "El asistente tardó demasiado en responder, probá de nuevo.";

// 400/401 son status HTTP reales — apiFetch los intercepta antes de que este
// service vea el body y tira ApiError (con .message ya resuelto), nunca nos
// deja leer un ChatbotErrorResponse crudo del backend. Por eso el catch de acá
// abajo sintetiza el ChatbotErrorResponse a mano en vez de recibirlo directo.
export async function sendChatMessage(message: string, token: string): Promise<ChatbotResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHATBOT_TIMEOUT_MS);
  const body: ChatbotRequest = { message };

  try {
    return await apiFetch<ChatbotSuccessResponse>("/chatbot/message", {
      method: "POST",
      body: JSON.stringify(body),
      token,
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError normalmente es un DOMException del fetch nativo (dispara antes
    // de que haya una respuesta real que leer) — no es un ApiError, así que no
    // pasa por el fallback message→error→genérico de apiFetch. getApiErrorMessage
    // da un mensaje pensado para "no se pudo conectar", no para "se cortó la
    // espera" — mensaje propio acá para no confundir los dos casos.
    // instanceof Error (no instanceof DOMException): DOMException puede no
    // existir como global en webviews/runtimes viejos, y esa expresión tira
    // ReferenceError si el global no está — Error sí es universal.
    if (err instanceof Error && err.name === "AbortError") {
      return { success: false, error: "TIMEOUT", message: TIMEOUT_MESSAGE };
    }
    // El código de error real del backend (ej. "VALIDATION_ERROR",
    // "UnauthorizedError") no sobrevive dentro de ApiError — apiFetch solo
    // guarda .message y .status, no el campo `error` original del body. Se
    // sintetiza un valor propio acá; nada en la app lee este campo hoy
    // (useChatbot.ts solo usa .message), así que no hace falta que coincida
    // con el código real del backend.
    return {
      success: false,
      error: err instanceof ApiError ? `HTTP_${err.status}` : "NETWORK_ERROR",
      message: getApiErrorMessage(err),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
