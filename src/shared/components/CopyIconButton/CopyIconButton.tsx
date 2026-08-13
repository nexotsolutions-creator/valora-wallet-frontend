import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import styles from "./CopyIconButton.module.css";

interface CopyIconButtonProps {
  value: string;
  /** Texto del tooltip y del aria-label en estado normal (ej. "Copiar alias"). */
  label: string;
  /** Se llama después de copiar con éxito — mismo criterio que CardDisplay:
   *  quien usa el botón decide cómo avisarlo (su propio showToast), en vez de
   *  que este componente monte su propia instancia de Toast. */
  onCopy?: () => void;
}

// Mismo patrón que el botón de copiar de CardDisplay.tsx (ícono + tooltip en
// hover + check temporal al copiar) — extraído acá porque Usuario.tsx lo
// necesita dos veces (alias y CVU) sobre un valor de texto simple, sin la
// lógica de tarjeta (revelado, dígitos generados) que trae CardDisplay.
export function CopyIconButton({ value, label, onCopy }: CopyIconButtonProps) {
  const { isCopied, copy } = useCopyToClipboard(onCopy);

  return (
    <button
      type="button"
      className={styles.iconButton}
      onClick={() => copy(value)}
      aria-label={isCopied ? "Copiado" : label}
    >
      <span className="msym" style={{ fontSize: 18 }} aria-hidden="true">
        {isCopied ? "check" : "content_copy"}
      </span>
      <span className={styles.tooltip} aria-hidden="true">{label}</span>
    </button>
  );
}
