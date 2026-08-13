import { NavLink } from "react-router-dom";
import { SUPPORT_EMAIL } from "../../constants";
import { useScrollToTopOnActiveClick } from "../../hooks/useScrollToTopOnActiveClick";
import type { NavEntry } from "../BottomNav/BottomNav";
import type { LegalVariant } from "../LegalModal/LegalModal";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  items: NavEntry[];
  onLogout: () => void;
  onOpenLegal: (variant: LegalVariant) => void;
  onToggleChatbot: () => void;
  onOpenHelp: () => void;
}

export function Sidebar({ items, onLogout, onOpenLegal, onToggleChatbot, onOpenHelp }: SidebarProps) {
  const handleNavItemClick = useScrollToTopOnActiveClick();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav} aria-label="Navegación principal">
        <NavLink
          to="/usuario"
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
          onClick={(event) => handleNavItemClick("/usuario", event)}
        >
          <span className={`msym ${styles.navIcon}`} aria-hidden="true">person</span>
          <span className={styles.navLabel}>Usuario</span>
        </NavLink>

        <div className={styles.navDivider} />

        {items.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
            onClick={(event) => handleNavItemClick(item.path, event)}
          >
            <span className={`msym ${styles.navIcon}`} aria-hidden="true">{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}

        <button type="button" className={styles.navItem} onClick={onToggleChatbot}>
          <span className={`msym ${styles.navIcon}`} aria-hidden="true">chat</span>
          <span className={styles.navLabel}>Asistente AI</span>
        </button>
      </nav>

      <button type="button" className={styles.navItem} onClick={onLogout}>
        <span className={`msym ${styles.navIcon}`} aria-hidden="true">logout</span>
        <span className={styles.navLabel}>Cerrar sesión</span>
      </button>

      <div className={styles.footer}>
        <button type="button" className={styles.footerLink} onClick={onOpenHelp}>
          Ayuda
        </button>
        <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.footerLink}>
          Contacta a Soporte
        </a>
        <button type="button" className={styles.footerLink} onClick={() => onOpenLegal("terms")}>
          Términos y condiciones
        </button>
        <button type="button" className={styles.footerLink} onClick={() => onOpenLegal("privacy")}>
          Políticas de privacidad
        </button>
      </div>
    </aside>
  );
}
