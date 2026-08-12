import { Input } from "../Input/Input";
import { PHONE_COUNTRY_CODES } from "../../constants";
import styles from "./PhoneNumberField.module.css";

interface PhoneNumberFieldProps {
  dialCodeSelectId: string;
  localInputId: string;
  // El `code` elegido (ej. "AR"), no el dialCode con "+" — mismo criterio que
  // ya usaba CompleteProfileModal: el dialCode real se busca recién al armar
  // el submit (ver CompleteProfileModal.tsx / EditPhoneModal.tsx), porque
  // DO/US comparten dialCode ("+1") y `code` es lo único que es único por país.
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  local: string;
  onLocalChange: (value: string) => void;
  dialCodeLabel?: string;
  localLabel?: string;
  placeholder?: string;
  required?: boolean;
  // Ícono del Input de número local (ver Input.tsx `icon`) — CompleteProfileModal
  // no le pone ninguno, Registro.tsx sí usaba "call" antes de esta extracción;
  // sin esta prop ese ícono se perdía al migrar Registro al componente compartido.
  icon?: string;
  // Clase para el <label> del select de prefijo — sin esto, los dos
  // consumidores quedaban con el label del select en el estilo mudo/chico
  // (.label acá abajo) que traía CompleteProfileModal, pisando el label bold
  // (labelLg) que Registro.tsx ya usaba para sus dos selects antes de esta
  // extracción. Default: el propio .label del componente (comportamiento
  // idéntico al que ya tenía CompleteProfileModal).
  labelClassName?: string;
  // Gap entre el selector de prefijo y el input de número local. Default
  // var(--spacing-sm), igual que el .phoneRow original de CompleteProfileModal
  // (comportamiento sin cambios ahí). Registro.tsx pasa var(--spacing-md) acá
  // a propósito, para quedar consistente con su .nameRow (misma fila de dos
  // columnas, mismo espaciado) — antes de esta extracción esa diferencia vivía
  // hardcodeada en su propio .phoneRow.
  gap?: string;
  // Ancho debajo del cual el selector de prefijo y el input de celular pasan
  // de fila a apilados. Default 859 (comportamiento original de
  // CompleteProfileModal/EditPhoneModal, sin cambios). Pese al tipo, no es un
  // número libre: `@media` no admite un valor dinámico vía CSS custom
  // property, así que solo hay soporte real para los dos valores que hoy
  // necesita algún consumidor (ver .wrapAt639 en PhoneNumberField.module.css).
  // Registro.tsx pasa 639 — antes de esta extracción su .phoneRow propio
  // wrappeaba ahí, no a 859px (hallazgo de la review de Copilot sobre el PR:
  // sin esto, Registro apilaba entre 640-859px donde antes iba en fila).
  // Sumar un tercer valor real requiere su propia clase modificadora en el
  // CSS, no alcanza con ampliar este tipo.
  wrapBreakpoint?: 639 | 859;
}

// Selector de prefijo de celular + input de número local — extraído de
// CompleteProfileModal (su origen histórico) para reusarlo también en
// EditPhoneModal (Usuario.tsx) y Registro.tsx, sin duplicar el bloque. La
// sanitización (\D) y el armado del string final (dialCode + local) quedan
// en cada consumidor, no acá — este componente solo maneja la UI controlada.
export function PhoneNumberField({
  dialCodeSelectId,
  localInputId,
  countryCode,
  onCountryCodeChange,
  local,
  onLocalChange,
  dialCodeLabel = "País del celular",
  localLabel = "Celular",
  placeholder = "11 96123-4567",
  required,
  icon,
  labelClassName,
  gap,
  wrapBreakpoint = 859,
}: PhoneNumberFieldProps) {
  const phoneRowClassName =
    wrapBreakpoint === 639 ? `${styles.phoneRow} ${styles.wrapAt639}` : styles.phoneRow;

  return (
    <div className={phoneRowClassName} style={gap ? { gap } : undefined}>
      <div className={styles.phoneField}>
        <label className={labelClassName ?? styles.label} htmlFor={dialCodeSelectId}>
          {dialCodeLabel}
        </label>
        <div className={styles.selectWrap}>
          <select
            id={dialCodeSelectId}
            className={styles.select}
            value={countryCode}
            onChange={(event) => onCountryCodeChange(event.target.value)}
          >
            {PHONE_COUNTRY_CODES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.code} ({entry.dialCode})
              </option>
            ))}
          </select>
          <span className={`msym ${styles.selectIcon}`} aria-hidden="true">expand_more</span>
        </div>
      </div>

      <div className={styles.phoneInputField}>
        <Input
          id={localInputId}
          label={localLabel}
          type="tel"
          size="lg"
          placeholder={placeholder}
          value={local}
          onChange={(event) => onLocalChange(event.target.value)}
          autoComplete="tel-national"
          icon={icon}
          required={required}
        />
      </div>
    </div>
  );
}
