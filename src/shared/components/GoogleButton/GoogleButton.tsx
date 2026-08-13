import { useEffect, useRef } from "react";
import styles from "./GoogleButton.module.css";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

// Tope duro documentado por Google para renderButton() — no acepta "100%" ni
// un ancho mayor, así que se mide el ancho disponible del formulario
// (~420px en Login/Registro, vía wrapperRef) y se recorta acá si hace falta.
const MAX_BUTTON_WIDTH = 400;

// Tiempo de gracia para que GIS inyecte el iframe del botón real después de
// renderButton() antes de asumir que no va a aparecer (ad-blocker/CSP).
const RENDER_CHECK_DELAY_MS = 2000;

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

interface GoogleButtonProps {
  onSuccess: (idToken: string) => void;
  onError: (message: string) => void;
}

const GENERIC_ERROR = "No se pudo iniciar sesión con Google. Intentá de nuevo.";

// google.accounts.id.initialize() es un singleton global: la última llamada
// pisa la configuración de cualquier llamada anterior en la misma carga de
// página (documentado por Google — cada llamada extra emite el warning
// "initialize() is called multiple times"). /login y /registro son rutas
// hermanas bajo GuestRoute (App.tsx) — React Router navega entre ellas sin
// recargar la página (Login.tsx/Registro.tsx se linkean con <Link>, no
// <a href>), así que window.google persiste entre esa navegación y cada una
// monta su propia instancia de GoogleButton. Sin esta guarda a nivel módulo,
// ir de /login a /registro (o viceversa) sin refrescar dispara una segunda
// llamada real a initialize() — no simulada por StrictMode, confirmado en
// producción (reporte de Analía, 12/08). Nunca hay dos instancias de
// GoogleButton montadas a la vez (son rutas hermanas mutuamente excluyentes,
// sin Suspense/lazy en App.tsx que pueda solaparlas), así que "una sola vez
// por carga de página" es seguro acá.
let hasInitializedGoogleClient = false;

// El callback que registra initialize() también es global y solo se registra
// una vez (con la guarda de arriba) — si cerrara sobre los props de la
// instancia que llamó initialize() primero, un login exitoso en /registro
// después de haber pasado por /login ejecutaría el onSuccess/onError de
// Login, no el de Registro. Esta indirección hace que el callback lea
// siempre el handler de la instancia actualmente montada, sin importar cuál
// llamó initialize() en su momento.
const activeHandlers: { onSuccess: (idToken: string) => void; onError: (message: string) => void } = {
  onSuccess: () => {},
  onError: () => {},
};

