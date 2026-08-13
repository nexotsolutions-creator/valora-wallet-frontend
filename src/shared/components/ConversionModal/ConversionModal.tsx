import { useEffect, useState, type SubmitEvent } from "react";
import { Button } from "../Button/Button";
import { Input } from "../Input/Input";
import { Modal } from "../Modal/Modal";
import { getApiErrorMessage } from "../../services/apiClient";
import { buy, sell, type AmountSide } from "../../services/transactionService";
import type { Balance, CurrencyCode, Transaction } from "../../types/models";
import { CURRENCY_OPTIONS, RATE_NOT_AVAILABLE_NOTE } from "../../constants";
import { balanceFor } from "../../utils/balances";
import { INVALID_AMOUNT_MESSAGE, parsePositiveAmount } from "../../utils/amount";
import styles from "./ConversionModal.module.css";

// Comprar y Vender son, para el backend, la misma operación de conversión que
// Intercambio — solo cambia la etiqueta que le pone a la transacción (ver
// executeConversion en transactionService.ts del repo backend). La diferencia
// de UX es de qué lado se tipea el monto: en Comprar tiene más sentido pedir
// "cuánto querés comprar" (moneda destino) que "cuánto vas a pagar" — al
// revés que Vender, donde lo natural es partir de cuánto entregás (moneda
// origen). amountSide le dice al backend cuál de los dos lados es el que
// mandamos — "target" en Comprar, "source" (default) en Vender.
const MODE_CONFIG = {
  BUY: {
    title: "Comprar moneda",
    subtitle: "Elegís cuánto querés comprar y con qué moneda pagás.",
    primaryLabel: "Comprás",
    secondaryLabel: "Pagás con",
    defaultFrom: "ARS" as CurrencyCode,
    defaultTo: "USD" as CurrencyCode,
    amountSide: "target" as AmountSide,
    confirmLabel: "Confirmar compra",
    confirmingLabel: "Comprando...",
    action: buy,
  },
  SELL: {
    title: "Vender moneda",
    subtitle: "Entregás una moneda y recibís otra al instante.",
    primaryLabel: "Vendés",
    secondaryLabel: "Recibís",
    defaultFrom: "USD" as CurrencyCode,
    defaultTo: "ARS" as CurrencyCode,
    amountSide: "source" as AmountSide,
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
  const isBuy = mode === "BUY";
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

  // El campo con el monto siempre es el primario: en Comprar es toCurrency
  // (cuánto querés recibir), en Vender es fromCurrency (cuánto vas a entregar)
  // — el otro selector queda como secundario, sin input de monto al lado.
  const primaryCurrency = isBuy ? toCurrency : fromCurrency;
  const setPrimaryCurrency = isBuy ? setToCurrency : setFromCurrency;
  const secondaryCurrency = isBuy ? fromCurrency : toCurrency;
  const setSecondaryCurrency = isBuy ? setFromCurrency : setToCurrency;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (fromCurrency === toCurrency) {
      setError("Elegí dos monedas distintas.");
      return;
    }
    const parsedAmount = parsePositiveAmount(amount);
    if (parsedAmount === null) {
      setError(INVALID_AMOUNT_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      const transaction = await config.action(token, fromCurrency, toCurrency, parsedAmount, config.amountSide);
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
            <label className={styles.label} htmlFor="conversionPrimaryCurrency">{config.primaryLabel}</label>
            <select
              id="conversionPrimaryCurrency"
              className={styles.select}
              value={primaryCurrency}
              onChange={(event) => setPrimaryCurrency(event.target.value as CurrencyCode)}
            >
              {CURRENCY_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            {/* Vender parte de fromCurrency — el saldo que limita la operación
                va bajo el selector primario acá, no en el secundario. */}
            {!isBuy && (
              <span className={styles.balanceHint}>
                Disponible: {balanceFor(balances, fromCurrency).toLocaleString("es-AR", { maximumFractionDigits: 2 })} {fromCurrency}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="conversionSecondaryCurrency">{config.secondaryLabel}</label>
            <select
              id="conversionSecondaryCurrency"
              className={styles.select}
              value={secondaryCurrency}
              onChange={(event) => setSecondaryCurrency(event.target.value as CurrencyCode)}
            >
              {CURRENCY_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            {/* Comprar parte de toCurrency como primario — el saldo que limita
                (fromCurrency) va acá, bajo el selector secundario. */}
            {isBuy && (
              <span className={styles.balanceHint}>
                Disponible: {balanceFor(balances, fromCurrency).toLocaleString("es-AR", { maximumFractionDigits: 2 })} {fromCurrency}
              </span>
            )}
          </div>
        </div>

        <Input
          label={`Monto en ${primaryCurrency}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />

        <p className={styles.rateNote}>{RATE_NOT_AVAILABLE_NOTE}</p>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? config.confirmingLabel : config.confirmLabel}
        </Button>
      </form>
    </Modal>
  );
}
