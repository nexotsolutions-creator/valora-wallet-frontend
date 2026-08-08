import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import logo from "../../shared/assets/valora-logo.png";
import { useAuth } from "../../shared/auth/useAuth";
import { BottomNav, type NavEntry } from "../../shared/components/BottomNav/BottomNav";
import { LegalModal, type LegalVariant } from "../../shared/components/LegalModal/LegalModal";
import { NotificationPanel, type AppNotification } from "../../shared/components/NotificationPanel/NotificationPanel";
import { Sidebar } from "../../shared/components/Sidebar/Sidebar";
import { SUPPORT_EMAIL } from "../../shared/constants";
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
  const visibleNotifications = notifications.filter((note) => !dismissedIds.has(note.id));
  const hasUnread = visibleNotifications.some((note) => note.unread);
  const { token, logout } = useAuth();
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
  // sea el Dashboard.
  const loadNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getTransactions(token, { limit: RECENT_NOTIFICATIONS_LIMIT });
      setNotifications(deriveNotifications(result.transactions));
    } catch {
      // Silencioso a propósito: si falla, el panel simplemente muestra el
      // estado vacío de NotificationPanel en vez de romper todo el layout.
    }
  }, [token]);

  // Trae al montar (para el punto de "no leído" en la campanita antes de que
  // nadie la abra).
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Y vuelve a traer cada vez que se abre el panel — sin esto, depositar o
  // intercambiar y después abrir la campanita mostraba la lista vieja (fetch
  // de al montar nada más, sin enterarse de acciones hechas después en otra
  // parte de la app).
  useEffect(() => {
    if (openPanel === "notif") loadNotifications();
  }, [openPanel, loadNotifications]);

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

  function handleOpenChatbot() {
    setChatbotOpen(true);
  }

  function handleCloseChatbot() {
    setChatbotOpen(false);
  }

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
      <Sidebar items={NAV_ITEMS} onLogout={handleLogout} onOpenLegal={openLegal} />
      <main className={styles.main}>
        <Outlet context={{ onOpenChatbot: handleOpenChatbot }} />
      </main>
      <BottomNav items={NAV_ITEMS} />
      <LegalModal isOpen={legalOpen} onClose={() => setLegalOpen(false)} variant={legalVariant} />
      {chatbotOpen && <ChatbotWidget onClose={handleCloseChatbot} />}
      {!chatbotOpen && <ChatbotFAB onOpen={handleOpenChatbot} />}
    </div>
  );
}
