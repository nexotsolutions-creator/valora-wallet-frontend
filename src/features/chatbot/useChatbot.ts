import { useState } from "react";
import { CHATBOT_MAX_MESSAGE_LENGTH, sendChatMessage } from "./chatbotService";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
}

const MESSAGE_TOO_LONG_ERROR = `El mensaje no puede superar los ${CHATBOT_MAX_MESSAGE_LENGTH} caracteres.`;

// Mensaje estático de UI, no pasa por chatbotService — no simula un request
// real, no tiene sentido gastar el mock en esto. Se reinstancia cada vez que
// se monta el hook (ChatbotWidget se desmonta/monta completo con chatbotOpen,
// no usa hidden) — reaparece en cada apertura del panel, esperado sin
// persistencia entre sesiones de chat.
const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "bot",
  text: "¡Hola! Soy Botsi, tu asistente virtual de Valora. ¿En qué puedo ayudarte hoy?",
};

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Se valida acá, antes de llamar al service — un mensaje que excede el
    // contrato ni siquiera llega a simular el request.
    if (trimmed.length > CHATBOT_MAX_MESSAGE_LENGTH) {
      setError(MESSAGE_TOO_LONG_ERROR);
      return;
    }

    setError(null);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: trimmed }]);
    setIsLoading(true);

    const response = await sendChatMessage(trimmed);

    if (response.success) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: response.data.reply }]);
    } else {
      setError(response.message);
    }
    setIsLoading(false);
  }

  return { messages, isLoading, error, sendMessage };
}
