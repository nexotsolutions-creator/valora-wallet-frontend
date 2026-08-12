import logo from "../../assets/valora-logo.png";
import styles from "./AuthBrandHeader.module.css";

export function AuthBrandHeader() {
  return (
    <div className={styles.brandHeader}>
      <img src={logo} alt="Valora Wallet" className={styles.brandLogo} />
      <h1 className={styles.brandWordmark}>
        Valora<span className={styles.wordmarkMuted}> Wallet</span>
      </h1>
    </div>
  );
}
