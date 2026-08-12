import { useEffect, useState, type SubmitEvent } from "react";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Modal } from "../Modal/Modal";
import { getApiErrorMessage } from "../../services/apiClient";
import { buy, sell } from "../../services/transactionService";
import type { Balance, CurrencyCode, Transaction } from "../../types/models";
import styles from "./ConversionModal.module.css";

const CURRENCY_OPTIONS: CurrencyCode[] = ["USD", "EUR", "ARS"];

// Comprar y Vender son, para el backend, la misma operación de conversión que
// Intercambio — solo cambia la etiqueta que le pone a la transacción (ver
// executeConversion en transactionService.ts del repo backend). La diferencia
// de UX es de qué lado arranca cada una: Comprar parte de pesos hacia una
// moneda extranjera, Vender al revés — pero el usuario puede cambiar las
// monedas antes de confirmar, el backend no fuerza ningún par en particular.
const MODE_CONFIG = {
  BUY: {
    title: "Comprar moneda",
    subtitle: "Pagás con una moneda y recibís otra al instante.",
    fromLabel: "Pagás con",
    toLabel: "Comprás",
    defaultFrom: "ARS" as CurrencyCode,
    defaultTo: "USD" as CurrencyCode,
    confirmLabel: "Confirmar compra",
    confirmingLabel: "Comprando...",
    action: buy,
  },
  SELL: {
    title: "Vender moneda",
    subtitle: "Entregás una moneda y recibís otra al instante.",
    fromLabel: "Vendés",
    toLabel: "Recibís",
    defaultFrom: "USD" as CurrencyCode,
    defaultTo: "ARS" as CurrencyCode,
    confirmLabel: "Confirmar venta",
    confirmingLabel: "Vendiendo...",
    action: sell,
  },
} as const;

interface ConversionModalProps {
  mode: "BUY" | "SELL";
  isOpen: boolean;
  onClose: () => void;
  token: string;
  balances: Balance[] | null;
  onSuccess: (transaction: Transaction) => void;
}

export function ConversionModal({ mode, isOpen, onClose, token, balances, onSuccess }: ConversionModalProps) {
  const config = MODE_CONFIG[mode];
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>(config.defaultFrom);
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(config.defaultTo);
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetea el formulario cada vez que se abre — evita que quede el monto o el
  // error de la última vez que se usó (para este mismo modo o el otro).
  useEffect(() => {
    if (!isOpen) return;
    setFromCurrency(config.defaultFrom);
    setToCurrency(config.defaultTo);
    setAmount("");
    setError(null);
  }, [isOpen, config.defaultFrom, config.defaultTo]);

  function balanceFor(code: CurrencyCode): number {
    return balances?.find((bal) => bal.currencyCode === code)?.amount ?? 0;
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (fromCurrency === toCurrency) {
      setError("Elegí dos monedas distintas.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Ingresá un monto válido, mayor a cero.");
      return;
    }

    setIsSubmitting(true);
    try {
      const transaction = await config.action(token, fromCurrency, toCurrency, parsedAmount);
      onSuccess(transaction);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel={config.title}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h2 className={styles.title}>{config.title}</h2>
        <p className={styles.subtitle}>{config.subtitle}</p>

        <div className={styles.currencyRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="conversionFromCurrency">{config.fromLabel}</label>
            <select
              id="conversionFromCurrency"
              className={styles.select}
              value={fromCurrency}
              onChange={(event) => setFromCurrency(event.target.value as CurrencyCode)}
            >
              {CURRENCY_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <span className={styles.balanceHint}>
              Disponible: {balanceFor(fromCurrency).toLocaleString("es-AR", { maximumFractionDigits: 2 })} {fromCurrency}
            </span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="conversionToCurrency">{config.toLabel}</label>
            <select
              id="conversionToCurrency"
              className={styles.select}
              value={toCurrency}
              onChange={(event) => setToCurrency(event.target.value as CurrencyCode)}
            >
              {CURRENCY_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label={`Monto en ${fromCurrency}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />

        {/* No hay endpoint de cotización previa (ver ExchangeForm) — la tasa
            real se calcula recién al confirmar, del lado del backend. */}
        <p className={styles.rateNote}>La tasa se calcula al confirmar, no hay cotización previa disponible todavía.</p>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? config.confirmingLabel : config.confirmLabel}
        </Button>
      </form>
    </Modal>
  );
}
