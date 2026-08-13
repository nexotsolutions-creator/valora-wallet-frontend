import styles from "./PasswordStrengthMeter.module.css";

// Todas las barras llenas comparten el color del nivel alcanzado (no un color
// fijo por posición): en nivel 2 las 2 primeras se pintan naranja, en nivel 3
// las 3 primeras amarillo, en nivel 4 las 4 verde — como un semáforo de fuerza.
const STRENGTH_LEVEL_CLASSES = [styles.strengthLevel1, styles.strengthLevel2, styles.strengthLevel3, styles.strengthLevel4];

// Puntaje visual (0-4), no reemplaza la validación real del backend — feedback
// de UX, no un gate.
function getPasswordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const passwordScore = getPasswordScore(password);
  const reachedStrengthClass = passwordScore > 0 ? STRENGTH_LEVEL_CLASSES[passwordScore - 1] : "";

  return (
    <div className={styles.strengthMeter} aria-hidden="true">
      {STRENGTH_LEVEL_CLASSES.map((_, index) => (
        <span
          key={index}
          className={`${styles.strengthBar} ${index < passwordScore ? reachedStrengthClass : ""}`}
        />
      ))}
    </div>
  );
}
