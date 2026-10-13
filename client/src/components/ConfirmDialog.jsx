import { AlertTriangle, Loader2 } from "lucide-react";

// Small reusable confirmation modal. It never performs the action itself —
// it only collects a decision, so callers keep control over when the server
// request happens and the UI updates only after the server confirms.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={busy ? undefined : onCancel}
    >
      <div
        className="modal modal--confirm"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>{title}</h2>
        </header>

        <div className="modal__body">
          {error && (
            <div className="form-alert">
              <AlertTriangle size={15} /> {error}
            </div>
          )}
          <p className="confirm-message">{message}</p>
        </div>

        <footer className="modal__footer">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Loader2 size={15} className="spin" />}
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