export function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {
  // wrapperRef mide el espacio disponible (ancho completo del formulario) y
  // centra — containerRef es donde Google renderiza de verdad, con un ancho
  // fijo en px (no relativo) para que no le quede margen propio a lo que
  // Google dibuje adentro. Ver el comentario en setup() sobre por qué hacen
  // falta los dos.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // activeHandlers (módulo) se actualiza en cada render de la instancia
  // actualmente montada, no solo al inicializar — así el callback global
  // de initialize() siempre ejecuta la lógica de la página en pantalla.
  useEffect(() => {
    activeHandlers.onSuccess = onSuccess;
    activeHandlers.onError = onError;
  }, [onSuccess, onError]);

  // StrictMode (main.tsx) monta cada componente dos veces en desarrollo
  // (monta → limpia → vuelve a montar) para detectar efectos no idempotentes
  // — sin esta guarda, la segunda invocación repetía renderButton() sobre el
  // mismo containerRef.current, dejando dos botones apilados en el mismo
  // div. Es por instancia (no a nivel módulo, a diferencia de
  // hasInitializedGoogleClient) porque renderButton() sí necesita correr una
  // vez por cada instancia real de GoogleButton (cada una tiene su propio
  // containerRef) — solo initialize() debe correr una sola vez por página.
  const hasSetupRef = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;
    let renderCheckId: ReturnType<typeof setTimeout> | undefined;

    async function setup() {
      if (
        cancelled ||
        hasSetupRef.current ||
        !window.google ||
        !containerRef.current ||
        !wrapperRef.current ||
        !CLIENT_ID
      ) {
        return;
      }
      // Reclamamos la guarda ANTES del await, no después: si no, dos
      // invocaciones de este efecto muy próximas en el tiempo (StrictMode)
      // podrían pasar juntas el chequeo de arriba mientras las dos esperan
      // document.fonts.ready, y terminar llamando initialize()/renderButton()
      // dos veces igual.
      hasSetupRef.current = true;

      // Medir el ancho del contenedor antes de que el layout se haya
      // asentado del todo (ej. una fuente web todavía cargando, cambiando
      // altura/scroll de la página) puede dar un ancho que ya no es el
      // final — renderButton() usa ese ancho tal cual, así que si termina
      // siendo mayor al margen real disponible, el <div> con
      // overflow:hidden del contenedor le recorta la esquina, dejando un
      // filo visible del ícono. document.fonts.ready espera a que terminen
      // de cargar antes de medir. Si la Font Loading API no existe en el
      // navegador (Safari viejo) o falla, seguimos sin bloquear.
      try {
        await document.fonts?.ready;
      } catch {
        // seguimos igual si la espera de fuentes falla
      }
      // Repetimos el chequeo (menos hasSetupRef, que ya reclamamos arriba):
      // el componente pudo desmontarse mientras esperábamos las fuentes.
      if (cancelled || !window.google || !containerRef.current || !wrapperRef.current || !CLIENT_ID) return;

      if (!hasInitializedGoogleClient) {
        hasInitializedGoogleClient = true;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              activeHandlers.onSuccess(response.credential);
            } else {
              activeHandlers.onError(GENERIC_ERROR);
            }
          },
        });
      }
      // Botón nativo de Google, visible de verdad — reemplaza al botón
      // propio que hacía .click() por código sobre un botón real oculto: ese
      // click sintético no siempre cuenta como gesto genuino de usuario para
      // FedCM, y el navegador terminaba bloqueando el popup de OAuth
      // (confirmado en consola de Vercel: "Failed to open popup window...
      // Maybe blocked by the browser" + beacons popupNotOpened, 13/08). Acá
      // el click es real, sobre el elemento real.
      //
      // Medimos desde wrapperRef, no containerRef: containerRef está a
      // punto de recibir un ancho fijo acá abajo, así que ya no sirve como
      // referencia de "cuánto espacio hay disponible" (mediría lo que le
      // acabamos de fijar, no el espacio real del formulario).
      const container = containerRef.current;
      const width = Math.min(wrapperRef.current.offsetWidth, MAX_BUTTON_WIDTH);
      // Google alterna, sin que lo controlemos, entre renderizar un
      // <div role="button"> normal (que sí respeta el "width" de las
      // opciones como su propio ancho) y un <iframe> (confirmado en
      // producción, 14/08) — ese iframe ocupa el 100% de containerRef sin
      // importar el "width" de las opciones, que ahí adentro solo gobierna
      // lo que Google dibuja DENTRO del iframe. Si containerRef mide más
      // que ese ancho, queda un margen del lado de Google (cross-origin,
      // no estilable) que se ve blanco. Fijar el ancho real de containerRef
      // al mismo número que le pedimos a Google elimina ese margen sea
      // cual sea la variante que use esta vez.
      container.style.width = `${width}px`;
      try {
        window.google.accounts.id.renderButton(container, {
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          width: String(width),
        });
      } catch {
        activeHandlers.onError(GENERIC_ERROR);
        return;
      }
      // renderButton() inyecta el iframe del botón de forma asíncrona — chequeo
      // demorado (no inmediato) para darle tiempo real a aparecer antes de
      // decidir que falló. Si un ad-blocker/CSP bloqueó el iframe, el
      // contenedor queda vacío para siempre y sin esto nadie se entera: no hay
      // ningún click que pueda disparar el callback de error de Google, porque
      // no hay ningún botón ahí para clickear.
      renderCheckId = setTimeout(() => {
        if (cancelled) return;
        if (container.childElementCount === 0) {
          activeHandlers.onError(GENERIC_ERROR);
        }
      }, RENDER_CHECK_DELAY_MS);
    }

    if (window.google) {
      setup();
    } else {
      // El script en index.html carga con "async" — puede no estar listo
      // todavía cuando este componente monta. Si nunca llega a cargar (CSP,
      // adblock, red caída), no tiene sentido seguir sondeando para siempre
      // mientras la persona esté parada en Login/Registro — se corta a los
      // 10s y el contenedor queda vacío (mismo estado degradado que antes).
      let attempts = 0;
      const MAX_ATTEMPTS = 100;
      pollId = setInterval(() => {
        attempts += 1;
        if (window.google) {
          if (pollId) clearInterval(pollId);
          setup();
        } else if (attempts >= MAX_ATTEMPTS) {
          if (pollId) clearInterval(pollId);
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (renderCheckId) clearTimeout(renderCheckId);
    };
  }, []);

  if (!CLIENT_ID) {
    return <p className={styles.unavailable}>Continuar con Google no está disponible.</p>;
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div ref={containerRef} className={styles.container} />
    </div>
  );
}
