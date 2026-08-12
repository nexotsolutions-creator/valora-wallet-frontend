import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import logo from "../../shared/assets/valora-logo.png";
import { useAuth } from "../../shared/auth/useAuth";
import { BottomNav, type NavEntry } from "../../shared/components/BottomNav/BottomNav";
import { CompleteProfileModal } from "../../shared/components/CompleteProfileModal/CompleteProfileModal";
import { LegalModal, type LegalVariant } from "../../shared/components/LegalModal/LegalModal";
import { NotificationPanel, type AppNotification } from "../../shared/components/NotificationPanel/NotificationPanel";
import { Sidebar } from "../../shared/components/Sidebar/Sidebar";
import { NOTIF_SEEN_KEY_PREFIX, SUPPORT_EMAIL } from "../../shared/constants";
import { ChatbotFAB } from "../../features/chatbot/ChatbotFAB";
import { ChatbotWidget } from "../../features/chatbot/ChatbotWidget";
import { getTransactions } from "../../shared/services/transactionService";
import { deriveNotifications } from "../../shared/utils/deriveNotifications";
import styles from "./DashboardLayout.module.css";

// Contrato del Outlet entre este layout y las páginas que cuelgan de él —
// hoy solo lo consume Dashboard.tsx (botón "Consultar ahora"), pero vive acá
// (el productor) para que no se duplique la forma del objeto en cada consumidor.
export interface DashboardOutletContext {
  onOpenChatbot: () => void;
  onTransactionCreated: () => void;
}

const RECENT_NOTIFICATIONS_LIMIT = 10;
const DISMISSED_NOTIFICATIONS_KEY = "valora_dismissed_notifications";

// "Borrar" una notificación solo la saca del panel — la transacción real que
// la originó sigue intacta y visible en Actividad, que lee de la misma fuente
// de datos pero sin este filtro. Se persiste en sessionStorage (mismo criterio
// que la sesión, ver AuthProvider) para que no reaparezca sola al reabrir el
// panel, que vuelve a pedir las transacciones cada vez que se abre.
function readDismissedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_NOTIFICATIONS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissedIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify([...ids]));
  } catch {
    // Silencioso: en el peor caso no persiste entre reloads, no rompe nada.
  }
}

