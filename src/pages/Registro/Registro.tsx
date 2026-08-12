import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button/Button";
import { GoogleButton } from "../../shared/components/GoogleButton/GoogleButton";
import { Input } from "../../shared/components/Input/Input";
import { PhoneNumberField } from "../../shared/components/PhoneNumberField/PhoneNumberField";
import { AuthMobileGlow, AuthBrandGlow } from "../../shared/components/AuthBlobs/AuthBlobs";
import { AuthBrandHeader } from "../../shared/components/AuthBrandHeader/AuthBrandHeader";
import { AuthMobileHeader } from "../../shared/components/AuthMobileHeader/AuthMobileHeader";
import { AuthBrandCopy } from "../../shared/components/AuthBrandCopy/AuthBrandCopy";
import { AuthFormIntro } from "../../shared/components/AuthFormIntro/AuthFormIntro";
import { PasswordStrengthMeter } from "../../shared/components/PasswordStrengthMeter/PasswordStrengthMeter";
import { LegalModal, type LegalVariant } from "../../shared/components/LegalModal/LegalModal";
import { Toast } from "../../shared/components/Toast/Toast";
import { useToast, TOAST_DURATION_MS } from "../../shared/components/Toast/useToast";
import * as authService from "../../shared/auth/authService";
import { useAuth } from "../../shared/auth/useAuth";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import { PHONE_COUNTRY_CODES, RESIDENCE_COUNTRY_CODES } from "../../shared/constants";
import type { CountryCode } from "../../shared/types/models";
import { useDocumentTypes } from "../../shared/hooks/useDocumentTypes";
import { resolveE164Phone } from "../../shared/utils/phone";
import styles from "./Registro.module.css";

