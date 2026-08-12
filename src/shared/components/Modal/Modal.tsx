import { useEffect, useRef, useState, type AnimationEvent, type KeyboardEvent, type PropsWithChildren } from "react";
import styles from "./Modal.module.css";

const CLOSE_FALLBACK_BUFFER_MS = 50;

// Aproximación manual de --modal-anim-duration (Modal.module.css) para cuando no
// hay DOM del cual leer el valor real: sin elemento (dado el único call-site hoy,
// no debería pasar mientras Modal no use portal — prop isOpen controlada, sin
// createPortal; si eso cambia, revisar) o animationDuration vacío (jsdom sin CSS
// inyectado). Si --modal-anim-duration cambia, actualizar también acá — no hay
// forma de derivarlo en runtime sin un elemento conectado.
const FALLBACK_DURATION_MS = 150;

interface ModalProps extends PropsWithChildren {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel: string;
  // Apaga click-afuera y Escape sin tocar el focus trap (sigue andando igual,
  // Tab no se escapa) — pensado para CompleteProfileModal, que no debe poder
  // cerrarse hasta que el request resuelva 200. Default true, retrocompatible
  // con los consumidores existentes.
  dismissible?: boolean;
}

function getAnimationDurationMs(element: HTMLElement | null): number {
  if (!element) return FALLBACK_DURATION_MS;
  const raw = getComputedStyle(element).animationDuration.split(",")[0]?.trim() ?? "0s";
  const value = parseFloat(raw);
  const ms = raw.endsWith("ms") ? value : value * 1000;
  return Number.isNaN(ms) ? FALLBACK_DURATION_MS : ms;
}

// Selector "básico" de elementos focuseables para el focus trap: no filtra por
// visibilidad real (display:none, offsetParent) — cubre los casos actuales del
// proyecto, pero si un modal futuro tiene contenido condicional oculto con
// elementos focuseables adentro, este selector los va a contar igual.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function Modal({ isOpen, onClose, ariaLabel, dismissible = true, children }: ModalProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const wasOpenRef = useRef(isOpen);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingCloseAnimationsRef = useRef<Set<HTMLElement>>(new Set());
  const previousFocusRef = useRef<HTMLElement | null>(null);

  function finishClosing() {
    clearTimeout(closeTimerRef.current);
    setShouldRender(false);
    setIsClosing(false);
  }

  useEffect(() => {
    if (isOpen) {
      clearTimeout(closeTimerRef.current);
      // Solo recapturar si venía realmente cerrado: si isOpen vuelve a true mientras
      // shouldRender sigue en true (reingreso rápido, mitad de la animación de
      // cierre), document.activeElement ya es document.body por el inert del cierre
      // cancelado — recapturar acá pisaría el trigger original con ese valor inútil.
      if (!shouldRender) {
        previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      setShouldRender(true);
      setIsClosing(false);
    } else if (wasOpenRef.current) {
      setIsClosing(true);
      pendingCloseAnimationsRef.current = new Set(
        [overlayRef.current, contentRef.current].filter((el): el is HTMLDivElement => el !== null)
      );
      // Respaldo por si onAnimationEnd nunca dispara (tests con jsdom, animaciones
      // deshabilitadas por el usuario/navegador, overrides de CSS futuros, etc.):
      // sin esto el modal puede quedar "pegado" tapando la app. Se espera a la más
      // lenta entre overlay y content, leídas del CSS real en vez de duplicarlas acá.
      const fallbackMs =
        Math.max(getAnimationDurationMs(overlayRef.current), getAnimationDurationMs(contentRef.current)) +
        CLOSE_FALLBACK_BUFFER_MS;
      closeTimerRef.current = setTimeout(finishClosing, fallbackMs);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, shouldRender]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  // Autofocus al abrir/reabrir (contenido interactivo, sin animar cierre) y
  // devolución de foco al trigger cuando termina de cerrarse del todo. Depende de
  // isClosing (no de isOpen) porque en un reingreso rápido — reabrir mientras
  // isClosing=true — shouldRender nunca pasa por false, pero isClosing sí vuelve
  // a false; sin esa dependencia el efecto no vuelve a correr y el foco queda
  // perdido en document.body (donde lo dejó el inert del cierre cancelado).
  useEffect(() => {
    if (!shouldRender) {
      previousFocusRef.current?.focus();
      return;
    }
    if (isClosing) return;
    const content = contentRef.current;
    if (!content) return;
    const [first] = getFocusableElements(content);
    (first ?? content).focus();
  }, [shouldRender, isClosing]);

  if (!shouldRender) return null;

  function handleAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (!isClosing) return;
    pendingCloseAnimationsRef.current.delete(event.target as HTMLElement);
    if (pendingCloseAnimationsRef.current.size === 0) {
      finishClosing();
    }
  }

  function handleOverlayClick() {
    if (!dismissible) return;
    // Ignorar clicks mientras cierra: el overlay sigue montado durante la
    // animación de salida, y un doble click ahí no debe repetir el onClose del caller.
    if (!isClosing) onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      if (dismissible && !isClosing) onClose();
      return;
    }
    if (event.key !== "Tab" || !contentRef.current) return;
    const focusable = getFocusableElements(contentRef.current);
    if (focusable.length === 0) {
      // Sin elementos focuseables por tabIndex natural, el único destino del trap
      // es .content mismo (foco solo por script) — sin esto, Tab se escapa del
      // modal porque tabIndex={-1} lo saca de la secuencia normal de tabulación.
      event.preventDefault();
      contentRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ""}`}
      onClick={handleOverlayClick}
      onAnimationEnd={handleAnimationEnd}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={contentRef}
        className={`${styles.content} ${isClosing ? styles.contentClosing : ""}`}
        onClick={(event) => event.stopPropagation()}
        inert={isClosing}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
