import logo from "../../assets/valora-logo.png";
import styles from "./AuthMobileHeader.module.css";

interface AuthMobileHeaderProps {
  /** Muestra el header en todos los breakpoints, no solo mobile. Default: false. */
  alwaysVisible?: boolean;
}

export function AuthMobileHeader({ alwaysVisible = false }: AuthMobileHeaderProps) {
  const className = [styles.mobileHeader, alwaysVisible ? styles.alwaysVisible : ""].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <img src={logo} alt="Valora Wallet" className={styles.mobileLogo} />
      <h1 className={styles.mobileWordmark}>
        Valora<span className={styles.wordmarkMuted}> Wallet</span>
      </h1>
    </div>
  );
}
