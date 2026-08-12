import { useState } from "react";
import { useAuth } from "../../shared/auth/useAuth";
import { Button } from "../../shared/components/Button/Button";
import { Card } from "../../shared/components/Card/Card";
import { Input } from "../../shared/components/Input/Input";
import { RESIDENCE_COUNTRY_CODES } from "../../shared/constants";
import { useDocumentTypes } from "../../shared/hooks/useDocumentTypes";
import { ApiError } from "../../shared/services/apiClient";
import { updateAlias } from "../../shared/services/walletService";
import { EditPhoneModal } from "./EditPhoneModal";
import { useEditableField } from "./useEditableField";
import styles from "./Usuario.module.css";

// Sin concepto de "estado de cuenta" en el backend (no hay suspensión,
// verificación pendiente, etc. en el modelo real) — no es un dato mockeado
// esperando conectarse, es una etiqueta fija: cualquier cuenta que llegue a
// ver esta página, por definición, ya está activa.
const ACCOUNT_STATUS_LABEL = "Activa";

export function Usuario() {
  const { user, wallet, token, updateWallet } = useAuth();
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const {
    value: alias,
    isEditing: isEditingAlias,
    draft: aliasDraft,
    setDraft: setAliasDraft,
    isSubmitting: isSubmittingAlias,
    error: aliasError,
    startEditing: startEditingAlias,
    cancelEditing: cancelEditingAlias,
    save: saveAlias,
  } = useEditableField(
    wallet?.alias ?? "",
    (draft) => {
      // Usuario solo se monta detrás de ProtectedRoute (token no debería ser
      // null acá en la práctica), pero el guard explícito evita mandar el
      // request sin Authorization si igual llega a pasar — mismo criterio que
      // el resto de shared/auth (ver AuthProvider.tsx) en vez de un cast ciego.
      if (!token) {
        return Promise.reject(new ApiError("Sesión no válida, iniciá sesión de nuevo.", 401));
      }
      return updateAlias(token, draft).then((updated) => {
        // Sin esto, el alias nuevo solo se ve en el estado local de este hook —
        // el resto de la app (y un refresh, que relee sessionStorage) seguiría
        // mostrando el viejo hasta el próximo login.
        updateWallet(updated);
        return updated.alias;
      });
    },
  );

  const documentTypes = useDocumentTypes();
  // Mismo lookup y mismo operador que CompleteProfileModal.tsx/Registro.tsx
  // (documentTypes?.[country] ?? "Documento") — acá country sale de user en
  // vez de un <select> propio. ?? en vez de || a propósito: solo cae al
  // fallback si el catálogo no resolvió (null/undefined), no si alguna vez
  // devolviera "" para algún país.
  const documentLabel = user ? documentTypes?.[user.country] ?? "Documento" : "Documento";

  const avatarInitial = user?.firstName ? user.firstName.charAt(0).toUpperCase() : "?";
  const residenceCountryLabel =
    RESIDENCE_COUNTRY_CODES.find((entry) => entry.code === user?.country)?.label ?? user?.country ?? "Sin datos";

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.avatar}>{avatarInitial}</div>

        <div className={styles.field}>
          <span className={styles.label}>Correo electrónico</span>
          <span className={styles.value}>{user?.email || "Sin datos"}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Nombre</span>
          <span className={styles.value}>{user?.firstName || "Sin datos"}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Apellido</span>
          <span className={styles.value}>{user?.lastName || "Sin datos"}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Fecha de nacimiento</span>
          <span className={styles.value}>{user?.dateOfBirth || "Sin registrar"}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>{documentLabel}</span>
          <span className={styles.value}>{user?.du || "Sin registrar"}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>País de residencia</span>
          <span className={styles.value}>{residenceCountryLabel}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Nro. de celular</span>
          <div className={styles.valueRow}>
            <span className={styles.value}>{user?.phone || "Sin registrar"}</span>
            <button type="button" className={styles.editButton} onClick={() => setIsPhoneModalOpen(true)}>
              Editar
            </button>
          </div>
        </div>
      </Card>

      <Card className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="alias">Alias</label>
          {isEditingAlias ? (
            <div className={styles.editForm}>
              <Input
                id="alias"
                type="text"
                value={aliasDraft}
                onChange={(event) => setAliasDraft(event.target.value)}
                autoComplete="off"
              />
              <div className={styles.editActions}>
                <Button type="button" onClick={saveAlias} disabled={isSubmittingAlias}>
                  {isSubmittingAlias ? "Guardando..." : "Guardar"}
                </Button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={cancelEditingAlias}
                  disabled={isSubmittingAlias}
                >
                  Cancelar
                </button>
              </div>
              {aliasError && (
                <p className={styles.error} role="alert">
                  {aliasError}
                </p>
              )}
            </div>
          ) : (
            <div className={styles.valueRow}>
              <span className={styles.value}>{alias || "Sin registrar"}</span>
              <button type="button" className={styles.editButton} onClick={startEditingAlias}>
                Editar
              </button>
            </div>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>CVU</span>
          <span className={styles.value}>{wallet?.cvu ?? "Sin datos"}</span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Estado</span>
          <span className={styles.value}>{ACCOUNT_STATUS_LABEL}</span>
        </div>
      </Card>

      <EditPhoneModal isOpen={isPhoneModalOpen} onClose={() => setIsPhoneModalOpen(false)} />
    </div>
  );
}
