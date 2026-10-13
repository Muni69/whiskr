import { useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";

const EMPTY = {
  name: "",
  sku: "",
  description: "",
  price: "",
  category: "",
  status: "Draft",
  image: "",
  attributes: { brand: "", color: "", size: "", material: "" },
};

function toFormState(product) {
  if (!product) return EMPTY;
  return {
    name: product.name || "",
    sku: product.sku || "",
    description: product.description || "",
    price: product.price === undefined || product.price === null ? "" : String(product.price),
    category: product.category || "",
    status: product.status || "Draft",
    image: product.image || "",
    attributes: {
      brand: product.attributes?.brand || "",
      color: product.attributes?.color || "",
      size: product.attributes?.size || "",
      material: product.attributes?.material || "",
    },
  };
}

export default function ProductForm({
  open,
  initialProduct,
  categories,
  submitting,
  error,
  onClose,
  onSubmit,
}) {
  // The form is mounted fresh each time it opens (see App), so the initial
  // state can come straight from the product being edited — no empty flash.
  const [form, setForm] = useState(() => toFormState(initialProduct));
  const [touched, setTouched] = useState(false);

  if (!open) return null;

  const isEdit = Boolean(initialProduct);
  const errors = {};
  if (!form.name.trim()) errors.name = "Product name is required.";
  if (!form.sku.trim()) errors.sku = "SKU is required.";
  if (form.price !== "") {
    const price = Number(form.price);
    if (Number.isNaN(price)) errors.price = "Price must be a number.";
    else if (price < 0) errors.price = "Price cannot be negative.";
  }
  const hasErrors = Object.keys(errors).length > 0;

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateAttr = (key, value) =>
    setForm((f) => ({ ...f, attributes: { ...f.attributes, [key]: value } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (hasErrors) return;
    onSubmit({
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description,
      category: form.category,
      price: form.price === "" ? 0 : Number(form.price),
      status: form.status,
      image: form.image,
      attributes: form.attributes,
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>{isEdit ? "Edit product" : "Add product"}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <form className="modal__body" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="form-alert">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          <div className="form-grid">
            <label className="form-field form-field--full">
              <span>
                Product name <em>*</em>
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Classic Cotton T-Shirt"
                className={touched && errors.name ? "input--error" : ""}
              />
              {touched && errors.name && <small className="form-error">{errors.name}</small>}
            </label>

            <label className="form-field">
              <span>
                SKU <em>*</em>
              </span>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => update("sku", e.target.value)}
                placeholder="e.g. TSHIRT-001"
                className={touched && errors.sku ? "input--error" : ""}
              />
              {touched && errors.sku && <small className="form-error">{errors.sku}</small>}
            </label>

            <label className="form-field">
              <span>Category</span>
              <input
                type="text"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                list="category-options"
                placeholder="e.g. Clothing"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>

            <label className="form-field">
              <span>Price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                placeholder="0"
                className={touched && errors.price ? "input--error" : ""}
              />
              {touched && errors.price && <small className="form-error">{errors.price}</small>}
            </label>

            <label className="form-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </select>
            </label>

            <label className="form-field form-field--full">
              <span>Image URL</span>
              <input
                type="url"
                value={form.image}
                onChange={(e) => update("image", e.target.value)}
                placeholder="https://…"
              />
            </label>

            <label className="form-field form-field--full">
              <span>Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Short product description"
              />
            </label>
          </div>

          <fieldset className="form-fieldset">
            <legend>Attributes</legend>
            <div className="form-grid">
              <label className="form-field">
                <span>Brand</span>
                <input
                  type="text"
                  value={form.attributes.brand}
                  onChange={(e) => updateAttr("brand", e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Color</span>
                <input
                  type="text"
                  value={form.attributes.color}
                  onChange={(e) => updateAttr("color", e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Size</span>
                <input
                  type="text"
                  value={form.attributes.size}
                  onChange={(e) => updateAttr("size", e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Material</span>
                <input
                  type="text"
                  value={form.attributes.material}
                  onChange={(e) => updateAttr("material", e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <footer className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting && <Loader2 size={15} className="spin" />}
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create product"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
