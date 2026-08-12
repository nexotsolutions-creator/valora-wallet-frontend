import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from "react";
import { Button } from "../../shared/components/Button/Button";
import { Input } from "../../shared/components/Input/Input";
import { CHATBOT_MAX_MESSAGE_LENGTH } from "./chatbotService";
import { useChatbot } from "./useChatbot";
import { renderChatText } from "./utils/renderChatText";
import styles from "./ChatbotWidget.module.css";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ChatbotWidgetProps {
  onClose: () => void;
}

export function ChatbotWidget({ onClose }: ChatbotWidgetProps) {
  const [draft, setDraft] = useState("");
  const { messages, isLoading, error, sendMessage } = useChatbot();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje. useEffect (no algo inline durante el render)
  // corre después de que React ya aplicó el DOM del mensaje nuevo — para cuando
  // esto se ejecuta, messagesEndRef ya está en su posición final, sin necesidad
  // de requestAnimationFrame. También depende de isLoading para que la burbuja
  // de "Escribiendo…" quede visible apenas aparece, no recién con la respuesta.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isLoading]);

  // Foco inicial al abrir + devolución de foco al trigger (card "Consultar
  // ahora" o FAB) al cerrar — mismo criterio que Modal.tsx, pero sin
  // focus-trap circular: este panel no tiene backdrop, el dashboard sigue
  // interactuable atrás, así que Tab puede salir del panel sin quedar atrapado.
  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const [first] = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
    (first ?? panel)?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // onKeyDown en el propio panel (bubbling normal), no document.addEventListener
  // — mismo patrón que Modal.tsx. Un listener global en document dispara sin
  // importar dónde está el foco: con un Modal/ConversionModal abierto encima
  // del chat al mismo tiempo, un solo Escape cerraba los dos (bug real,
  // confirmado con Playwright). Acá el evento solo llega si el foco está
  // dentro de este panel.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") onClose();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (isLoading || !trimmed) return;
    sendMessage(draft);
    // Si excede el límite, useChatbot rechaza el envío y setea error, pero no
    // limpia el input — así el usuario puede recortar el texto en vez de
    // perder todo lo que escribió.
    if (trimmed.length <= CHATBOT_MAX_MESSAGE_LENGTH) {
      setDraft("");
    }
  }

  return (
    <div
      className={styles.panel}
      ref={panelRef}
      role="dialog"
      aria-label="Asistente Valora AI"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.header}>
        <h2 className={styles.headerTitle}>
          <span className={`msym ${styles.headerIcon}`} aria-hidden="true">auto_awesome</span>
          Asistente Valora AI
        </h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar asistente">
          <span className="msym" aria-hidden="true">close</span>
        </button>
      </div>

      <div className={styles.messages} aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.role === "user" ? styles.bubbleUser : styles.bubbleBot}>
            {msg.role === "bot" ? renderChatText(msg.text) : msg.text}
          </div>
        ))}
        {isLoading && (
          <div className={styles.bubbleBot}>
            <span className={styles.srOnly}>Escribiendo…</span>
            <span className={styles.typingDots} aria-hidden="true">
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        <Input
          placeholder="Preguntale al asistente..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          error={draft.length > CHATBOT_MAX_MESSAGE_LENGTH}
          className={styles.chatInput}
        />
        <Button type="submit" disabled={isLoading || !draft.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
