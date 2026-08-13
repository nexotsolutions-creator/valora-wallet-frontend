import { useEffect, useState } from "react";
import { useAuth } from "../../shared/auth/useAuth";
import { Card } from "../../shared/components/Card/Card";
import { TransactionDetailModal } from "../../shared/components/TransactionDetailModal/TransactionDetailModal";
import { getApiErrorMessage } from "../../shared/services/apiClient";
import { getTransactions, type TransactionsPagination } from "../../shared/services/transactionService";
import { useRequestGuard } from "../../shared/hooks/useRequestGuard";
import type { Transaction, TransactionType } from "../../shared/types/models";
import { TransactionHistory } from "./TransactionHistory";
import styles from "./HistoryPage.module.css";

const PAGE_SIZE = 10;

const TYPE_FILTERS: { value: TransactionType | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "DEPOSIT", label: "Depósitos" },
  { value: "EXCHANGE", label: "Intercambios" },
  { value: "BUY", label: "Compras" },
  { value: "SELL", label: "Ventas" },
  { value: "TRANSFER_OUT", label: "Transferencias enviadas" },
  { value: "TRANSFER_IN", label: "Transferencias recibidas" },
];

export function HistoryPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<TransactionsPagination | null>(null);
  const [typeFilter, setTypeFilter] = useState<TransactionType | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const historyRequest = useRequestGuard();

  function openDetail(transaction: Transaction) {
    setSelectedTransaction(transaction);
    setIsDetailOpen(true);
  }

  // Cambiar el filtro siempre vuelve a la página 1 — una página vieja puede no
  // existir más para el nuevo filtro (menos resultados que antes).
  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  useEffect(() => {
    if (!token) return;
    const requestId = historyRequest.start();

    async function loadTransactions() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getTransactions(token as string, {
          limit: PAGE_SIZE,
          page,
          type: typeFilter === "ALL" ? undefined : typeFilter,
        });
        if (!historyRequest.isCurrent(requestId)) return;
        setTransactions(result.transactions);
        setPagination(result.pagination);
      } catch (err) {
        if (!historyRequest.isCurrent(requestId)) return;
        setError(getApiErrorMessage(err));
      } finally {
        if (historyRequest.isCurrent(requestId)) setIsLoading(false);
      }
    }

    loadTransactions();
    return () => {
      historyRequest.invalidate();
    };
  }, [token, page, typeFilter, historyRequest]);

  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Actividad</h1>
        <div className={styles.filters}>
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`${styles.filterButton} ${typeFilter === filter.value ? styles.filterButtonActive : ""}`}
              onClick={() => setTypeFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <Card className={styles.card}>
        {isLoading && <p className={styles.stateMessage}>Cargando...</p>}
        {!isLoading && error && <p className={styles.stateMessage}>{error}</p>}
        {!isLoading && !error && (
          <TransactionHistory transactions={transactions} onSelectTransaction={openDetail} />
        )}
      </Card>

      {!isLoading && !error && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Anterior
          </button>
          <span className={styles.pageIndicator}>Página {page} de {totalPages}</span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Siguiente
          </button>
        </div>
      )}

      <TransactionDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        transaction={selectedTransaction}
      />
    </div>
  );
}
