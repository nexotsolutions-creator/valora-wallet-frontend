import { useEffect, useRef, useState } from "react";
import { Button } from "../Button/Button";
import styles from "./GoogleButton.module.css";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

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

// El Identity Services de Google (index.html) no expone una forma soportada
// de disparar el flujo de ID token desde un botón propio — solo desde su
// propio botón renderizado. Se renderiza ese botón real pero invisible
// (GoogleButton.module.css) y se le hace click por código al tocar el
// nuestro, así conservamos el diseño del resto de la app.
export function GoogleButton({ onSuccess, onError }: GoogleButtonProps) {
  const hiddenButtonRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // El setup de GIS (initialize + renderButton) debe correr una sola vez, no
  // en cada render — pero el callback que registra necesita las props más
  // recientes (Login/Registro pasan funciones inline, distintas en cada
  // render). Mismo patrón que setUnauthorizedHandler en apiClient.ts: refs
  // actualizados en cada render, leídos desde un efecto sin dependencias.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    function setup() {
      if (cancelled || !window.google || !hiddenButtonRef.current || !CLIENT_ID) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            onSuccessRef.current(response.credential);
          } else {
            onErrorRef.current(GENERIC_ERROR);
          }
        },
      });
      window.google.accounts.id.renderButton(hiddenButtonRef.current, { type: "standard" });
      setIsReady(true);
    }

    if (window.google) {
      setup();
    } else {
      // El script en index.html carga con "async" — puede no estar listo
      // todavía cuando este componente monta. Si nunca llega a cargar (CSP,
      // adblock, red caída), no tiene sentido seguir sondeando para siempre
      // mientras la persona esté parada en Login/Registro — se corta a los
      // 10s y el botón queda deshabilitado (mismo estado que "no configurado").
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
    };
  }, []);

  function handleClick() {
    const realButton = hiddenButtonRef.current?.querySelector<HTMLElement>("div[role=button]");
    if (realButton) {
      realButton.click();
    } else {
      onError(GENERIC_ERROR);
    }
  }

  if (!CLIENT_ID) {
    return (
      <Button
        type="button"
        variant="secondary"
        className={styles.googleButton}
        aria-disabled="true"
        title="Todavía no disponible"
      >
        <GoogleLogo />
        Continuar con Google
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={styles.googleButton}
        onClick={handleClick}
        disabled={!isReady}
      >
        <GoogleLogo />
        Continuar con Google
      </Button>
      <div ref={hiddenButtonRef} className={styles.hiddenGoogleButton} aria-hidden="true" />
    </>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.8 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.4 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.3C29.4 35.4 26.8 36 24 36c-5.2 0-9.6-3.4-11.2-8.1l-6.5 5C9.6 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-0.8 2.3-2.3 4.2-4.2 5.6l6.2 5.3C39.9 37 44 31 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
