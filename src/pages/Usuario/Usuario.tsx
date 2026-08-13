import { useState } from "react";
import { useAuth } from "../../shared/auth/useAuth";
import * as authService from "../../shared/auth/authService";
import { Button } from "../../shared/components/Button/Button";
import { CopyIconButton } from "../../shared/components/CopyIconButton/CopyIconButton";
import { Input } from "../../shared/components/Input/Input";
import { LegalModal, type LegalVariant } from "../../shared/components/LegalModal/LegalModal";
import { Toast } from "../../shared/components/Toast/Toast";
import { useToast } from "../../shared/components/Toast/useToast";
import { RESIDENCE_COUNTRY_CODES } from "../../shared/constants";
import { useDocumentTypes } from "../../shared/hooks/useDocumentTypes";
import { ApiError, getApiErrorMessage } from "../../shared/services/apiClient";
import { updateAlias } from "../../shared/services/walletService";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { EditPhoneModal } from "./EditPhoneModal";
import { useEditableField } from "./useEditableField";
import styles from "./Usuario.module.css";

// Sin concepto de "estado de cuenta" en el backend (no hay suspensión,
// verificación pendiente, etc. en el modelo real) — no es un dato mockeado
// esperando conectarse, es una etiqueta fija: cualquier cuenta que llegue a
// ver esta página, por definición, ya está activa. Decisión confirmada
// 14/08: se mantiene así en el rediseño, no se resuelve en este PR.
const ACCOUNT_STATUS_LABEL = "Activa";

export function Usuario() {
  const { user, wallet, token, updateWallet, updateUser } = useAuth();
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalVariant, setLegalVariant] = useState<LegalVariant>("terms");
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { message: toast, showToast } = useToast();

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
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Sin datos";

  async function handleToggleNotifications() {
    if (!token || !user) return;
    setIsTogglingNotifications(true);
    try {
      const updated = await authService.updateEmailNotifications(!user.emailNotificationsEnabled, token);
      updateUser(updated);
    } catch (err) {
      showToast(getApiErrorMessage(err));
    } finally {
      setIsTogglingNotifications(false);
    }
  }

  // Reusa el mismo flujo de recuperación de contraseña que /recuperar-contrasena
  // (authService.requestPasswordReset), con el email de la cuenta ya logueada —
  // no hay endpoint de "cambiar contraseña in-place" (confirmado contra dev del
  // backend), así que esto manda un link por mail, no cambia nada al toque.
  async function handleRequestPasswordReset() {
    if (!user?.email) return;
    setIsSendingReset(true);
    try {
      await authService.requestPasswordReset(user.email);
      showToast("Te enviamos un mail con instrucciones para cambiar tu contraseña.");
    } catch (err) {
      showToast(getApiErrorMessage(err));
    } finally {
      setIsSendingReset(false);
    }
  }

  function openLegal(variant: LegalVariant) {
    setLegalVariant(variant);
    setLegalOpen(true);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.avatar}>{avatarInitial}</div>
          <div>
            <h1 className={styles.name}>{fullName}</h1>
            <div className={styles.headerMeta}>
              <span className={styles.email}>{user?.email || "Sin datos"}</span>
              <span className={styles.statusPill}>
                <span className={styles.statusDot} aria-hidden="true" />
                {ACCOUNT_STATUS_LABEL}
              </span>
            </div>
          </div>
        </div>
        {/* Sin onClick a propósito — solo visual/posicionado como en el mockup,
            el flujo de edición de perfil queda pendiente aparte. */}
        <button type="button" className={styles.editProfileButton}>
          <span className="msym" aria-hidden="true">edit</span>
          Editar perfil
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Información personal</h2>

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
        </div>

        <div className={styles.accountColumn}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Información de cuenta</h2>

            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Alias</span>
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
                <div className={styles.accountValueGroup}>
                  <span className={styles.accountValue}>{alias || "Sin registrar"}</span>
                  <button type="button" className={styles.editButton} onClick={startEditingAlias}>
                    Editar
                  </button>
                  {alias && (
                    <CopyIconButton value={alias} label="Copiar alias" onCopy={() => showToast("Copiaste el alias.")} />
                  )}
                </div>
              )}
            </div>

            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>CVU</span>
              <div className={styles.accountValueGroup}>
                <span className={styles.accountValue}>{wallet?.cvu ?? "Sin datos"}</span>
                {wallet?.cvu && (
                  <CopyIconButton value={wallet.cvu} label="Copiar CVU" onCopy={() => showToast("Copiaste el CVU.")} />
                )}
              </div>
            </div>

            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Estado</span>
              <span className={styles.statusPill}>
                <span className={styles.statusDot} aria-hidden="true" />
                {ACCOUNT_STATUS_LABEL}
              </span>
            </div>

            <div className={styles.preferencesBox}>
              <h3 className={styles.preferencesTitle}>Preferencias</h3>
              <div className={styles.toggleRow}>
                <div>
                  {/* "Emails de transacciones", no "Recibir notificaciones": el
                      endpoint (PATCH /auth/me/notifications) controla
                      específicamente depósito/compra/venta/intercambio/
                      transferencia, no notificaciones genéricas ni el email de
                      recuperación de contraseña — verificado contra
                      userModel.ts/authController.ts del backend. */}
                  <div className={styles.toggleLabel}>Emails de transacciones</div>
                  <div className={styles.toggleDescription}>
                    Depósito, compra, venta, intercambio y transferencias. No incluye el email de
                    recuperación de contraseña.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={user?.emailNotificationsEnabled ?? false}
                  aria-label="Emails de transacciones"
                  className={styles.toggle}
                  data-on={user?.emailNotificationsEnabled ?? false}
                  onClick={handleToggleNotifications}
                  disabled={isTogglingNotifications}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            </div>

            <div className={styles.comingSoonBox}>
              <span className={`msym ${styles.comingSoonIcon}`} aria-hidden="true">schedule</span>
              <div className={styles.comingSoonText}>
                <div className={styles.comingSoonTitle}>Más preferencias próximamente</div>
                <div className={styles.comingSoonSubtitle}>Próximamente vas a poder personalizar más opciones.</div>
              </div>
              <span className={styles.comingSoonBadge}>Próximamente</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Acciones</h2>
          <div className={styles.actionsList}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={handleRequestPasswordReset}
              disabled={isSendingReset}
            >
              <span className="msym" aria-hidden="true">lock</span>
              {isSendingReset ? "Enviando..." : "Cambiar contraseña"}
            </button>
            <button type="button" className={styles.actionButton} onClick={() => openLegal("terms")}>
              <span className="msym" aria-hidden="true">description</span>
              Términos y condiciones
            </button>
            <button type="button" className={styles.actionButton} onClick={() => openLegal("privacy")}>
              <span className="msym" aria-hidden="true">shield</span>
              Política de privacidad
            </button>
            <button type="button" className={styles.deleteButton} onClick={() => setIsDeleteModalOpen(true)}>
              <span className="msym" aria-hidden="true">delete</span>
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>

      <EditPhoneModal isOpen={isPhoneModalOpen} onClose={() => setIsPhoneModalOpen(false)} />
      <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
      <LegalModal isOpen={legalOpen} onClose={() => setLegalOpen(false)} variant={legalVariant} />
      <Toast message={toast} />
    </div>
  );
}
