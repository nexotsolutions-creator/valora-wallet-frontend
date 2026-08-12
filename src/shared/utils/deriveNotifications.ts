import type { Transaction } from "../types/models";
import type { AppNotification } from "../components/NotificationPanel/NotificationPanel";
import { formatTransaction } from "./formatTransaction";

// No hay endpoint de notificaciones en el backend (ni el concepto existe ahí)
// — en vez de dejar el mock viejo o inventar datos, derivamos las notificaciones
// de las transacciones reales del usuario. Es información real de la cuenta,
// solo presentada como notificación.
const UNREAD_WINDOW_MS = 24 * 60 * 60 * 1000;

export function deriveNotifications(transactions: Transaction[]): AppNotification[] {
  const now = Date.now();
  return transactions.map((tx) => {
    const display = formatTransaction(tx);
    return {
      id: tx.id,
      title: display.title,
      body: `${display.amount} · ${display.date}`,
      unread: now - new Date(tx.createdAt).getTime() < UNREAD_WINDOW_MS,
    };
  });
}
