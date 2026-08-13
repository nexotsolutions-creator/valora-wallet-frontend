import { NavLink } from "react-router-dom";
import { useScrollToTopOnActiveClick } from "../../hooks/useScrollToTopOnActiveClick";
import styles from "./BottomNav.module.css";

export interface NavEntry {
  id: string;
  label: string;
  icon: string;
  path: string;
}

interface BottomNavProps {
  items: NavEntry[];
}

export function BottomNav({ items }: BottomNavProps) {
  const handleNavItemClick = useScrollToTopOnActiveClick();

  return (
    <nav className={styles.bottomNav} aria-label="Navegación inferior">
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
    </nav>
  );
}
