import { useEffect, useState, type SubmitEvent } from "react";
import { Button } from "../../shared/components/Button/Button";
import { Modal } from "../../shared/components/Modal/Modal";
import { PhoneNumberField } from "../../shared/components/PhoneNumberField/PhoneNumberField";
import { PHONE_COUNTRY_CODES } from "../../shared/constants";
import { completeProfile } from "../../shared/auth/authService";
import { useAuth } from "../../shared/auth/useAuth";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import type { CountryCode } from "../../shared/types/models";
import { resolveE164Phone } from "../../shared/utils/phone";
import styles from "./EditPhoneModal.module.css";

interface EditPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// DO/US comparten dialCode ("+1", ver PHONE_COUNTRY_CODES) — un celular
// guardado (string E.164 plano) no alcanza para saber cuál de los dos se
// eligió en su momento, así que se desempata con el país de residencia del
// usuario. Heurística, no infalible: el usuario puede corregir el selector
// antes de guardar si adivinó mal.
function guessPhoneCountryCode(phone: string | null, residenceCountry: CountryCode): string {
  if (!phone) return PHONE_COUNTRY_CODES[0].code;
  if (phone.startsWith("+1")) {
    return residenceCountry === "DO" ? "DO" : "US";
  }
  // Más largo primero: evita que un dialCode corto "gane" por matchear como
  // prefijo de uno más específico (no pasa hoy entre los 21 países reales,
  // pero deja la función correcta si se suma alguno que sí colisione así).
  const match = [...PHONE_COUNTRY_CODES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((entry) => phone.startsWith(entry.dialCode));
  return match?.code ?? PHONE_COUNTRY_CODES[0].code;
}

export function EditPhoneModal({ isOpen, onClose }: EditPhoneModalProps) {
  const { user, token, updateUser } = useAuth();
  const [phoneCountryCode, setPhoneCountryCode] = useState(PHONE_COUNTRY_CODES[0].code);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se resincroniza cada vez que el modal abre (no solo al montar) — el modal
  // queda montado todo el tiempo, con isOpen alternando (mismo patrón que
  // LegalModal, preserva la animación de cierre) — así el celular actual no
  // queda pisado por un valor viejo si se guardó algo en una apertura previa.
  useEffect(() => {
    if (!isOpen) return;
    const code = guessPhoneCountryCode(user?.phone ?? null, user?.country ?? "AR");
    const dialCode = PHONE_COUNTRY_CODES.find((entry) => entry.code === code)?.dialCode ?? "";
    setPhoneCountryCode(code);
    setPhoneLocal(user?.phone ? user.phone.slice(dialCode.length) : "");
    setError(null);
  }, [isOpen, user?.phone, user?.country]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !user) {
      setError("Sesión no válida, iniciá sesión de nuevo.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // PATCH /auth/me no tiene versión parcial — completeProfileSchema (backend)
      // exige phone+country+du juntos. country/du van con el valor actual del
      // usuario, sin exponerlos como editables acá (este modal solo edita
      // celular) — mismo contrato que ya usa CompleteProfileModal.
      const updated = await completeProfile(
        resolveE164Phone(phoneCountryCode, phoneLocal),
        user.country,
        user.du ?? "",
        token,
      );
      updateUser(updated);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Editar celular">
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>Editar celular</h2>

        <PhoneNumberField
          dialCodeSelectId="editPhoneDialCode"
          localInputId="editPhoneLocal"
          countryCode={phoneCountryCode}
          onCountryCodeChange={setPhoneCountryCode}
          local={phoneLocal}
          onLocalChange={setPhoneLocal}
          required
        />

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
