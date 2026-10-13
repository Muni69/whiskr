import { useState } from "react";
import {
  X,
  Pencil,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  PackageX,
  Trash2,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatPrice, formatDateTime, initials, completenessTone } from "../utils/format";
import { missingFieldGuidance } from "../utils/completeness";

function CollapsibleSection({ title, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`detail-section ${open ? "" : "detail-section--closed"}`}>
      <button
        type="button"
        className="detail-section__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="detail-section__title">
          {title}
          {badge}
        </span>
        <ChevronDown size={16} className="detail-section__chevron" />
      </button>
      {open && <div className="detail-section__body">{children}</div>}
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <span className="field__value">
        {value === null || value === undefined || value === "" ? (
          <span className="muted">Not set</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

const ATTRIBUTE_LABELS = {
  brand: "Brand",
  color: "Color",
  size: "Size",
  material: "Material",
};

export default function ProductDetails({
  product,
  onClose,
  onEdit,
  onSync,
  syncing,
  syncMessage,
  onFixMissing,
  onDelete,
  showSync = false,
}) {
  if (!product) {
    return null;
  }

  const attributes = product.attributes || {};
  const extraAttributes = Object.entries(attributes).filter(
    ([key]) => !(key in ATTRIBUTE_LABELS)
  );
  const missing = product.missingFields || [];
  const guidance = missingFieldGuidance(missing);
  const tone = completenessTone(product.completeness);

  return (
    <aside className="details" aria-label="Product details">
      <header className="details__header">
        <div className="details__header-main">
          <div className="details__avatar" aria-hidden="true">
            {initials(product.name)}
          </div>
          <div className="details__heading">
            <h2>{product.name}</h2>
            <div className="details__meta">
              <code>{product.sku}</code>
              <StatusBadge status={product.status} />
            </div>
          </div>
        </div>
        <div className="details__header-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onEdit(product)}>
            <Pencil size={14} />
            Edit
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => onDelete(product)}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      <div className="details__scroll">
        <CollapsibleSection title="General information">
          <Field label="Product name" value={product.name} />
          <Field label="SKU" value={product.sku} />
          <Field label="Category" value={product.category} />
          <Field label="Price" value={formatPrice(product.price)} />
          <Field
            label="Description"
            value={
              product.description ? (
                <span className="field__paragraph">{product.description}</span>
              ) : null
            }
          />
          <Field
            label="Product image"
            value={
              product.image ? (
                <img className="details__image" src={product.image} alt={product.name} />
              ) : null
            }
          />
        </CollapsibleSection>

        <CollapsibleSection title="Product attributes">
          {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => (
            <Field key={key} label={label} value={attributes[key]} />
          ))}
          {extraAttributes.map(([key, value]) => (
            <Field key={key} label={key} value={value} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection
          title="Data quality"
          badge={
            <span className={`score-pill score-pill--${tone}`}>
              {product.completeness}%
            </span>
          }
        >
          <div className="quality-bar">
            <span
              className={`completeness__fill completeness__fill--${tone}`}
              style={{ width: `${product.completeness}%` }}
            />
          </div>
          {missing.length === 0 ? (
            <p className="quality-note quality-note--good">
              <CheckCircle2 size={15} /> All required fields are complete — this
              product is 100% ready.
            </p>
          ) : (
            <>
              <p className="quality-note">
                <AlertTriangle size={15} /> {missing.length} required field
                {missing.length > 1 ? "s" : ""} missing — this product is{" "}
                {product.completeness}% complete.
              </p>
              <ul className="missing-list">
                {guidance.map(({ field, label, hint }) => (
                  <li key={field}>
                    <span className="missing-list__field">{label}</span>
                    <span className="missing-list__hint">{hint}</span>
                  </li>
                ))}
              </ul>
              <p className="quality-suggestion">
                Add the missing fields above to reach a 100% completeness score
                and publish with confidence.
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => onFixMissing(product)}
              >
                <Pencil size={14} />
                Fix incomplete fields
              </button>
            </>
          )}
        </CollapsibleSection>

        {showSync && (
          <CollapsibleSection title="WooCommerce synchronization">
          <Field label="Local product ID" value={`#${product.id}`} />
          <Field
            label="WooCommerce ID"
            value={product.wooId ? `#${product.wooId}` : null}
          />
          <Field label="Last sync status" value={<StatusBadge status={product.syncStatus} />} />
          <Field
            label="Last synced"
            value={formatDateTime(product.lastSyncedAt) || null}
          />

          {product.syncError && (
            <p className="sync-error">
              <AlertTriangle size={15} /> {product.syncError}
            </p>
          )}

          {syncMessage && (
            <p className={`sync-message sync-message--${syncMessage.type}`}>
              {syncMessage.type === "error" ? (
                <AlertTriangle size={15} />
              ) : syncMessage.type === "info" ? (
                <Info size={15} />
              ) : (
                <CheckCircle2 size={15} />
              )}
              {syncMessage.text}
            </p>
          )}

          <div className="sync-actions">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => onSync(product)}
              disabled={syncing}
            >
              {syncing ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
              {syncing ? "Syncing…" : "Sync with WooCommerce"}
            </button>
          </div>
          <p className="sync-hint">
            <Info size={13} /> Live WooCommerce integration is not configured yet —
            this build reports the real connection state instead of faking a sync.
          </p>
          </CollapsibleSection>
        )}
      </div>

      {!product.name && (
        <div className="details__empty">
          <PackageX size={20} /> No product data
        </div>
      )}
    </aside>
  );
}
