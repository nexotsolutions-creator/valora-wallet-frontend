import type { InputHTMLAttributes } from "react";
import { useId } from "react";
import styles from "./Input.module.css";

type IconClickProps =
  | { onIconClick?: undefined; iconLabel?: string; iconPressed?: boolean }
  // Botón interactivo sin iconLabel no tiene nombre accesible — se exige acá,
  // no solo en runtime, para que un consumidor nuevo no se lo olvide.
  | { onIconClick: () => void; iconLabel: string; iconPressed?: boolean };

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  /** Símbolo de Material Symbols. Decorativo salvo que se pase onIconClick. */
  icon?: string;
  error?: boolean;
  size?: "sm" | "lg";
} & IconClickProps;

export function Input({
  label,
  id,
  className,
  icon,
  onIconClick,
  iconLabel,
  iconPressed,
  error,
  size = "sm",
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const inputClassName = [
    styles.input,
    size === "lg" ? styles.inputLg : "",
    icon ? styles.inputWithIcon : "",
    error ? styles.inputError : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrapper}>
      {label && (
        <label className={size === "lg" ? styles.labelLg : styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={styles.inputWrap}>
        <input id={inputId} className={inputClassName} {...rest} />
        {icon && !onIconClick && (
          <span className={`msym ${styles.inputIcon}`} aria-hidden="true">
            {icon}
          </span>
        )}
        {icon && onIconClick && (
          <button
            type="button"
            className={styles.inputIconButton}
            onClick={onIconClick}
            aria-label={iconLabel}
            aria-pressed={iconPressed}
          >
            <span className="msym" aria-hidden="true">
              {icon}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
