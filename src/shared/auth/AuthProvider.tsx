import { useEffect, useState, type PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";
import * as authService from "./authService";
import { setUnauthorizedHandler } from "../services/apiClient";
import type { User, Wallet } from "../types/models";
import { CHATBOT_HISTORY_KEY_PREFIX, NOTIF_SEEN_KEY_PREFIX } from "../constants";

const STORAGE_KEY = "valora_auth";

// El backend firma el JWT con 15 minutos de vida y no tiene endpoint de
// refresh — a esa altura cualquier request autenticado empieza a devolver 401
// ("Token inválido o expirado."). Se guarda en sessionStorage (no en el state
// de navigate()) a propósito: ProtectedRoute también redirige a /login solo
// con isAuthenticated=false (sin state) apenas auth pasa a null, y esa segunda
// navegación pisaba el state de la primera (confirmado con Playwright — el
// mensaje nunca llegaba a verse). sessionStorage no depende de cuál de las
// dos navegaciones "gana". Login.tsx lo lee y lo borra al montar.
export const SESSION_EXPIRED_KEY = "valora_session_expired";
export const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Iniciá sesión de nuevo.";

interface StoredAuth {
  token: string;
  user: User;
  wallet: Wallet;
}

// Antes de este cambio, StoredAuth tenía walletId: string en vez de wallet:
// Wallet — una pestaña con una sesión guardada de esa versión vieja del
// frontend (o cualquier JSON incompleto/corrupto) pasaba el JSON.parse igual,
// solo que sin wallet de verdad. Mismo criterio que isValidChatMessage en
// useChatbot.ts: valida la forma antes de confiar en el dato guardado, no
// solo que sea JSON válido — si no cumple, se ignora la sesión (fuerza
// re-login en vez de arrancar con un wallet a medias).
function isValidStoredAuth(value: unknown): value is StoredAuth {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const user = candidate.user as Record<string, unknown> | undefined;
  const wallet = candidate.wallet as Record<string, unknown> | undefined;
  return (
    typeof candidate.token === "string" &&
    typeof user?.id === "string" &&
    typeof wallet?.id === "string"
  );
}

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidStoredAuth(parsed) ? parsed : null;
  } catch {
    // sessionStorage puede tirar (modo privado, storage bloqueado) además de que
    // el JSON puede estar corrupto — cualquiera de los dos, se ignora la sesión guardada.
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<StoredAuth | null>(() => readStoredAuth());
  const navigate = useNavigate();

  // Sin dependencias: corre después de cada render, así el handler registrado
  // siempre cierra sobre el logout()/navigate más reciente. El costo es
  // trivial (una asignación de variable en apiClient.ts) — evita que un login
  // nuevo en la misma pestaña deje un handler viejo apuntando a auth.user.id
  // de la sesión anterior.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      try {
        sessionStorage.setItem(SESSION_EXPIRED_KEY, "1");
      } catch {
        // Storage bloqueado — en el peor caso el redirect pasa sin el
        // mensaje explicativo, no bloquea el logout en sí.
      }
      logout();
      navigate("/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  });

  useEffect(() => {
    try {
      if (auth) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Storage bloqueado o sin cuota: la sesión sigue andando en memoria para
      // esta pestaña, solo no va a persistir si se recarga la página.
    }
  }, [auth]);

  async function login(email: string, password: string) {
    const response = await authService.login(email, password);
    setAuth(response);
  }

  // Mismo flujo que login(): /auth/google devuelve el mismo shape de sesión
  // (token + user + wallet), sea cuenta nueva o existente — el backend decide
  // internamente si crea el usuario o solo lo autentica.
  async function loginWithGoogle(idToken: string) {
    const response = await authService.googleLogin(idToken);
    setAuth(response);
  }

  // auth no puede ser null acá en la práctica (solo se llama desde la vista
  // Usuario, montada detrás de ProtectedRoute) — igual se chequea explícito
  // en vez de asumir, mismo criterio que el resto de este archivo.
  function updateWallet(wallet: Wallet) {
    setAuth((prev) => (prev ? { ...prev, wallet } : prev));
  }

  // Mismo criterio que updateWallet — CompleteProfileModal la llama con el
  // user completo que devuelve PATCH /auth/me, pero acepta un Partial<User>
  // para no atarla a mandar siempre el objeto entero.
  function updateUser(partial: Partial<User>) {
    setAuth((prev) => (prev ? { ...prev, user: { ...prev.user, ...partial } } : prev));
  }

  function logout() {
    // El historial del chatbot y las notificaciones vistas viven en
    // localStorage, scopeados por userId (ver CHATBOT_HISTORY_KEY_PREFIX y
    // NOTIF_SEEN_KEY_PREFIX en shared/constants.ts) — no se borran solos, hay
    // que limpiarlos acá a mano. Mismo criterio que el resto de esta función:
    // si falla (storage bloqueado/sin cuota), no bloquea el logout en sí.
    if (auth) {
      try {
        localStorage.removeItem(`${CHATBOT_HISTORY_KEY_PREFIX}${auth.user.id}`);
        localStorage.removeItem(`${NOTIF_SEEN_KEY_PREFIX}${auth.user.id}`);
      } catch {
        // Storage bloqueado o sin cuota — no bloquea el logout.
      }
    }
    setAuth(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user: auth?.user ?? null,
        wallet: auth?.wallet ?? null,
        token: auth?.token ?? null,
        isAuthenticated: Boolean(auth?.token),
        login,
        loginWithGoogle,
        logout,
        updateWallet,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
