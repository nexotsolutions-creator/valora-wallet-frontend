import { useRef, useState } from "react";
import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";
import { formatTransaction } from "../../utils/formatTransaction";
import type { Transaction, TransactionType } from "../../types/models";
import logo from "../../assets/valora-logo.png";
import styles from "./TransactionDetailModal.module.css";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  // No se pone en null al cerrar (ver Dashboard.tsx/HistoryPage.tsx) — así el
  // contenido sigue visible mientras el Modal anima la salida, en vez de
  // vaciarse de golpe antes de que termine la animación.
  transaction: Transaction | null;
}

const TYPE_LABEL: Record<TransactionType, string> = {
  DEPOSIT: "Depósito",
  EXCHANGE: "Conversión",
  BUY: "Compra",
  SELL: "Venta",
  TRANSFER_OUT: "Transferencia",
  TRANSFER_IN: "Transferencia",
};

// Fecha corta + hora en una sola línea (ej. "12/08/2026 · 21:04") — un solo
// formato de fecha para los 6 tipos de transacción, no uno distinto por tipo.
function formatShortDateTime(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timePart = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${datePart} · ${timePart}`;
}

interface DetailRowProps {
  icon: string;
  label: string;
  value: string;
  mono?: boolean;
}

function DetailRow({ icon, label, value, mono }: DetailRowProps) {
  return (
    <div className={styles.detailRow}>
      <span className={`msym ${styles.detailRowIcon}`} aria-hidden="true">{icon}</span>
      <span className={styles.detailRowLabel}>{label}</span>
      <span className={`${styles.detailRowValue} ${mono ? styles.detailRowValueMono : ""}`}>{value}</span>
    </div>
  );
}

export function TransactionDetailModal({ isOpen, onClose, transaction }: TransactionDetailModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // El Modal en sí sigue montado durante la animación de cierre (ver
  // Modal.tsx) — esto solo cubre el primer render, antes de seleccionar
  // ninguna transacción.
  if (!transaction) return null;

  const display = formatTransaction(transaction);
  const isTransfer = transaction.transactionType === "TRANSFER_OUT" || transaction.transactionType === "TRANSFER_IN";
  const typeLabel = TYPE_LABEL[transaction.transactionType] ?? "Movimiento";
  const counterparty = isTransfer
    ? [transaction.counterpartyName, transaction.counterpartyLastName].filter(Boolean).join(" ")
    : "";
  const counterpartyLabel = transaction.transactionType === "TRANSFER_OUT" ? "Destinatario" : "Remitente";

  // html-to-image se importa dinámicamente — solo hace falta cuando alguien
  // efectivamente descarga un comprobante, no en el bundle inicial de la app.
  // No es html2canvas: esa no soporta color-mix() (lo usamos en .statusPill y
  // varios otros lugares del proyecto) y tira un parse error duro apenas lo
  // encuentra — confirmado probándolo en vivo antes de cambiar de librería.
  async function handleDownload() {
    if (!receiptRef.current || !transaction) return;
    setIsDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(receiptRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `valora-comprobante-${transaction.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Sin toast propio acá (ver CardDisplay/CopyIconButton) — si falla la
      // descarga no rompe nada más, el modal sigue usable.
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Detalle de transacción">
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Detalle de transacción</h2>
            <span className={styles.eyebrow}>{typeLabel.toUpperCase()}</span>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <span className="msym" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Todo lo que va en el PNG descargado vive acá adentro — el header de
            arriba (con el botón de cerrar) queda afuera a propósito. */}
        <div ref={receiptRef} className={styles.receipt}>
          <div className={styles.brandHeader}>
            <div className={styles.brandBrand}>
              <img src={logo} alt="Valora Wallet" className={styles.brandLogo} />
              <span className={styles.brandWordmark}>
                Valora<span className={styles.wordmarkMuted}> Wallet</span>
              </span>
            </div>
            <span className={styles.receiptSubtitle}>
              Comprobante de {typeLabel.toLowerCase()}
            </span>
          </div>

          <div className={styles.amountRow}>
            <span className={styles.amount}>{display.amount} {display.currency}</span>
            {/* No hay transacciones "pendientes" ni "fallidas" en el modelo
                real — si el backend respondió 200, ya está commiteada. Fijo,
                no depende de ningún dato (mismo criterio que el estado de
                cuenta en Usuario.tsx). */}
            <span className={styles.statusPill}>Completada</span>
          </div>

          <div className={styles.detailList}>
            {isTransfer && counterparty && (
              <DetailRow icon="person" label={counterpartyLabel} value={counterparty} />
            )}
            {isTransfer && transaction.counterpartyAlias && (
              <DetailRow icon="alternate_email" label="Alias" value={transaction.counterpartyAlias} />
            )}
            <DetailRow icon="calendar_today" label="Fecha" value={formatShortDateTime(transaction.createdAt)} />
            {transaction.concepto ? (
              <DetailRow icon="chat_bubble" label="Concepto" value={transaction.concepto} />
            ) : (
              !isTransfer && (
                <DetailRow icon="description" label="Descripción" value={display.title} />
              )
            )}
            <DetailRow icon="payments" label="Moneda" value={display.currency} />
            <DetailRow icon="confirmation_number" label="ID de operación" value={transaction.id} mono />
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className={styles.downloadButton}
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <span className="msym" style={{ fontSize: 18 }} aria-hidden="true">download</span>
          {isDownloading ? "Generando..." : "Descargar comprobante"}
        </Button>
      </div>
    </Modal>
  );
}
