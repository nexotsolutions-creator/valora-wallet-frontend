import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../shared/components/Button/Button";
import { Input } from "../../shared/components/Input/Input";
import { PasswordStrengthMeter } from "../../shared/components/PasswordStrengthMeter/PasswordStrengthMeter";
import { AuthMobileGlow, AuthBrandGlow } from "../../shared/components/AuthBlobs/AuthBlobs";
import { AuthMobileHeader } from "../../shared/components/AuthMobileHeader/AuthMobileHeader";
import { AuthFormIntro } from "../../shared/components/AuthFormIntro/AuthFormIntro";
import { Toast } from "../../shared/components/Toast/Toast";
import { useToast, TOAST_DURATION_MS } from "../../shared/components/Toast/useToast";
import * as authService from "../../shared/auth/authService";
import styles from "./ResetPassword.module.css";

type Status = "idle" | "loading" | "error";

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const { message: toast, showToast } = useToast();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const passwordMismatch = confirmPassword.length > 0 && confirmPassword !== password;
  const invalidLink = !token || status === "error";

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || passwordMismatch) return;

    setStatus("loading");
    try {
      await authService.resetPassword(token, password);
      showToast("¡Listo! Ya podés iniciar sesión con tu nueva contraseña.");
      redirectTimer.current = setTimeout(() => {
        navigate("/login", { replace: true });
      }, TOAST_DURATION_MS);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={styles.page}>
      <AuthMobileGlow />
      <div className={styles.brandGlowWrapper}>
        <AuthBrandGlow />
      </div>

      <div className={styles.panelInner}>
        <AuthMobileHeader alwaysVisible />

        <AuthFormIntro
          title="Elegí tu nueva contraseña"
          subtitle="Escribí una contraseña nueva para tu cuenta de Valora Wallet."
        />

        {invalidLink ? (
          <>
            <p className={styles.error} role="alert">
              El enlace no es válido.
            </p>
            <p className={styles.signupHint}>
              <Link to="/recuperar-contrasena" className={styles.inlineLink}>Solicitar uno nuevo</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <Input
                id="password"
                label="Nueva contraseña"
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

            <Button type="submit" disabled={status === "loading" || passwordMismatch} className={styles.actionButton}>
              {status === "loading" ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </div>

      <Toast message={toast} />
    </div>
  );
}
