import { useEffect, useState, type SubmitEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";
import { Button } from "../../shared/components/Button/Button";
import { Card } from "../../shared/components/Card/Card";
import { Input } from "../../shared/components/Input/Input";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import { getBalances } from "../../shared/services/balanceService";
import { exchange } from "../../shared/services/transactionService";
import type { Balance, CurrencyCode } from "../../shared/types/models";
import { CURRENCY_OPTIONS, RATE_NOT_AVAILABLE_NOTE } from "../../shared/constants";
import { balanceFor } from "../../shared/utils/balances";
import { INVALID_AMOUNT_MESSAGE, parsePositiveAmount } from "../../shared/utils/amount";
import type { DashboardOutletContext } from "../../layouts/DashboardLayout/DashboardLayout";
import styles from "./ExchangeForm.module.css";

export function ExchangeForm() {
  const { token } = useAuth();
  // Mismo criterio que Dashboard.tsx: useOutletContext() puede devolver null
  // sin un <Outlet context={...}> ancestro, así que se destructura con
  // fallback en vez de asumir que siempre viene de DashboardLayout.
  const outletContext = useOutletContext<DashboardOutletContext | null>();
  const onTransactionCreated = outletContext?.onTransactionCreated ?? (() => {});
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>("USD");
  const [toCurrency, setToCurrency] = useState<CurrencyCode>("ARS");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getBalances(token).then(setBalances).catch(() => {
      // Si falla acá, el "Disponible: ..." simplemente se queda en 0 — el submit
      // igual valida contra el backend, así que no hace falta un estado de error
      // aparte solo para el hint de balance.
    });
  }, [token]);

  function swapCurrencies() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (fromCurrency === toCurrency) {
      setError("Elegí dos monedas distintas para intercambiar.");
      return;
    }
    const parsedAmount = parsePositiveAmount(amount);
    if (parsedAmount === null) {
      setError(INVALID_AMOUNT_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      const transaction = await exchange(token as string, fromCurrency, toCurrency, parsedAmount);
      const received = transaction.targetAmount?.toLocaleString("es-AR", { maximumFractionDigits: 2 }) ?? "0";
      // exchangeRate = cuántas unidades de toCurrency vale 1 unidad de fromCurrency
      // (así lo calcula el backend, ver executeExchange en transactionService.ts).
      const rate = transaction.exchangeRate?.toLocaleString("es-AR", { maximumFractionDigits: 2 });
      const rateNote = rate ? ` Tasa aplicada: 1 ${fromCurrency} = ${rate} ${toCurrency}.` : "";
      setSuccess(`Intercambiaste ${parsedAmount.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${fromCurrency} por ${received} ${toCurrency}.${rateNote}`);
      setAmount("");
      const updatedBalances = await getBalances(token as string);
      setBalances(updatedBalances);
      onTransactionCreated();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Intercambio</h1>
        <p className={styles.subtitle}>Convertí saldo entre tus monedas al instante.</p>
      </div>

      <Card className={styles.card}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.currencyRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="fromCurrency">Desde</label>
              <select
                id="fromCurrency"
                className={styles.select}
                value={fromCurrency}
                onChange={(event) => setFromCurrency(event.target.value as CurrencyCode)}
              >
                {CURRENCY_OPTIONS.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <span className={styles.balanceHint}>
                Disponible: {balanceFor(balances, fromCurrency).toLocaleString("es-AR", { maximumFractionDigits: 2 })} {fromCurrency}
              </span>
            </div>

            <button type="button" className={styles.swapButton} onClick={swapCurrencies} aria-label="Invertir monedas">
              <span className="msym" aria-hidden="true">swap_horiz</span>
            </button>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="toCurrency">Hacia</label>
              <select
                id="toCurrency"
                className={styles.select}
                value={toCurrency}
                onChange={(event) => setToCurrency(event.target.value as CurrencyCode)}
              >
                {CURRENCY_OPTIONS.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              {/* Mismo hint que "Desde" — no es solo relleno visual para igualar
                  la altura con la columna de al lado (que sí tiene "Disponible"
                  debajo), también es información real y útil. */}
              <span className={styles.balanceHint}>
                Disponible: {balanceFor(balances, toCurrency).toLocaleString("es-AR", { maximumFractionDigits: 2 })} {toCurrency}
              </span>
            </div>
          </div>

          <Input
            label="Monto a intercambiar"
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
          {success && <p className={styles.success} role="status">{success}</p>}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Confirmando..." : "Confirmar intercambio"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
