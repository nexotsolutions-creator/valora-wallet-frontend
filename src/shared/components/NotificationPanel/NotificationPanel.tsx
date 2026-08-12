import styles from "./NotificationPanel.module.css";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  unread: boolean;
}

interface NotificationPanelProps {
  notifications: AppNotification[];
  onClose: () => void;
  onDismiss: (id: string) => void;
  hidden: boolean;
}

export function NotificationPanel({ notifications, onClose, onDismiss, hidden }: NotificationPanelProps) {
  return (
    <div id="notification-panel" className={styles.panel} hidden={hidden}>
      <div className={styles.panelHeader}>
        <span>Notificaciones</span>
        <button
          type="button"
          className={styles.panelCloseButton}
          onClick={onClose}
          aria-label="Cerrar notificaciones"
        >
          <span className="msym" aria-hidden="true">close</span>
        </button>
      </div>
      <div className={styles.notifList}>
        {notifications.length === 0 && (
          <p className={styles.emptyState}>No tenés notificaciones todavía.</p>
        )}
        {notifications.map((note) => (
          <div
            key={note.id}
            className={`${styles.notifRow} ${note.unread ? styles.notifRowUnread : ""}`}
          >
            <span className={`${styles.notifDot} ${note.unread ? styles.notifDotUnread : ""}`} />
            <div className={styles.notifTextGroup}>
              <span className={styles.notifTitle}>{note.title}</span>
              <span className={styles.notifBody}>{note.body}</span>
            </div>
            {/* Solo borra la notificación del panel, no la transacción real —
                esa sigue viéndose en Actividad, que se lee de la misma fuente
                de datos pero sin este filtro local. */}
            <button
              type="button"
              className={styles.notifDismissButton}
              onClick={() => onDismiss(note.id)}
              aria-label={`Quitar notificación: ${note.title}`}
            >
              <span className="msym" aria-hidden="true">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
