import styles from "./ChatbotFAB.module.css";

interface ChatbotFABProps {
  onOpen: () => void;
}

// Mobile-only por CSS (mismo criterio que evita los dos <nav> conviviendo) —
// en desktop no renderiza nada visible, el único trigger ahí es la card
// "Consultar ahora" del Dashboard.
export function ChatbotFAB({ onOpen }: ChatbotFABProps) {
  return (
    <button type="button" className={styles.fab} onClick={onOpen} aria-label="Abrir asistente Valora AI">
      <span className={`msym ${styles.fabIcon}`} aria-hidden="true">chat</span>
    </button>
  );
}
