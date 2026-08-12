import styles from "./AuthBlobs.module.css";

export function AuthMobileGlow() {
  return (
    <div className={styles.mobileGlow} aria-hidden="true">
      <span className={`${styles.blob} ${styles.blobGold}`} />
      <span className={`${styles.blob} ${styles.blobSuccess}`} />
      <span className={`${styles.blob} ${styles.blobGold}`} />
    </div>
  );
}

export function AuthBrandGlow() {
  return (
    <div className={styles.brandGlow} aria-hidden="true">
      <span className={`${styles.blob} ${styles.blobGold}`} />
      <span className={`${styles.blob} ${styles.blobSuccess}`} />
    </div>
  );
}
