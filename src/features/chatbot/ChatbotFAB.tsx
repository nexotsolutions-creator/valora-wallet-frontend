import styles from "./ChatbotFAB.module.css";

interface ChatbotFABProps {
  onOpen: () => void;
  /** true mientras el panel del chat está abierto. */
  hidden: boolean;
}

// Mobile-only por CSS (mismo criterio que evita los dos <nav> conviviendo) —
// en desktop no renderiza nada visible, el único trigger ahí es la card
// "Consultar ahora" del Dashboard.
//
// Con el panel abierto, hidden=true lo vuelve inerte (tabIndex/aria-hidden/
// pointer-events) en vez de desmontarlo. A propósito no usa display:none,
// visibility:hidden ni el atributo inert nativo — cualquiera de esos tres le
// saca el foco de encima de forma sincrónica si el FAB lo tenía (por ej. justo
// después de clickearlo), y ChatbotWidget necesita leer document.activeElement
// en su propio efecto (que corre después, ya con el commit aplicado) para
// poder devolver el foco acá al cerrar. Desmontarlo tenía el mismo problema
// (bug real, visto con Playwright): al no unirse foco a él, el foco quedaba
// en document.body porque el nodo ya no estaba en el momento en que
// ChatbotWidget alcanzaba a leerlo.
export function ChatbotFAB({ onOpen, hidden }: ChatbotFABProps) {
  return (
    <button
      type="button"
      className={`${styles.fab} ${hidden ? styles.fabHidden : ""}`}
      onClick={onOpen}
      aria-label="Abrir asistente Valora AI"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : undefined}
    >
      <span className={`msym ${styles.fabIcon}`} aria-hidden="true">chat</span>
    </button>
  );
}
