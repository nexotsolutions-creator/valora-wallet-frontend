import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Modal } from "../Modal/Modal";
import { getApiErrorMessage } from "../../services/apiClient";
import { resolveTransferDestination, transfer, type TransferDestination } from "../../services/transactionService";
import type { Balance, CurrencyCode, Transaction } from "../../types/models";
import { CURRENCY_OPTIONS } from "../../constants";
import { balanceFor } from "../../utils/balances";
import { INVALID_AMOUNT_MESSAGE, parsePositiveAmount } from "../../utils/amount";
import styles from "./TransferModal.module.css";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  balances: Balance[] | null;
  onSuccess: (transaction: Transaction, destination: TransferDestination) => void;
}

export function TransferModal({ isOpen, onClose, token, balances, onSuccess }: TransferModalProps) {
  const [identifier, setIdentifier] = useState("");
  const [destination, setDestination] = useState<TransferDestination | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("ARS");
  const [amount, setAmount] = useState("");
  const [concepto, setConcepto] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Espejo del identificador en vivo, para que handleResolve pueda comparar
  // la respuesta contra el valor ACTUAL del input en vez de contra sí mismo
  // (ver el comentario en handleResolve más abajo).
  const identifierRef = useRef(identifier);
  useEffect(() => {
    identifierRef.current = identifier;
  }, [identifier]);

  useEffect(() => {
    if (!isOpen) return;
    setIdentifier("");
    setDestination(null);
    setResolveError(null);
    setCurrency("ARS");
    setAmount("");
    setConcepto("");
    setSubmitError(null);
  }, [isOpen]);

  // Cambiar el identificador después de haber verificado a alguien invalida esa
  // verificación — si no, quedaría mostrando el nombre de una persona distinta
  // a la que en realidad recibiría la plata si se confirma sin re-verificar.
  function handleIdentifierChange(value: string) {
    setIdentifier(value);
    if (destination) setDestination(null);
    if (resolveError) setResolveError(null);
  }

  async function handleResolve() {
    if (!identifier.trim()) return;
    const trimmedIdentifier = identifier.trim();
    setResolveError(null);
    setIsResolving(true);
    try {
      const result = await resolveTransferDestination(token, trimmedIdentifier);
      // El backend fuerza un piso de 300ms en esta respuesta a propósito
      // (anti-enumeración) — si el identificador cambió (o el modal se cerró y
      // reabrió) mientras viajaba, esta respuesta ya quedó vieja: aplicarla
      // igual mostraría un destinatario distinto al que en realidad se
      // transferiría con el identificador actual. Se descarta en silencio.
      // Comparar contra identifierRef (no contra `identifier` del closure) es
      // lo que hace que esta guardia funcione de verdad: `identifier` acá
      // adentro es el valor capturado al arrancar handleResolve, siempre
      // igual a trimmedIdentifier — comparar closure contra closure nunca
      // detecta un cambio. identifierRef.current sí se actualiza en vivo.
      if (identifierRef.current.trim() !== trimmedIdentifier) return;
      setDestination(result);
    } catch (err) {
      if (identifierRef.current.trim() !== trimmedIdentifier) return;
      setDestination(null);
      setResolveError(getApiErrorMessage(err));
    } finally {
      setIsResolving(false);
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!destination) {
      setSubmitError("Verificá al destinatario antes de confirmar.");
      return;
    }
    const parsedAmount = parsePositiveAmount(amount);
    if (parsedAmount === null) {
      setSubmitError(INVALID_AMOUNT_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      const transaction = await transfer(
        token,
        currency,
        parsedAmount,
        identifier.trim(),
        concepto.trim() || undefined
      );
      onSuccess(transaction, destination);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Transferir dinero">
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>Transferir dinero</h2>
        <p className={styles.subtitle}>Enviá dinero a otra cuenta de Valora por alias, CVU o email.</p>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="transferIdentifier">Alias, CVU o email del destinatario</label>
          <div className={styles.identifierRow}>
            <Input
              id="transferIdentifier"
              value={identifier}
              onChange={(event) => handleIdentifierChange(event.target.value)}
              placeholder="alias.valora, CVU o email"
              disabled={isResolving}
              required
            />
            <Button
              type="button"
              variant="secondary"
              className={styles.verifyButton}
              onClick={handleResolve}
              disabled={isResolving || !identifier.trim()}
            >
              {isResolving ? "Buscando..." : "Verificar"}
            </Button>
          </div>
        </div>

        {resolveError && <p className={styles.error} role="alert">{resolveError}</p>}

        {destination && (
          <div className={styles.recipientCard}>
            <span className={styles.recipientLabel}>Le transferís a</span>
            <span className={styles.recipientName}>{destination.firstName} {destination.lastName}</span>
            {destination.document && (
              <span className={styles.recipientDoc}>Documento: {destination.document}</span>
            )}
          </div>
        )}

        {destination && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="transferCurrency">Moneda</label>
              <select
                id="transferCurrency"
                className={styles.select}
                value={currency}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              >
                {CURRENCY_OPTIONS.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <span className={styles.balanceHint}>
                Disponible: {balanceFor(balances, currency).toLocaleString("es-AR", { maximumFractionDigits: 2 })} {currency}
              </span>
            </div>

            <Input
              label={`Monto en ${currency}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />

            <Input
              label="Concepto (opcional)"
              type="text"
              placeholder="Ej. Alquiler, cena, regalo..."
              maxLength={140}
              value={concepto}
              onChange={(event) => setConcepto(event.target.value)}
            />
          </>
        )}

        {submitError && <p className={styles.error} role="alert">{submitError}</p>}

        <Button type="submit" disabled={isSubmitting || !destination}>
          {isSubmitting ? "Transfiriendo..." : "Confirmar transferencia"}
        </Button>
      </form>
    </Modal>
  );
}
