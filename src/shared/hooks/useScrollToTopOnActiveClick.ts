import type { MouseEvent } from "react";
import { useLocation } from "react-router-dom";

// Un click con Ctrl/Cmd/Alt/Shift, o que no sea con el botón izquierdo, tiene
// un significado nativo del navegador sobre un <a> (abrir en pestaña nueva,
// en ventana nueva, etc.) que no nos corresponde pisar — nuestro onClick corre
// antes que el de react-router, así que si llamamos preventDefault() sin este
// guard, esos comportamientos nativos quedarían rotos también para el ítem
// del nav que ya está activo.
function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

// Sin helper propio en shared/ para esto (grepeado antes de escribir esta
// función) — si aparece un segundo consumidor de prefers-reduced-motion en el
// proyecto, ahí se justifica extraerlo.
// matchMedia no está garantizado: jsdom (entorno de los tests de Vitest) no lo
// implementa por defecto, y algunos webviews tampoco — sin este guard, un test
// que dispare un click sobre el ítem activo del nav tira runtime error acá.
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Compartido entre Sidebar (desktop) y BottomNav (mobile): tapear/clickear un
// ítem del nav que ya está activo no navega a ningún lado (ya estás ahí), así
// que en vez de no hacer nada, funciona como un "volver arriba" implícito.
// itemPath === location.pathname en vez de reconstruir el isActive real de
// NavLink: hoy todas las rutas del layout son planas (ver App.tsx), así que
// son equivalentes.
// TODO: si aparecen rutas anidadas, revisar equivalencia con isActive real de NavLink.
export function useScrollToTopOnActiveClick() {
  const location = useLocation();

  return function handleNavItemClick(itemPath: string, event: MouseEvent) {
    if (itemPath !== location.pathname) return;
    if (event.button !== 0 || isModifiedClick(event)) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };
}
