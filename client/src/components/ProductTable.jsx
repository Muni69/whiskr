import { Pencil, Inbox, Trash2 } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { formatPrice, initials, completenessTone } from "../utils/format";

function ProductThumb({ product }) {
  if (product.image) {
    return (
      <img
        className="table__thumb"
        src={product.image}
        alt={product.name}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  return (
    <span className="table__thumb table__thumb--placeholder" aria-hidden="true">
      {initials(product.name)}
    </span>
  );
}

export default function ProductTable({
  products,
  selectedId,
  selectedIds,
  onSelect,
  onToggleSelect,
  onToggleAll,
  onEdit,
  onDelete,
  loading,
  totalCount = 0,
  onClearFilters,
  showSync = false,
}) {
  if (loading) {
    return (
      <div className="table-wrap">
        <div className="table-skeleton" role="status" aria-live="polite">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="table-skeleton__row" key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    // Distinguish "the catalog is empty" from "filters excluded everything".
    const filtersExcludedEverything = totalCount > 0;
    return (
      <div className="table-wrap">
        <div className="empty-state">
          <Inbox size={34} strokeWidth={1.5} />
          {filtersExcludedEverything ? (
            <>
              <h3>No products match your filters</h3>
              <p>
                None of the {totalCount} products match the current search and
                filters.
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={onClearFilters}
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <h3>No products yet</h3>
              <p>Products you add will appear here.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const allSelected =
    products.length > 0 && products.every((p) => selectedIds.has(p.id));

  return (
    <div className="table-wrap">
      <table className="product-table">
        <thead>
          <tr>
            <th className="col-check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleAll(e.target.checked)}
                aria-label="Select all products"
              />
            </th>
            <th className="col-product">Product</th>
            <th>SKU</th>
            <th>Category</th>
            <th className="col-num">Price</th>
            <th>Status</th>
            <th className="col-completeness">Completeness</th>
            {showSync && <th>Sync</th>}
            <th className="col-action" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const tone = completenessTone(product.completeness);
            return (
              <tr
                key={product.id}
                className={selectedId === product.id ? "row--selected" : ""}
                onClick={() => onSelect(product.id)}
              >
                <td className="col-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(product.id)}
                    onChange={() => onToggleSelect(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </td>
                <td className="col-product">
                  <div className="table__product">
                    <ProductThumb product={product} />
                    <div>
                      <span className="table__name">{product.name}</span>
                      <span className="table__sub">
                        ID {product.id}
                        {showSync && product.wooId ? ` · Woo #${product.wooId}` : ""}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <code className="table__sku">{product.sku}</code>
                </td>
                <td>{product.category || <span className="muted">—</span>}</td>
                <td className="col-num">{formatPrice(product.price)}</td>
                <td>
                  <StatusBadge status={product.status} />
                </td>
                <td className="col-completeness">
                  <div className="completeness">
                    <div className="completeness__bar">
                      <span
                        className={`completeness__fill completeness__fill--${tone}`}
                        style={{ width: `${product.completeness}%` }}
                      />
                    </div>
                    <span className="completeness__value">{product.completeness}%</span>
                  </div>
                </td>
                {showSync && (
                  <td>
                    <StatusBadge status={product.syncStatus} withIcon={false} />
                  </td>
                )}
                <td className="col-action" onClick={(e) => e.stopPropagation()}>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => onEdit(product)}
                      aria-label={`Edit ${product.name}`}
                      title="Edit product"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-button icon-button--danger"
                      onClick={() => onDelete(product)}
                      aria-label={`Delete ${product.name}`}
                      title="Delete product"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
