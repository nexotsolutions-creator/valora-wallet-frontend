// Contrato real acordado (sin backend todavía): POST /chatbot/message, JWT en
// header, request { message } (máx CHATBOT_MAX_MESSAGE_LENGTH, sin conversationId
// — no existe). Sin streaming, sin persistencia, sin memoria de contexto entre
// mensajes del lado del back.
export const CHATBOT_MAX_MESSAGE_LENGTH = 1000;

// No se usa en el mock — queda lista para cuando este service pegue de verdad
// contra el backend y necesite abortar un request colgado con AbortController.
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

// Respuestas fijas para probar el parser de markdown de renderChatText (negrita
// + listas numeradas/con guiones) antes de que exista una respuesta real del
// backend.
const MOCK_REPLIES: string[] = [
  "Según tu actividad reciente tenés un balance saludable en **USD**. Algunas recomendaciones:\n1. Diversificá una parte en EUR para reducir tu exposición cambiaria.\n2. Revisá tus últimas transacciones antes de la próxima conversión.\n3. Activá alertas de tasa de cambio para ARS.",
  "Puedo ayudarte a **optimizar tus finanzas**. Por ejemplo:\n- Consolidar pequeños saldos dispersos\n- Programar conversiones cuando la tasa te favorezca\n- Revisar comisiones de las últimas operaciones",
  "Todavía no tengo acceso a datos en tiempo real, pero puedo orientarte con **buenas prácticas generales**: mantené un colchón en tu moneda local, diversificá en 2 o 3 monedas y evitá conversiones frecuentes por las comisiones.",
];

function pickReply(): string {
  return MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
}

function randomDelayMs(): number {
  return 800 + Math.random() * 700;
}

// No existe endpoint real todavía — simula la latencia de POST /chatbot/message
// para que el hook/UI se comporten igual el día que se reemplace por un apiFetch
// real (mismo criterio que userService.ts). Solo hay que cambiar esta función,
// no el hook ni el componente que la consumen. Nunca rechaza — mismo criterio
// (y misma limitación conocida) que updatePhone/updateAlias en userService.ts.
export function sendChatMessage(_message: string): Promise<ChatbotResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: { reply: pickReply() } });
    }, randomDelayMs());
  });
}
