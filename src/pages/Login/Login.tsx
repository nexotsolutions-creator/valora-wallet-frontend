import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button/Button";
import { GoogleButton } from "../../shared/components/GoogleButton/GoogleButton";
import { Input } from "../../shared/components/Input/Input";
import { AuthMobileGlow, AuthBrandGlow } from "../../shared/components/AuthBlobs/AuthBlobs";
import { AuthBrandHeader } from "../../shared/components/AuthBrandHeader/AuthBrandHeader";
import { AuthMobileHeader } from "../../shared/components/AuthMobileHeader/AuthMobileHeader";
import { AuthBrandCopy } from "../../shared/components/AuthBrandCopy/AuthBrandCopy";
import { AuthFormIntro } from "../../shared/components/AuthFormIntro/AuthFormIntro";
import { useAuth } from "../../shared/auth/useAuth";
import { SESSION_EXPIRED_KEY, SESSION_EXPIRED_MESSAGE } from "../../shared/auth/AuthProvider";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import styles from "./Login.module.css";

// El único origen hoy es AuthProvider marcando esto tras un 401 por JWT
// vencido. Se lee vía useState lazy (una sola vez, al montar) y se borra en
// el mismo momento — no en location.state: ProtectedRoute también redirige a
// /login (sin state) apenas isAuthenticated pasa a false, y esa segunda
// navegación pisaba el state de la primera (confirmado con Playwright, el
// mensaje nunca llegaba a mostrarse). sessionStorage no depende de cuál de
// las dos navegaciones "gana".
function readAndClearSessionExpiredFlag(): string | null {
  try {
    if (sessionStorage.getItem(SESSION_EXPIRED_KEY) !== "1") return null;
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return SESSION_EXPIRED_MESSAGE;
  } catch {
    return null;
  }
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(readAndClearSessionExpiredFlag);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSuccess(idToken: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle(idToken);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
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
          headline="Tu dinero, sin fronteras."
          subtext="Recibe, convierte y gestioná múltiples monedas desde una sola cuenta hecha para freelancers de LATAM."
        >
          <div className={styles.brandPills}>
            <span className={styles.pill}>
              <span className={styles.pillDot} aria-hidden="true" />
              USD · EUR · ARS
            </span>
            <span className={styles.pill}>
              <span className="msym" style={{ fontSize: 16 }} aria-hidden="true">bolt</span>
              Transferencias instantáneas
            </span>
          </div>
        </AuthBrandCopy>
      </section>

      <div className={styles.formPanel}>
        <div className={styles.formPanelInner}>
          <AuthMobileHeader />

          <AuthFormIntro title="Bienvenido de nuevo" subtitle="Accedé de forma segura a tus activos" />

          <form onSubmit={handleSubmit} className={styles.form}>
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

            <div className={styles.field}>
              <div className={styles.fieldHeader}>
                <label htmlFor="password" className={styles.fieldLabel}>Contraseña</label>
                <Link to="/recuperar-contrasena" className={styles.inlineLink}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                size="lg"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                icon={showPassword ? "visibility_off" : "visibility"}
                onIconClick={() => setShowPassword((value) => !value)}
                iconLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                iconPressed={showPassword}
                required
              />
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className={styles.actionButton}>
              {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
            </Button>

            <div className={styles.divider}>
              <span className={styles.dividerLine} />
              <span className={styles.dividerText}>o continuá con</span>
              <span className={styles.dividerLine} />
            </div>

            <GoogleButton onSuccess={handleGoogleSuccess} onError={setError} />
          </form>

          <p className={styles.signupHint}>
            ¿No tenés cuenta? <Link to="/registro" className={styles.inlineLink}>Registrate</Link>
          </p>

          <p className={styles.footerNote}>© 2026 Valora Digital Limited. Conexión cifrada activa.</p>
        </div>
      </div>
    </div>
  );
}