// "Vista" es un tercer estado, separado de unread (ventana de 24hs sobre
// createdAt, ver deriveNotifications.ts) y de dismissedIds (borrado manual,
// arriba): se apaga el punto rojo de la campanita al abrir el panel, sin
// borrar ninguna notificación. Persiste en localStorage scopeado por userId
// (ver NOTIF_SEEN_KEY_PREFIX en shared/constants.ts) — a diferencia de
// dismissedIds (sessionStorage, sin scope por usuario, ver arriba), esto sí
// sobrevive entre sesiones del navegador para el mismo usuario.
function readSeenIds(userId: string | undefined): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`${NOTIF_SEEN_KEY_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function persistSeenIds(userId: string | undefined, ids: Set<string>) {
  if (!userId) return;
  try {
    localStorage.setItem(`${NOTIF_SEEN_KEY_PREFIX}${userId}`, JSON.stringify([...ids]));
  } catch {
    // Silencioso: en el peor caso no persiste entre reloads, no rompe nada.
  }
}

const NAV_ITEMS: NavEntry[] = [
  { id: "home", label: "Inicio", icon: "account_balance_wallet", path: "/" },
  { id: "cards", label: "Tarjetas", icon: "credit_card", path: "/tarjetas" },
  { id: "swap", label: "Intercambio", icon: "swap_horiz", path: "/intercambio" },
  { id: "activity", label: "Actividad", icon: "receipt_long", path: "/actividad" },
];

export function DashboardLayout() {
  const [openPanel, setOpenPanel] = useState<"notif" | "hamburger" | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalVariant, setLegalVariant] = useState<LegalVariant>("terms");
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const notifAnchorRef = useRef<HTMLDivElement>(null);
  const hamburgerAnchorRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => readDismissedIds());
  const { token, user, logout } = useAuth();
  const [seenIds, setSeenIds] = useState<Set<string>>(() => readSeenIds(user?.id));
  const visibleNotifications = notifications.filter((note) => !dismissedIds.has(note.id));
  const hasUnread = visibleNotifications.some((note) => note.unread && !seenIds.has(note.id));
  const navigate = useNavigate();

  function handleDismissNotification(id: string) {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistDismissedIds(next);
      return next;
    });
  }

  // Sin endpoint de notificaciones en el backend — se derivan de las últimas
  // transacciones reales (ver deriveNotifications.ts). Fetch propio acá, aparte
  // del que hace Dashboard.tsx para sus últimas 5: este vive en el layout,
  // persiste entre rutas, y no tiene por qué depender de que la vista actual
  // sea el Dashboard. Devuelve lo que trajo (o null si no hubo fetch real) para
  // que el efecto de apertura del panel pueda encadenar "marcar como vistas"
  // sobre el resultado de ESTE fetch puntual, no sobre el estado en general.
  const loadNotifications = useCallback(async (): Promise<AppNotification[] | null> => {
    if (!token) return null;
    try {
      const result = await getTransactions(token, { limit: RECENT_NOTIFICATIONS_LIMIT });
      const derived = deriveNotifications(result.transactions);
      setNotifications(derived);
      // Poda seenIds a la intersección con lo que trajo ESTE fetch. notifications
      // siempre viene acotado por RECENT_NOTIFICATIONS_LIMIT (10) — cualquier id
      // persistido que ya no aparezca acá es basura: no aporta nada a hasUnread
      // (que solo mira visibleNotifications) pero quedaría en localStorage para
      // siempre si no se descarta. Corre en los dos fetches (montaje y apertura
      // de panel) — una notificación puede salir del top 10 sin que el usuario
      // haya abierto el panel en el medio. Va acá adentro (no un tercer efecto)
      // porque este es el único punto que ambos fetches ya comparten; forma
      // funcional (prev => ...) para no depender de seenIds como dependencia de
      // este useCallback.
      const currentIds = new Set(derived.map((note) => note.id));
      setSeenIds((prev) => {
        const pruned = new Set([...prev].filter((id) => currentIds.has(id)));
        if (pruned.size === prev.size) return prev;
        persistSeenIds(user?.id, pruned);
        return pruned;
      });
      return derived;
    } catch {
      // Silencioso a propósito: si falla, el panel simplemente muestra el
      // estado vacío de NotificationPanel en vez de romper todo el layout.
      return null;
    }
  }, [token, user?.id]);

  // Trae al montar (para el punto de "no leído" en la campanita antes de que
  // nadie la abra) — a propósito NO marca nada como visto, a diferencia del
  // efecto de apertura de panel de abajo.
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Al abrir el panel: un solo flujo, no dos efectos reactivos compitiendo.
  // Antes había un efecto separado que marcaba como vista cualquier elemento
  // de visibleNotifications apenas esa lista cambiaba — incluyendo el cambio
  // que producía este mismo fetch, así que una notificación nueva quedaba
  // "vista" en el mismo ciclo en que se cargaba, antes de que el punto rojo
  // llegara a reflejarla como no leída en ningún frame observable. Acá se
  // encadena explícitamente: primero el fetch, y recién cuando ESE fetch
  // puntual resuelve, se marcan como vistas las notificaciones que trajo.
  // `cancelled` evita aplicar el resultado si el panel se cerró (o el
  // componente se desmontó) antes de que la promesa resolviera.
  useEffect(() => {
    if (openPanel !== "notif") return;
    let cancelled = false;
    loadNotifications().then((derived) => {
      if (cancelled || !derived) return;
      setSeenIds((prev) => {
        const newIds = derived.map((note) => note.id).filter((id) => !prev.has(id));
        if (newIds.length === 0) return prev;
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        persistSeenIds(user?.id, next);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [openPanel, loadNotifications, user?.id]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function handleHamburgerUsuario() {
    setOpenPanel(null);
    navigate("/usuario");
  }

  // Compartida entre el Sidebar (desktop) y el menú hamburguesa (mobile) — un
  // solo estado/instancia de LegalModal para los dos triggers, en vez de que
  // cada uno mantenga su propia copia. setOpenPanel(null) no tiene efecto
  // cuando la llama Sidebar (openPanel ya está en null en desktop).
  function openLegal(variant: LegalVariant) {
    setOpenPanel(null);
    setLegalVariant(variant);
    setLegalOpen(true);
  }

  // useCallback con deps vacías: ninguna cierra sobre props/state, solo llaman
  // al setter (identidad estable). Sin esto se recrean en cada render de
  // DashboardLayout — cualquier cambio ajeno al chat (ej. abrir el panel de
  // notificaciones) hace que el efecto del Escape en ChatbotWidget (que
  // depende de onClose) se desuscriba y resuscriba de más.
  const handleOpenChatbot = useCallback(() => {
    setChatbotOpen(true);
  }, []);

  const handleCloseChatbot = useCallback(() => {
    setChatbotOpen(false);
  }, []);

  // El Sidebar (desktop) necesita toggle, no un "abrir" a secas: un click abre,
  // el siguiente (con el chatbot ya abierto) lo cierra. Reusa
  // handleOpenChatbot/handleCloseChatbot en vez de un setChatbotOpen directo
  // acá, para no duplicar nada que esos dos hagan además de togglear el estado.
  // ChatbotFAB (mobile) sigue usando handleOpenChatbot sin togglear — en mobile
  // el chatbot ocupa toda la pantalla al abrirse, no hace falta un toggle ahí.
  const handleToggleChatbot = useCallback(() => {
    if (chatbotOpen) {
      handleCloseChatbot();
    } else {
      handleOpenChatbot();
    }
  }, [chatbotOpen, handleOpenChatbot, handleCloseChatbot]);

  // Canal explícito para que cualquier página bajo este layout (Dashboard,
  // ExchangeForm) avise "se creó una transacción" sin pasar datos de la
  // transacción en sí — el fetch de loadNotifications ya trae todo de nuevo.
  // No hace falta distinguir "panel abierto cuando llega el aviso": el panel
  // solo se cierra con click afuera (ver el useEffect de pointerdown/Escape
  // más abajo), así que si el usuario está confirmando una transacción en
  // otra parte de la UI, este panel ya está cerrado.
  const handleTransactionCreated = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  // handleOpenChatbot/handleTransactionCreated ya son estables (useCallback) —
  // pero el objeto que los envuelve para el Outlet context era un literal
  // nuevo en cada render igual, así que useOutletContext() en los consumidores
  // veía un valor "distinto" aunque los handlers adentro fueran los mismos.
  const outletContextValue = useMemo(
    () => ({ onOpenChatbot: handleOpenChatbot, onTransactionCreated: handleTransactionCreated }),
    [handleOpenChatbot, handleTransactionCreated],
  );

  // Cerrar el panel abierto al hacer click/tap afuera o presionar Escape. Se usa
  // pointerdown (no mousedown) para cubrir mouse, touch y pen por igual — este
  // proyecto es mobile-first, mousedown no está garantizado en pantallas táctiles.
  // Solo hay un panel abierto a la vez (openPanel), así que un único listener
  // alcanza para los dos anchors (notificaciones / hamburguesa).
  useEffect(() => {
    if (!openPanel) return;

    function handlePointerDown(event: PointerEvent) {
      const anchor = openPanel === "notif" ? notifAnchorRef.current : hamburgerAnchorRef.current;
      if (anchor && !anchor.contains(event.target as Node)) {
        setOpenPanel(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPanel(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPanel]);

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <img src={logo} alt="Valora Wallet" className={styles.logoImg} />
          <div className={styles.brandText}>
            <span className={styles.brandPrimary}>Valora</span>
            <span className={styles.brandSecondary}>Wallet</span>
          </div>
        </div>

        <div className={styles.actions}>
          <div className={styles.menuAnchor} ref={notifAnchorRef}>
            <button
              type="button"
              className={styles.ghostIconButton}
              onClick={() => setOpenPanel((current) => (current === "notif" ? null : "notif"))}
              aria-label="Notificaciones"
              aria-expanded={openPanel === "notif"}
              aria-controls="notification-panel"
            >
              <span className={`msym ${styles.icon}`} aria-hidden="true">notifications</span>
              {hasUnread && <span className={styles.unreadDot} />}
            </button>

            <NotificationPanel
              notifications={visibleNotifications}
              onClose={() => setOpenPanel(null)}
              onDismiss={handleDismissNotification}
              hidden={openPanel !== "notif"}
            />
          </div>

          <div className={styles.divider} />

          <div className={`${styles.menuAnchor} ${styles.hamburgerAnchor}`} ref={hamburgerAnchorRef}>
            <button
              type="button"
              className={styles.ghostIconButton}
              onClick={() => setOpenPanel((current) => (current === "hamburger" ? null : "hamburger"))}
              aria-label="Menú"
              aria-expanded={openPanel === "hamburger"}
              aria-controls="hamburger-panel"
            >
              <span className={`msym ${styles.icon}`} aria-hidden="true">menu</span>
            </button>

            <div
              id="hamburger-panel"
              className={`${styles.dropdownBox} ${styles.hamburgerPanel}`}
              hidden={openPanel !== "hamburger"}
            >
              <button type="button" className={styles.hamburgerItem} onClick={handleHamburgerUsuario}>
                Usuario
              </button>

              <div className={styles.hamburgerDivider} />

              <button type="button" className={styles.hamburgerItem} onClick={() => openLegal("terms")}>
                Términos y condiciones
              </button>
              <button type="button" className={styles.hamburgerItem} onClick={() => openLegal("privacy")}>
                Políticas de privacidad
              </button>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className={styles.hamburgerItem}
                onClick={() => setOpenPanel(null)}
              >
                Contacta a Soporte
              </a>

              <div className={styles.hamburgerDivider} />

              <button type="button" className={styles.hamburgerItem} onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>
      <Sidebar items={NAV_ITEMS} onLogout={handleLogout} onOpenLegal={openLegal} onToggleChatbot={handleToggleChatbot} />
      <main className={styles.main}>
        <Outlet context={outletContextValue} />
      </main>
      <BottomNav items={NAV_ITEMS} />
      <LegalModal isOpen={legalOpen} onClose={() => setLegalOpen(false)} variant={legalVariant} />
      {chatbotOpen && <ChatbotWidget onClose={handleCloseChatbot} />}
      <ChatbotFAB onOpen={handleOpenChatbot} hidden={chatbotOpen} />
      {/* Sin prop de open/close manual — se abre y cierra solo en función de
          user.profileComplete (ver useCompleteProfile, que llama a updateUser
          del AuthContext al resolver 200). No descartable: sin botón de
          cerrar, sin click-afuera, sin Escape (Modal con dismissible={false}). */}
      {!!user && !user.profileComplete && <CompleteProfileModal />}
    </div>
  );
}
