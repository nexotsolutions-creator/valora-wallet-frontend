import { useState } from "react";
import { completeProfile } from "../../auth/authService";
import { useAuth } from "../../auth/useAuth";
import { getApiErrorMessage } from "../../services/apiClient";
import type { CountryCode } from "../../types/models";

// Capa service → hook → UI, como el resto del proyecto. Error a nivel de
// formulario completo (no por campo): PATCH /auth/me no distingue si un 400
// fue por celular o por documento inválido/duplicado (verificado contra el
// código real del backend — el mensaje de "dato duplicado" es a propósito
// genérico para los dos casos, para no confirmarle a quien lo intenta cuál de
// los dos ya existe), así que no hay campo al que atarle el error.
export function useCompleteProfile() {
  const { token, updateUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(phone: string, country: CountryCode, du: string, dateOfBirth: string) {
    if (!token) {
      setError("Sesión no válida, iniciá sesión de nuevo.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await completeProfile(phone, country, du, dateOfBirth, token);
      if (!user.profileComplete) {
        setError("No pudimos confirmar la actualización, probá de nuevo.");
        setIsSubmitting(false);
        return;
      }
      // Sin setIsSubmitting(false) acá a propósito: al llegar profileComplete
      // en true, DashboardLayout desmonta este modal (y este hook con él) en
      // el próximo render — nada que resetear en una instancia por desmontarse.
      updateUser(user);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, error, submit };
}
