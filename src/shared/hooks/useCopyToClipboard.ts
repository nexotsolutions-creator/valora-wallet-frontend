import { useEffect, useRef, useState } from "react";

const COPY_CONFIRMATION_MS = 1500;

export interface CopyToClipboard {
  isCopied: boolean;
  copy(value: string): Promise<void>;
  /** Apaga isCopied y cancela el timeout pendiente sin esperar a que expire —
   *  para casos donde otro cambio de UI (ej. ocultar el dato copiado) tiene
   *  que revertir la confirmación visual antes de tiempo. */
  reset(): void;
}

// Mecánica de "copiar al portapapeles" compartida por CopyIconButton (alias,
// CVU) y CardDisplay (número de tarjeta): copia, prende isCopied, lo apaga
// solo a los COPY_CONFIRMATION_MS. Antes vivía duplicada en los dos.
export function useCopyToClipboard(onCopy?: () => void): CopyToClipboard {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      onCopy?.();
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIsCopied(false), COPY_CONFIRMATION_MS);
    } catch {
      // Portapapeles bloqueado (permisos, contexto no seguro) — no rompe nada,
      // simplemente no hay confirmación visual de que se copió.
    }
  }

  function reset() {
    clearTimeout(timeoutRef.current);
    setIsCopied(false);
  }

  return { isCopied, copy, reset };
}
