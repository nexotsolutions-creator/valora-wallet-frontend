import { useState, type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../shared/components/Button/Button";
import { Input } from "../../shared/components/Input/Input";
import { AuthMobileGlow, AuthBrandGlow } from "../../shared/components/AuthBlobs/AuthBlobs";
import { AuthMobileHeader } from "../../shared/components/AuthMobileHeader/AuthMobileHeader";
import { AuthFormIntro } from "../../shared/components/AuthFormIntro/AuthFormIntro";
import * as authService from "../../shared/auth/authService";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import styles from "./RecuperarContrasena.module.css";

type Status = "idle" | "loading" | "success" | "error";

export function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    try {
      await authService.requestPasswordReset(email);
      setStatus("success");
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err));
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
          title="Recuperar contraseña"
          subtitle="Ingresá tu correo y te mandamos instrucciones para restablecerla."
        />

        {status === "success" ? (
          <p className={styles.successMessage}>
            Si el mail está registrado, vas a recibir instrucciones para restablecer tu contraseña.
          </p>
        ) : (
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

            {status === "error" && errorMessage && (
              <p className={styles.error} role="alert">
                {errorMessage}
              </p>
            )}

            <Button type="submit" disabled={status === "loading"} className={styles.actionButton}>
              {status === "loading" ? "Enviando..." : "Enviar instrucciones"}
            </Button>
          </form>
        )}

        <p className={styles.signupHint}>
          <Link to="/login" className={styles.inlineLink}>Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
