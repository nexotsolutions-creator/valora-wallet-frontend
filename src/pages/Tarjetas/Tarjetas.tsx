import { CARD_NUMBER_COPIED_MESSAGE, CardDisplay } from "../../shared/components/CardDisplay/CardDisplay";
import { Toast } from "../../shared/components/Toast/Toast";
import { useToast } from "../../shared/components/Toast/useToast";
import styles from "./Tarjetas.module.css";

export function Tarjetas() {
  const { message: toast, showToast } = useToast();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Tarjetas</h1>
      <p className={styles.subtitle}>Tu tarjeta virtual Valora, lista para usar.</p>

      <div className={styles.cardRow}>
        <div className={styles.cardSlot}>
          <CardDisplay onCopy={() => showToast(CARD_NUMBER_COPIED_MESSAGE)} />
        </div>

        {/* Sin backend para múltiples tarjetas todavía (una sola por wallet) —
            mismo criterio que Transferir en el Dashboard: botón real, no un
            link muerto, que avisa qué falta en vez de simular una acción. */}
        <button
          type="button"
          className={styles.addCardButton}
          onClick={() => showToast("Agregar otra tarjeta va a estar disponible pronto.")}
          aria-label="Agregar tarjeta"
        >
          <span className="msym" style={{ fontSize: 32 }} aria-hidden="true">add</span>
        </button>
      </div>

      <Toast message={toast} />
    </div>
  );
}
