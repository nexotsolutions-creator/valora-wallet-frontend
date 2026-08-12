import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import styles from "./CardDisplay.module.css";

const EXPIRY_MIN_YEARS = 2;
const EXPIRY_MAX_YEARS = 4;
const COPY_CONFIRMATION_MS = 1500;

// Exportado para que los callers armen su propio onCopy sin hardcodear el
// texto aparte (ver por qué CardDisplay no muestra su propio toast más abajo).
export const CARD_NUMBER_COPIED_MESSAGE = "Copiaste el número de tarjeta.";

interface CardDisplayProps {
  brand?: string;
  /** Se llama después de copiar el número al portapapeles con éxito — quien
   *  use CardDisplay decide cómo avisarlo (ej. su propio showToast de página),
   *  en vez de que este componente monte su propia instancia de Toast: las dos
   *  páginas que lo usan (Dashboard, Tarjetas) ya tienen la suya para otras
   *  acciones, y dos <Toast> independientes en la misma pantalla comparten
   *  position:fixed/z-index — si llegan a coincidir en el tiempo (ej. copiar
   *  justo después de un depósito), uno tapa al otro. */
  onCopy?: () => void;
}

// Generador congruencial lineal (LCG) sembrado por string — no es mulberry32
// (los constantes 1664525/1013904223 son las clásicas de Numerical Recipes),
// no criptográfico, no hace falta: esto es puramente decorativo (ver Estado
// actual en CLAUDE.md, "vista de tarjeta física... vino con el mock del
// diseño Geist"), nunca es dinero ni datos reales de una tarjeta.
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

function generateCardDigits(random: () => number): string {
  let digits = "";
  for (let i = 0; i < 16; i++) {
    digits += Math.floor(random() * 10);
  }
  return digits;
}

function generateExpiry(random: () => number): string {
  const monthsAhead = Math.floor(
    (EXPIRY_MIN_YEARS + random() * (EXPIRY_MAX_YEARS - EXPIRY_MIN_YEARS)) * 12,
  );
  const now = new Date();
  const expiry = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  const mm = String(expiry.getMonth() + 1).padStart(2, "0");
  const yy = String(expiry.getFullYear() % 100).padStart(2, "0");
  return `${mm}/${yy}`;
}

function generateCvv(random: () => number): string {
  let digits = "";
  for (let i = 0; i < 3; i++) {
    digits += Math.floor(random() * 10);
  }
  return digits;
}

function formatCardDigits(digits: string): string {
  return digits.match(/.{1,4}/g)?.join(" ") ?? digits;
}

function maskCardDigits(digits: string): string {
  return `•••• •••• •••• ${digits.slice(12, 16)}`;
}

export function CardDisplay({ brand = "VALORA PLATINUM", onCopy }: CardDisplayProps) {
  const { user } = useAuth();
  const holderName = user ? `${user.firstName} ${user.lastName}`.toUpperCase() : "USUARIO VALORA";

  // Sembrado por el id del usuario: mismo número/vencimiento/CVV mientras dure
  // la sesión (no cambia en cada render ni al abrir/cerrar el ojito), sin
  // persistir nada — no hace falta que sobreviva a un refresh (ver consigna).
  // Un solo useMemo (no uno por dato encadenado a otro) — los tres valores
  // salen de la misma corrida del PRNG, así que da lo mismo memoizarlos juntos
  // que encadenar tres memos sobre la identidad de un cuarto.
  const { cardDigits, expiry, cvv } = useMemo(() => {
    const random = seededRandom(user?.id ?? "guest");
    return {
      cardDigits: generateCardDigits(random),
      expiry: generateExpiry(random),
      cvv: generateCvv(random),
    };
  }, [user?.id]);

  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  function toggleRevealed() {
    setIsRevealed((v) => !v);
    // Sin esto, ocultar y volver a mostrar la tarjeta antes de que pasen los
    // COPY_CONFIRMATION_MS revivía el ícono de "copiado" de la vez anterior
    // (isCopied vive en CardDisplay, no en el botón — no se resetea solo por
    // desmontar/remontar el botón de copiar al togglear el ojo).
    clearTimeout(copyTimeoutRef.current);
    setIsCopied(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(cardDigits);
      setIsCopied(true);
      onCopy?.();
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), COPY_CONFIRMATION_MS);
    } catch {
      // Portapapeles bloqueado (permisos, contexto no seguro) — no rompe nada,
      // simplemente no hay confirmación visual de que se copió.
    }
  }

  return (
    <div className={styles.cardView}>
      <div className={styles.cardGlow} />
      <div className={styles.cardTop}>
        <span className="msym" style={{ fontSize: 22, color: "var(--accent)" }} aria-hidden="true">contactless</span>
        <span className={styles.cardBrand}>{brand}</span>
      </div>
      <div className={styles.cardBottom}>
        <div className={styles.cardNumberRow}>
          <div className={styles.cardNumber}>
            {isRevealed ? formatCardDigits(cardDigits) : maskCardDigits(cardDigits)}
          </div>
          <div className={styles.cardActions}>
            {isRevealed && (
              <button
                type="button"
                className={styles.cardIconButton}
                onClick={handleCopy}
                aria-label={isCopied ? "Número copiado" : "Copiar número de tarjeta"}
              >
                <span className="msym" style={{ fontSize: 18 }} aria-hidden="true">
                  {isCopied ? "check" : "content_copy"}
                </span>
                <span className={styles.copyTooltip} aria-hidden="true">Copiar número de tarjeta</span>
              </button>
            )}
            <button
              type="button"
              className={styles.cardIconButton}
              onClick={toggleRevealed}
              aria-label={isRevealed ? "Ocultar datos de la tarjeta" : "Mostrar datos de la tarjeta"}
            >
              <span className="msym" style={{ fontSize: 18 }} aria-hidden="true">
                {isRevealed ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>
        <div className={styles.cardMeta}>
          <span>{isRevealed ? expiry : "••/••"}</span>
          <span>{isRevealed ? cvv : "•••"}</span>
        </div>
        <div className={styles.cardHolderRow}>
          <span className={styles.cardHolder}>{holderName}</span>
          <div className={styles.cardNetwork}>
            <div className={styles.networkDotRed} />
            <div className={styles.networkDotGold} />
          </div>
        </div>
      </div>
    </div>
  );
}
