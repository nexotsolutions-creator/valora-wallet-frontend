import styles from "./AuthFormIntro.module.css";

interface AuthFormIntroProps {
  title: string;
  subtitle: string;
}

export function AuthFormIntro({ title, subtitle }: AuthFormIntroProps) {
  return (
    <div className={styles.formIntro}>
      <h2 className={styles.formTitle}>{title}</h2>
      <p className={styles.formSubtitle}>{subtitle}</p>
    </div>
  );
}