const MIN_AGE_YEARS = 18;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Fecha límite para el <input type="date"> (18 años atrás de hoy), calculada
// una sola vez al cargar el módulo — no cambia entre renders. Se arma con los
// componentes locales de la fecha en vez de toISOString() (que convierte a
// UTC) para no correr un día la fecha límite en husos horarios donde la
// medianoche local cae del otro lado del corte UTC.
function getMaxBirthdate(): string {
  const today = new Date();
  const year = today.getFullYear() - MIN_AGE_YEARS;
  const month = today.getMonth() + 1;
  let day = today.getDate();

  // Si hoy es 29 de febrero (bisiesto) pero año-18 no es bisiesto, esa fecha
  // no existe — clampear al 28, el último día válido de febrero ese año.
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    day = 28;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const MAX_BIRTHDATE = getMaxBirthdate();

// El backend (Zod, ver authSchema.ts) espera la fecha en DD/MM/YYYY, no en el
// formato ISO (YYYY-MM-DD) que devuelve un <input type="date"> nativo.
function toBackendDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function Registro() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState(PHONE_COUNTRY_CODES[0].code);
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<CountryCode>(RESIDENCE_COUNTRY_CODES[0].code as CountryCode);
  const [du, setDu] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Separado de "está abierto" a propósito: si legalVariant volviera a un
  // default no nulo al cerrar (ej. `openLegal ?? "terms"`), el Modal seguiría
  // montado durante su animación de salida y se vería un flash del contenido
  // cambiando de variante a mitad del cierre. Cerrar solo debe tocar legalOpen.
  const [legalVariant, setLegalVariant] = useState<LegalVariant>("terms");
  const [legalOpen, setLegalOpen] = useState(false);
  const { message: toast, showToast } = useToast();
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const documentTypes = useDocumentTypes();
  const documentLabel = documentTypes?.[country] ?? "Documento";
  const phonePlaceholder =
    PHONE_COUNTRY_CODES.find((entry) => entry.code === phoneCountryCode)?.example ?? "+54 9 11 1234-5678";

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.register(
        email,
        password,
        firstName,
        lastName,
        toBackendDate(dateOfBirth),
        resolveE164Phone(phoneCountryCode, phone),
        du,
        country,
      );
      showToast("Cuenta creada, iniciá sesión.");
      redirectTimer.current = setTimeout(() => {
        navigate("/login", { replace: true });
      }, TOAST_DURATION_MS);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  // A diferencia del registro por form, /auth/google ya autentica en el mismo
  // paso (crea la cuenta si no existía) — no tiene sentido mandar a esta
  // persona a /login después, directo entra a la app.
  async function handleGoogleSuccess(idToken: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle(idToken);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <AuthMobileGlow />

      <section className={styles.brandPanel}>
        <AuthBrandGlow />
        <AuthBrandHeader />

        <AuthBrandCopy
          headline="Empezá en minutos."
          subtext="Creá tu cuenta y gestioná múltiples monedas desde una sola plataforma hecha para freelancers de LATAM."
        >
          <ul className={styles.brandChecklist}>
            <li className={styles.brandChecklistItem}>
              <span className={`msym ${styles.brandCheckIcon}`} aria-hidden="true">check</span>
              Sin comisiones de apertura ni mantenimiento
            </li>
            <li className={styles.brandChecklistItem}>
              <span className={`msym ${styles.brandCheckIcon}`} aria-hidden="true">check</span>
              Recibí en USD, EUR y ARS al instante
            </li>
            <li className={styles.brandChecklistItem}>
              <span className={`msym ${styles.brandCheckIcon}`} aria-hidden="true">check</span>
              Verificación de identidad en menos de 5 minutos
            </li>
          </ul>
        </AuthBrandCopy>
      </section>

      <div className={styles.formPanel}>
        <div className={styles.formPanelInner}>
          <AuthMobileHeader />

          <AuthFormIntro title="Creá tu cuenta" subtitle="Empezá a gestionar tus finanzas sin fronteras" />

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.nameRow}>
              <Input
                id="firstName"
                label="Nombre"
                type="text"
                size="lg"
                placeholder="Tu nombre"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                icon="person"
                minLength={2}
                required
              />
              <Input
                id="lastName"
                label="Apellido"
                type="text"
                size="lg"
                placeholder="Tu apellido"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                minLength={2}
                required
              />
            </div>

            <Input
              id="email"
              label="Correo electrónico"
              type="email"
              size="lg"
              placeholder="Introducí tu correo"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              icon="mail"
              required
            />

            <Input
              id="birthdate"
              label="Fecha de nacimiento"
              type="date"
              size="lg"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
              autoComplete="bday"
              max={MAX_BIRTHDATE}
              className={styles.dateInput}
              required
            />

            <div className={styles.field}>
              <label className={styles.selectLabel} htmlFor="country">País de residencia</label>
              <div className={styles.selectWrap}>
                <select
                  id="country"
                  className={styles.select}
                  value={country}
                  onChange={(event) => setCountry(event.target.value as CountryCode)}
                >
                  {RESIDENCE_COUNTRY_CODES.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <span className={`msym ${styles.selectIcon}`} aria-hidden="true">expand_more</span>
              </div>
            </div>

            <PhoneNumberField
              dialCodeSelectId="phoneCountryCode"
              localInputId="phone"
              dialCodeLabel="Prefijo"
              labelClassName={styles.selectLabel}
              // var(--spacing-md), no el default var(--spacing-sm) del componente:
              // consistente con .nameRow de este mismo archivo (misma fila de dos
              // columnas, mismo espaciado) — comportamiento preexistente a esta
              // extracción, no una decisión nueva.
              gap="var(--spacing-md)"
              // 639, no el default 859: antes de esta extracción el .phoneRow
              // propio de este archivo wrappeaba a 639px (el breakpoint mobile
              // general de esta pantalla), no a 859px (el del modal) —
              // preservado acá, no una decisión nueva (hallazgo de la review
              // de Copilot: sin esto, apilaba entre 640-859px donde antes iba
              // en fila).
              wrapBreakpoint={639}
              countryCode={phoneCountryCode}
              onCountryCodeChange={setPhoneCountryCode}
              local={phone}
              onLocalChange={setPhone}
              placeholder={phonePlaceholder}
              icon="call"
              required
            />

            {/* Retomado tras el desbloqueo del backend del 10/08 — reemplaza
                la intención de 55281b9 (Analía, mismo día 02:04, revertido en
                db74ca7 a las 02:10 porque el enum de authSchema.ts todavía
                solo aceptaba AR/PE/CO/MX en ese momento). El backend se
                destrabó horas después, mismo día (a458ce2, backend, 16:34:
                "reemplazar validacion de documento por pais con una generica
                para los 19 paises de LATAM") — country/du/phone ya validan
                contra los 19 países LATAM tanto en /auth/register como en
                PATCH /auth/me. Mismo criterio que CompleteProfileModal:
                documento genérico alfanumérico, no el formato fijo de DNI
                argentino de antes. */}
            <Input
              id="du"
              label={documentLabel}
              type="text"
              size="lg"
              placeholder="12345678"
              value={du}
              onChange={(event) => setDu(event.target.value)}
              autoComplete="off"
              icon="badge"
              pattern="[A-Za-z0-9]{5,15}"
              minLength={5}
              maxLength={15}
              required
            />

            <div className={styles.field}>
              <Input
                id="password"
                label="Contraseña"
                type={showPassword ? "text" : "password"}
                size="lg"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                icon={showPassword ? "visibility_off" : "visibility"}
                onIconClick={() => setShowPassword((value) => !value)}
                iconLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                iconPressed={showPassword}
                minLength={6}
                required
              />
              <PasswordStrengthMeter password={password} />
            </div>

            <div className={styles.field}>
              <Input
                id="password2"
                label="Confirmar contraseña"
                type={showConfirmPassword ? "text" : "password"}
                size="lg"
                placeholder="Repetí tu contraseña"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                icon={showConfirmPassword ? "visibility_off" : "visibility"}
                onIconClick={() => setShowConfirmPassword((value) => !value)}
                iconLabel={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                iconPressed={showConfirmPassword}
                error={passwordMismatch}
                required
              />
              {passwordMismatch && <p className={styles.fieldHint}>Las contraseñas no coinciden</p>}
            </div>

            <div className={styles.checkboxRow}>
              {/* <p>, no <label>: los dos botones de abajo son "labelable" (spec de
                  HTML) y un <label> no puede tener descendientes labelable aparte
                  del control que labelea. El nombre accesible del checkbox va por
                  aria-label en vez de la asociación implícita de label+texto. */}
              <input
                id="terms"
                type="checkbox"
                className={styles.checkbox}
                aria-label="Acepto los Términos de Servicio y la Política de Privacidad de Valora Wallet"
                required
              />
              <p className={styles.checkboxLabel}>
                Acepto los{" "}
                <button
                  type="button"
                  className={styles.inlineLink}
                  onClick={() => {
                    setLegalVariant("terms");
                    setLegalOpen(true);
                  }}
                >
                  Términos de Servicio
                </button>{" "}
                y la{" "}
                <button
                  type="button"
                  className={styles.inlineLink}
                  onClick={() => {
                    setLegalVariant("privacy");
                    setLegalOpen(true);
                  }}
                >
                  Política de Privacidad
                </button>{" "}
                de Valora Wallet.
              </p>
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className={styles.actionButton}>
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </Button>

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>o registrate con</span>
              <span className={styles.dividerLine} />
            </div>

            <GoogleButton onSuccess={handleGoogleSuccess} onError={setError} />
          </form>

          <p className={styles.signupHint}>
            ¿Ya tenés cuenta? <Link to="/login" className={styles.inlineLink}>Iniciá sesión</Link>
          </p>

          <p className={styles.footerNote}>© 2026 Valora Digital Limited. Conexión cifrada activa.</p>
        </div>
      </div>

      <Toast message={toast} />
      <LegalModal isOpen={legalOpen} onClose={() => setLegalOpen(false)} variant={legalVariant} />
    </div>
  );
}
