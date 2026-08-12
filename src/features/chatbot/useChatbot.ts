import { useEffect, useRef, useState } from "react";
import { CHATBOT_MAX_MESSAGE_LENGTH, sendChatMessage } from "./chatbotService";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import { useAuth } from "../../shared/auth/useAuth";
import { CHATBOT_HISTORY_KEY_PREFIX } from "../../shared/constants";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
}

const MESSAGE_TOO_LONG_ERROR = `El mensaje no puede superar los ${CHATBOT_MAX_MESSAGE_LENGTH} caracteres.`;

// 50 mensajes ≈ 25 intercambios pregunta/respuesta — historial reciente
// razonable sin arriesgar la cuota de localStorage (~5-10MB por origen,
// compartida con lo que sea que se guarde ahí en el futuro). Un mensaje real
// ronda unos pocos cientos de caracteres incluso con markdown, así que 50
// mensajes son unos pocos KB en el peor caso.
const CHATBOT_HISTORY_LIMIT = 50;

function chatbotHistoryKey(userId: string): string {
  return `${CHATBOT_HISTORY_KEY_PREFIX}${userId}`;
}

// Valida cada elemento, no solo que el JSON sea un array — un localStorage con
// objetos incompletos (ej. escrito por una versión vieja del código, o tocado
// a mano) podía romper el render (msg.role/msg.text undefined) en vez de
// degradar con claridad.
function isValidChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    (candidate.role === "user" || candidate.role === "bot") &&
    typeof candidate.text === "string"
  );
}

function readStoredMessages(userId: string | undefined): ChatMessage[] | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(chatbotHistoryKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const valid = parsed.filter(isValidChatMessage);
    // Si no queda nada válido después de filtrar, es lo mismo que no tener
    // historial — cae al flujo de WELCOME_MESSAGE, no un array vacío sin
    // saludo inicial.
    return valid.length > 0 ? valid : null;
  } catch {
    // localStorage bloqueado (modo privado, cuota) o JSON corrupto — arranca
    // sin historial guardado en vez de romper el chat.
    return null;
  }
}

// crypto.randomUUID() necesita contexto seguro (HTTPS/localhost) y no existe
// en navegadores/webviews viejos — puede tirar en runtime. Fallback simple,
// solo necesita ser único dentro de esta sesión de chat (no persiste).
function generateMessageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Mensaje estático de UI, no pasa por chatbotService — fallback para cuando
// no hay historial guardado (primera vez que este usuario abre el chat, o
// después de un logout que lo borró). Si hay historial persistido en
// localStorage, ese gana y este mensaje no se vuelve a inyectar encima.
const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "bot",
  text: "¡Hola! Soy Botsi, tu asistente virtual de Valora. ¿En qué puedo ayudarte hoy?",
};

export function useChatbot() {
  const { token, user } = useAuth();
  const userId = user?.id;
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => readStoredMessages(userId) ?? [WELCOME_MESSAGE],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persiste el historial en cada cambio, acotado a los últimos
  // CHATBOT_HISTORY_LIMIT. userId siempre está presente en la práctica (el
  // panel solo se monta detrás de ProtectedRoute), pero se chequea igual —
  // sin usuario no hay dónde scopear la key.
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(chatbotHistoryKey(userId), JSON.stringify(messages.slice(-CHATBOT_HISTORY_LIMIT)));
    } catch {
      // localStorage bloqueado o sin cuota — el chat sigue andando en memoria
      // para esta sesión, solo no persiste entre recargas.
    }
  }, [messages, userId]);

  // El hook vive exactamente lo que vive ChatbotWidget — un solo mount/unmount
  // por instancia (a diferencia de loadDashboardData en Dashboard.tsx, que
  // corre varias veces dentro del mismo componente por cambios de token, y por
  // eso necesita resetear su ref en cada corrida). Acá alcanza con apagar el
  // ref una sola vez al desmontar: si el panel se cierra con un
  // sendChatMessage en vuelo, la respuesta no actualiza el estado de una
  // instancia ya desmontada.
  const isMountedRef = useRef(true);

  // El setup también lo prende, no solo useRef(true) al declarar — en dev con
  // StrictMode, React monta, corre el efecto, corre el cleanup enseguida
  // (isMountedRef.current = false) y vuelve a correr el efecto una segunda vez
  // sin desmontar de verdad. Con un setup vacío, esa segunda pasada no repone
  // el true — el ref queda apagado para siempre aunque el componente siga
  // montado, y sendMessage frena todos sus setState (incluido el
  // setIsLoading(false) del finally) como si estuviera desmontado. Repetir
  // isMountedRef.current = true acá cancela ese ciclo sin afectar la
  // protección real: en un desmontaje genuino, el último cleanup en correr
  // sigue siendo el que lo deja en false.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Se valida acá, antes de llamar al service — un mensaje que excede el
    // contrato ni siquiera llega a simular el request.
    if (trimmed.length > CHATBOT_MAX_MESSAGE_LENGTH) {
      setError(MESSAGE_TOO_LONG_ERROR);
      return;
    }

    // A diferencia de Dashboard.tsx (que se desmonta entero vía ProtectedRoute
    // en cuanto token cae a null), este hook puede seguir vivo con el panel
    // todavía abierto en ese momento — un `as string` acá escondería el caso
    // real de sesión vencida en vez de mostrarlo. Guard temprano en vez de
    // cast: angosta token a string para el resto de la función sin asumir nada.
    if (!token) {
      setError("Sesión no válida, iniciá sesión de nuevo.");
      return;
    }

    setError(null);
    setMessages((prev) => [...prev, { id: generateMessageId(), role: "user", text: trimmed }]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(trimmed, token);
      if (!isMountedRef.current) return;

      if (response.success) {
        setMessages((prev) => [...prev, { id: generateMessageId(), role: "bot", text: response.data.reply }]);
      } else {
        setError(response.message);
      }
    } catch (err) {
      // El mock nunca rechaza, pero el service real (fetch) sí puede — sin
      // este catch, una promesa rechazada dejaba isLoading en true para
      // siempre y el error nunca llegaba a mostrarse.
      if (!isMountedRef.current) return;
      setError(getApiErrorMessage(err));
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }

  return { messages, isLoading, error, sendMessage };
}
