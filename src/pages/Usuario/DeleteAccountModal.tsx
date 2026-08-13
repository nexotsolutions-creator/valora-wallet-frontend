import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../shared/components/Button/Button";
import { Input } from "../../shared/components/Input/Input";
import { Modal } from "../../shared/components/Modal/Modal";
import { deleteAccount } from "../../shared/auth/authService";
import { useAuth } from "../../shared/auth/useAuth";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import styles from "./DeleteAccountModal.module.css";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// La contraseña es opcional acá porque el backend solo la exige para cuentas
// que tienen una (ver deleteAccount en authService.ts) — si hace falta y no
// se mandó, el error 400 del backend se muestra tal cual, no hace falta que
// el frontend adivine de antemano si la cuenta es de Google o no.
export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se resetea cada vez que el modal abre — mismo criterio que EditPhoneModal,
  // evita que quede una contraseña tipeada de un intento anterior fallido.
  function handleClose() {
    setPassword("");
    setError(null);
    onClose();
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Sesión no válida, iniciá sesión de nuevo.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await deleteAccount(password || undefined, token);
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} ariaLabel="Eliminar cuenta">
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>Eliminar cuenta</h2>
        <p className={styles.warning}>
          Esta acción es permanente e irreversible. Se eliminan tu billetera, saldos, historial de
          transacciones y todo lo asociado a tu cuenta.
        </p>

        <Input
          id="deleteAccountPassword"
          label="Contraseña"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          placeholder="Dejá vacío si iniciás sesión con Google"
        />

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <Button type="submit" variant="danger" disabled={isSubmitting}>
            {isSubmitting ? "Eliminando..." : "Eliminar cuenta"}
          </Button>
          <button type="button" className={styles.cancelButton} onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
