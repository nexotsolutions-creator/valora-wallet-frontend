import { useCallback, useEffect, useRef, useState, type SubmitEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";
import { Button } from "../../shared/components/Button/Button";
import { CARD_NUMBER_COPIED_MESSAGE, CardDisplay } from "../../shared/components/CardDisplay/CardDisplay";
import { ConversionModal } from "../../shared/components/ConversionModal/ConversionModal";
import { Input } from "../../shared/components/Input/Input";
import { Modal } from "../../shared/components/Modal/Modal";
import { Toast } from "../../shared/components/Toast/Toast";
import { useToast } from "../../shared/components/Toast/useToast";
import { TransactionDetailModal } from "../../shared/components/TransactionDetailModal/TransactionDetailModal";
import { TransactionRow } from "../../shared/components/TransactionRow/TransactionRow";
import { TransferModal } from "../../shared/components/TransferModal/TransferModal";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import { getBalances } from "../../shared/services/balanceService";
import { deposit, getQuote, getTransactions, type TransferDestination } from "../../shared/services/transactionService";
import type { Balance, CurrencyCode, Transaction } from "../../shared/types/models";
import { CURRENCY_OPTIONS } from "../../shared/constants";
import { balanceFor } from "../../shared/utils/balances";
import { INVALID_AMOUNT_MESSAGE, parsePositiveAmount } from "../../shared/utils/amount";
import { useRequestGuard } from "../../shared/hooks/useRequestGuard";
import type { DashboardOutletContext } from "../../layouts/DashboardLayout/DashboardLayout";
import styles from "./Dashboard.module.css";

const CURRENCY_META: Record<CurrencyCode, { label: string; flagChar: string }> = {
  USD: { label: "Dólares", flagChar: "US" },
  EUR: { label: "Euros", flagChar: "EU" },
  ARS: { label: "Pesos AR", flagChar: "AR" },
};

const LATEST_TRANSACTIONS_LIMIT = 5;

export function Dashboard() {
  const { token } = useAuth();
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalHidden, setTotalHidden] = useState(true);
  const [totalCurrency, setTotalCurrency] = useState<CurrencyCode>("USD");
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [hidden, setHidden] = useState<Record<CurrencyCode, boolean>>({ USD: true, EUR: true, ARS: true });
  const { message: toast, showToast } = useToast();
  const currencyMenuAnchorRef = useRef<HTMLDivElement>(null);
  // useOutletContext() lee de un Context creado con createContext(null) — sin
  // un <Outlet context={...}> ancestro (ej. Dashboard montado suelto en un
  // test, o un reuso futuro de la página) devuelve null, no undefined
  // (verificado contra el código real de react-router, no contra el tipo
  // declarado — el .d.ts dice Context a secas, sin el null). Destructurar
  // directo tiraba "Cannot destructure property 'onOpenChatbot' of null" en
  // vez de degradar con un fallback claro.
  const outletContext = useOutletContext<DashboardOutletContext | null>();
  const onOpenChatbot = outletContext?.onOpenChatbot ?? (() => {});
  const onTransactionCreated = outletContext?.onTransactionCreated ?? (() => {});

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositCurrency, setDepositCurrency] = useState<CurrencyCode>("USD");
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Un solo estado para "qué modal de conversión está abierto" en vez de dos
  // booleans (isBuyOpen/isSellOpen) — mismo criterio que openPanel en
  // DashboardLayout, evita que los dos puedan estar abiertos a la vez.
  const [conversionMode, setConversionMode] = useState<"BUY" | "SELL">("BUY");
  const [isConversionOpen, setIsConversionOpen] = useState(false);

  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  function openDetail(transaction: Transaction) {
    setSelectedTransaction(transaction);
    setIsDetailOpen(true);
  }

  // Ver useRequestGuard.ts para el porqué de un contador de generación en vez
  // de un boolean reseteado a mano.
  const dashboardRequest = useRequestGuard();

  const loadDashboardData = useCallback(async () => {
    const requestId = dashboardRequest.start();
    setIsLoading(true);
    setError(null);
    try {
      const [balancesData, transactionsResult] = await Promise.all([
        getBalances(token as string),
        getTransactions(token as string, { limit: LATEST_TRANSACTIONS_LIMIT }),
      ]);
      if (!dashboardRequest.isCurrent(requestId)) return;
      setBalances(balancesData);
      setTransactions(transactionsResult.transactions);
    } catch (err) {
      if (!dashboardRequest.isCurrent(requestId)) return;
      setError(getApiErrorMessage(err));
    } finally {
      if (dashboardRequest.isCurrent(requestId)) setIsLoading(false);
    }
  }, [token, dashboardRequest]);

  useEffect(() => {
    if (!token) return;
    loadDashboardData();
    // Defensivo, no por un bug encontrado hoy: invalida la corrida al
    // desmontar/cambiar deps para que un request en vuelo justo antes de
    // navegar fuera de Dashboard no aplique su resultado sobre una instancia
    // ya desmontada. En React 18+ un setState post-unmount ya es un no-op
    // silencioso — mismo criterio que isMountedRef en useChatbot.ts, por
    // consistencia dentro del mismo PR.
    return () => {
      dashboardRequest.invalidate();
    };
  }, [token, loadDashboardData, dashboardRequest]);

  function openDepositModal() {
    setDepositCurrency("USD");
    setDepositAmount("");
    setDepositError(null);
    setIsDepositOpen(true);
  }

  function openConversionModal(mode: "BUY" | "SELL") {
    setConversionMode(mode);
    setIsConversionOpen(true);
  }

  function handleConversionSuccess(transaction: Transaction) {
    setIsConversionOpen(false);
    const verb = conversionMode === "BUY" ? "Compraste" : "Vendiste";
    const receivedAmount = transaction.targetAmount?.toLocaleString("es-AR", { maximumFractionDigits: 2 }) ?? "0";
    showToast(`${verb} ${receivedAmount} ${transaction.targetCurrency ?? ""}.`);
    loadDashboardData();
    onTransactionCreated();
  }

  function handleTransferSuccess(transaction: Transaction, destination: TransferDestination) {
    setIsTransferOpen(false);
    const sentAmount = transaction.sourceAmount?.toLocaleString("es-AR", { maximumFractionDigits: 2 }) ?? "0";
    showToast(`Transferiste ${sentAmount} ${transaction.sourceCurrency ?? ""} a ${destination.firstName} ${destination.lastName}.`);
    loadDashboardData();
    onTransactionCreated();
  }

  async function handleDepositSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setDepositError(null);

    const parsedAmount = parsePositiveAmount(depositAmount);
    if (parsedAmount === null) {
      setDepositError(INVALID_AMOUNT_MESSAGE);
      return;
    }

    setIsDepositing(true);
    try {
      await deposit(token as string, depositCurrency, parsedAmount);
      setIsDepositOpen(false);
      showToast(`Depositaste ${parsedAmount.toLocaleString("es-AR", { maximumFractionDigits: 2 })} ${depositCurrency}.`);
      await loadDashboardData();
      onTransactionCreated();
    } catch (err) {
      setDepositError(getApiErrorMessage(err));
    } finally {
      setIsDepositing(false);
    }
  }

  // Cerrar el menú de moneda con click/tap afuera o Escape — mismo patrón que los
  // popovers de DashboardLayout (pointerdown para cubrir mouse, touch y pen).
  useEffect(() => {
    if (!currencyMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (currencyMenuAnchorRef.current && !currencyMenuAnchorRef.current.contains(event.target as Node)) {
        setCurrencyMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCurrencyMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [currencyMenuOpen]);

  function toggleBalanceHidden(code: CurrencyCode) {
    setHidden((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  // Se guarda junto con la moneda a la que corresponde — así, al cambiar el
  // selector, el total viejo (todavía de la moneda anterior) no se muestra
  // ni un frame relabeleado bajo el código de la moneda nueva: el render de
  // abajo compara totalConverted.currency contra totalCurrency y solo lo usa
  // si coinciden, mostrando "Calculando…" mientras no coinciden.
  const [totalConverted, setTotalConverted] = useState<{ currency: CurrencyCode; amount: number } | null>(null);
  // Distinto de "todavía no llegó la cotización": si falla de verdad, hay que
  // poder distinguirlo de "está cargando" (que también se ve como
  // totalConverted sin coincidir con totalCurrency) para no quedar en
  // "Calculando…" para siempre sin ningún mensaje ni forma de reintentar.
  const [totalError, setTotalError] = useState(false);
  const [totalRetryTick, setTotalRetryTick] = useState(0);
  // Mismo criterio que dashboardRequest de arriba — evita que una cotización
  // vieja (de la moneda anterior en el selector) pise el total con datos que
  // ya no corresponden si las respuestas llegan desordenadas.
  const totalRequest = useRequestGuard();

  // balances en un ref (actualizado en cada render, antes del efecto de abajo
  // porque los efectos corren en orden de declaración dentro del mismo
  // commit): el efecto de cotización depende de balancesKey, no de la
  // referencia del array — loadDashboardData() trae un array nuevo en cada
  // recarga aunque el monto de una sola moneda haya cambiado, y sin esto
  // dispararía cotizaciones de nuevo para todas las monedas cada vez.
  const balancesRef = useRef(balances);
  useEffect(() => {
    balancesRef.current = balances;
  }, [balances]);
  // null distinto de "" a propósito: si fueran el mismo valor, la transición
  // real de "todavía no cargaron los balances" (null) a "cargaron y la
  // cuenta está en cero" ([]) no cambiaría la dependencia del efecto de abajo
  // y nunca llegaría a correr para esa cuenta.
  const balancesKey = balances === null
    ? null
    : balances.map((bal) => `${bal.currencyCode}:${bal.amount}`).sort().join("|");

  useEffect(() => {
    if (!token || !balancesRef.current) return;
    const requestId = totalRequest.start();
    const currentBalances = balancesRef.current;
    const currency = totalCurrency;
    const controller = new AbortController();
    setTotalError(false);

    // Antes esto era una tabla de tasas aproximada del lado del cliente — ahora
    // que existe /transactions/quote con la tasa real, se pide una cotización
    // por cada moneda con saldo (misma moneda que la elegida en el selector no
    // pide nada, es 1 a 1: el backend rechaza fromCurrency === toCurrency).
    const contributions = currentBalances.map(async (bal) => {
      if (bal.amount <= 0 || bal.currencyCode === currency) return bal.amount;
      // Cotizamos 1 unidad para evitar el límite de 1,000,000 en el backend (AMOUNT_TOO_LARGE).
      // Luego multiplicamos la tasa real (que ya tiene la comisión) por nuestro saldo.
      const quote = await getQuote(token, bal.currencyCode, currency, 1, "source", controller.signal);
      return bal.amount * quote.exchangeRate;
    });

    Promise.all(contributions)
      .then((amounts) => {
        if (!totalRequest.isCurrent(requestId)) return;
        setTotalConverted({ currency, amount: amounts.reduce((sum, value) => sum + value, 0) });
      })
      .catch(() => {
        if (!totalRequest.isCurrent(requestId) || controller.signal.aborted) return;
        // Tasa real no disponible para alguna moneda — mejor mostrar que no
        // está disponible que un total parcial o con una tasa inventada.
        setTotalError(true);
      });

    return () => {
      // Corta las cotizaciones en vuelo si el selector cambia de nuevo (o el
      // componente se desmonta) antes de que resuelvan — ya son descartadas
      // por el chequeo de requestId de arriba, pero sin esto igual corrían
      // hasta el final del lado del servidor sin que nadie use el resultado.
      controller.abort();
    };
  }, [token, balancesKey, totalCurrency, totalRetryTick, totalRequest]);
  const totalDisplayValue = totalHidden
    ? "••••••"
    : totalError
      ? "No disponible"
      : totalConverted && totalConverted.currency === totalCurrency
        ? `${totalCurrency} ${totalConverted.amount.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`
        : "Calculando…";

  return (
    <div className={styles.page}>
      <h1 className={styles.srOnly}>Inicio</h1>
      <section className={styles.balanceSection}>
        <div className={styles.balanceCard}>
          <div className={styles.balanceCardTop}>
            <div>
              <div className={styles.label}>Balance total</div>
              <div className={styles.totalRow}>
                <span className={styles.totalValue}>{totalDisplayValue}</span>
                {totalError && !totalHidden && (
                  <button
                    type="button"
                    className={styles.txLink}
                    onClick={() => setTotalRetryTick((tick) => tick + 1)}
                  >
                    Reintentar
                  </button>
                )}
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setTotalHidden((v) => !v)}
                  aria-label={totalHidden ? "Mostrar balance" : "Ocultar balance"}
                >
                  <span
                    className={`msym ${styles.eyeIcon} ${totalHidden ? "" : styles.eyeIconActive}`}
                    aria-hidden="true"
                  >
                    {totalHidden ? "visibility_off" : "visibility"}
                  </span>
                </button>
                <div className={styles.currencyMenuAnchor} ref={currencyMenuAnchorRef}>
                  <button
                    type="button"
                    className={styles.currencySelect}
                    onClick={() => setCurrencyMenuOpen((v) => !v)}
                    aria-expanded={currencyMenuOpen}
                    aria-controls="currency-menu"
                  >
                    {totalCurrency}
                    <span className="msym" style={{ fontSize: 16 }} aria-hidden="true">expand_more</span>
                  </button>
                  <div id="currency-menu" className={styles.currencyMenu} hidden={!currencyMenuOpen}>
                    {CURRENCY_OPTIONS.map((code) => (
                      <button
                        key={code}
                        type="button"
                        className={`${styles.currencyMenuItem} ${code === totalCurrency ? styles.currencyMenuItemActive : ""}`}
                        onClick={() => {
                          setTotalCurrency(code);
                          setCurrencyMenuOpen(false);
                        }}
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.currencyGrid}>
            {CURRENCY_OPTIONS.map((code) => {
              const isHidden = hidden[code];
              const meta = CURRENCY_META[code];
              return (
                <div key={code} className={styles.currencyCard}>
                  <div className={styles.currencyCardTop}>
                    <div className={styles.currencyCardLabel}>
                      <div className={styles.flagBadge}>{meta.flagChar}</div>
                      <span className={styles.currencyLabelText}>{meta.label}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.eyeButton}
                      onClick={() => toggleBalanceHidden(code)}
                      aria-label={isHidden ? "Mostrar saldo" : "Ocultar saldo"}
                    >
                      <span
                        className={`msym ${styles.eyeIconSmall} ${isHidden ? "" : styles.eyeIconActive}`}
                        aria-hidden="true"
                      >
                        {isHidden ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  <span className={styles.currencyCardValue}>
                    {isHidden ? "••••••" : `${code} ${balanceFor(balances, code).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.buySellRow}>
            <button type="button" className={styles.buyButton} onClick={() => openConversionModal("BUY")}>
              <span className="msym" style={{ fontSize: 18 }} aria-hidden="true">add</span>
              Comprar
            </button>
            <button type="button" className={styles.sellButton} onClick={() => openConversionModal("SELL")}>
              <span className="msym" style={{ fontSize: 18 }} aria-hidden="true">remove</span>
              Vender
            </button>
            <button type="button" className={styles.sellButton} onClick={openDepositModal}>
              <span className="msym" style={{ fontSize: 18 }} aria-hidden="true">arrow_downward</span>
              Depositar
            </button>
            <button type="button" className={styles.sellButton} onClick={() => setIsTransferOpen(true)}>
              <span className="msym" style={{ fontSize: 18 }} aria-hidden="true">send</span>
              Transferir
            </button>
          </div>
        </div>

        <div className={styles.aiPromo}>
          <div className={styles.aiPromoText}>
            <div className={styles.aiPromoHeading}>
              <span className="msym" style={{ fontSize: 22, color: "var(--accent)" }} aria-hidden="true">auto_awesome</span>
              <span className={styles.aiPromoTitle}>Asistente Valora AI</span>
            </div>
            <p className={styles.aiPromoBody}>
              Optimizá tus finanzas con IA. Analizamos tus patrones de gasto para ofrecerte mejores rendimientos.
            </p>
          </div>
          <button type="button" className={styles.aiButton} onClick={onOpenChatbot}>Consultar ahora</button>
        </div>
      </section>

      <aside className={styles.aside}>
        <div className={styles.txCard}>
          <div className={styles.txCardHeader}>
            <span className={styles.label}>Últimas transacciones</span>
            <Link to="/actividad" className={styles.txLink}>Ver todas</Link>
          </div>
          {isLoading && <p className={styles.txEmptyState}>Cargando...</p>}
          {!isLoading && error && <p className={styles.txEmptyState}>{error}</p>}
          {!isLoading && !error && transactions?.length === 0 && (
            <p className={styles.txEmptyState}>Todavía no hiciste ninguna operación.</p>
          )}
          {!isLoading && !error && transactions && transactions.length > 0 && (
            <ul className={styles.txList} role="list">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} onSelect={openDetail} />
              ))}
            </ul>
          )}
        </div>

        {/* Vista de tarjeta física: no estaba en el checklist original, se sumó al traer el mock del diseño Geist */}
        <CardDisplay onCopy={() => showToast(CARD_NUMBER_COPIED_MESSAGE)} />
      </aside>

      <Toast message={toast} />

      <ConversionModal
        mode={conversionMode}
        isOpen={isConversionOpen}
        onClose={() => setIsConversionOpen(false)}
        token={token as string}
        balances={balances}
        onSuccess={handleConversionSuccess}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        token={token as string}
        balances={balances}
        onSuccess={handleTransferSuccess}
      />

      <Modal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} ariaLabel="Depositar fondos">
        <form onSubmit={handleDepositSubmit} className={styles.depositForm}>
          <h2 className={styles.depositTitle}>Depositar fondos</h2>
          <p className={styles.depositSubtitle}>Simulá recibir dinero en tu cuenta — no es dinero real.</p>

          <div className={styles.depositField}>
            <label className={styles.label} htmlFor="depositCurrency">Moneda</label>
            <select
              id="depositCurrency"
              className={styles.depositSelect}
              value={depositCurrency}
              onChange={(event) => setDepositCurrency(event.target.value as CurrencyCode)}
            >
              {CURRENCY_OPTIONS.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <Input
            label="Monto"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={depositAmount}
            onChange={(event) => setDepositAmount(event.target.value)}
            required
          />

          {depositError && (
            <p className={styles.depositError} role="alert">{depositError}</p>
          )}

          <Button type="submit" disabled={isDepositing}>
            {isDepositing ? "Depositando..." : "Confirmar depósito"}
          </Button>
        </form>
      </Modal>

      <TransactionDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
}
