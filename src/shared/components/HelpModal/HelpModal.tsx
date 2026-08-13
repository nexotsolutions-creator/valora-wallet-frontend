import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";
import { HelpContent } from "./helpContent";
import styles from "./HelpModal.module.css";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Ayuda">
      <div className={styles.wrapper}>
        <h2 className={styles.title}>Ayuda</h2>
        <p className={styles.subtitle}>Guía rápida de lo que podés hacer en Valora Wallet.</p>
        <div className={styles.body}>
          <HelpContent />
        </div>
        <Button type="button" onClick={onClose} className={styles.closeButton}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
