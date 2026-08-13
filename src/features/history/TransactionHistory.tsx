import { TransactionRow } from "../../shared/components/TransactionRow/TransactionRow";
import type { Transaction } from "../../shared/types/models";
import styles from "./TransactionHistory.module.css";

interface TransactionHistoryProps {
  transactions: Transaction[];
  onSelectTransaction: (transaction: Transaction) => void;
}

export function TransactionHistory({ transactions, onSelectTransaction }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return <p className={styles.emptyState}>No hay operaciones para mostrar.</p>;
  }

  return (
    <ul className={styles.list} role="list">
      {transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} onSelect={onSelectTransaction} />
      ))}
    </ul>
  );
}
