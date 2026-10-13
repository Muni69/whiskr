import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  WifiOff,
  Menu,
  ArrowUpDown,
} from "lucide-react";
import "./App.css";
import api from "./services/api";
import { queryProducts } from "./utils/catalog";
import Sidebar from "./components/Sidebar";
import StatCard from "./components/StatCard";
import ProductTable from "./components/ProductTable";
import ProductDetails from "./components/ProductDetails";
import ProductForm from "./components/ProductForm";
import ConfirmDialog from "./components/ConfirmDialog";
import DotField from "./components/DotField";
import {
  DashboardPage,
  CategoriesPage,
  AttributesPage,
  DataQualityPage,
  SyncPage,
  SettingsPage,
} from "./components/OtherPages";

const PAGE_TITLES = {
  products: { title: "Products", subtitle: "Manage your product information in one place." },
  dashboard: { title: "Dashboard", subtitle: "Overview of your catalog." },
  categories: { title: "Categories", subtitle: "Catalog distribution." },
  attributes: { title: "Attributes", subtitle: "Attribute values." },
  quality: { title: "Data Quality", subtitle: "Completeness insights." },
  sync: { title: "Synchronization", subtitle: "WooCommerce status." },
  settings: { title: "Settings", subtitle: "Configuration." },
};

export default function App() {
  const [activePage, setActivePage] = useState("products");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [health, setHealth] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [syncingId, setSyncingId] = useState(null);
  const [syncMessages, setSyncMessages] = useState({});
  const [toast, setToast] = useState(null);

  // Pending deletion (single product or a bulk selection) awaiting confirmation.
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      const [list, h] = await Promise.all([
        api.getProducts(),
        api.getHealth().catch(() => null),
      ]);
      setProducts(Array.isArray(list) ? list : []);
      if (h) setHealth(h);
    } catch (err) {
      setConnectionError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // The details panel becomes an overlay drawer on small screens, so let
  // Escape close it. It stays open while a modal is in front of it.
  useEffect(() => {
    if (selectedId === null) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !formOpen && !deleteRequest) {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, formOpen, deleteRequest]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  );

  const stats = useMemo(
    () => ({
      total: products.length,
      published: products.filter((p) => p.status === "Published").length,
      draft: products.filter((p) => p.status === "Draft").length,
      incomplete: products.filter((p) => p.completeness < 100).length,
    }),
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      queryProducts(products, {
        search,
        category: categoryFilter,
        status: statusFilter,
        sortBy,
      }),
    [products, search, categoryFilter, statusFilter, sortBy]
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedId) || null,
    [products, selectedId]
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelectedIds(checked ? new Set(filteredProducts.map((p) => p.id)) : new Set());
  };

  const openCreate = () => {
    setEditingProduct(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setEditingProduct(null);
    setFormError(null);
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingProduct) {
        const updated = await api.updateProduct(editingProduct.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        if (selectedId === updated.id) setSelectedId(updated.id);
        showToast("success", `“${updated.name}” updated.`);
      } else {
        const created = await api.createProduct(payload);
        setProducts((prev) => [...prev, created]);
        setSelectedId(created.id);
        showToast("success", `“${created.name}” created.`);
      }
      setFormOpen(false);
      setEditingProduct(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSync = async (product) => {
    setSyncingId(product.id);
    try {
      const result = await api.syncProduct(product.id);
      if (result.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === result.product.id ? result.product : p))
        );
      }
      const type = result.ok ? "success" : "info";
      setSyncMessages((prev) => ({
        ...prev,
        [product.id]: { type, text: result.message },
      }));
      showToast(result.ok ? "success" : "info", result.message);
    } catch (err) {
      setSyncMessages((prev) => ({
        ...prev,
        [product.id]: { type: "error", text: err.message },
      }));
      showToast("error", err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const askDeleteProduct = (product) => {
    setDeleteError(null);
    setDeleteRequest({ ids: [product.id], name: product.name });
  };

  const askBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteError(null);
    setDeleteRequest({ ids: [...selectedIds], name: null });
  };

  const cancelDelete = () => {
    if (deleting) return;
    setDeleteRequest(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteRequest) return;
    const { ids, name } = deleteRequest;
    setDeleting(true);
    setDeleteError(null);
    try {
      // The product is only removed from the UI after the server confirms it.
      if (ids.length === 1) {
        await api.deleteProduct(ids[0]);
      } else {
        await api.bulkDelete(ids);
      }
      setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
      if (ids.includes(selectedId)) setSelectedId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      showToast(
        "success",
        name ? `“${name}” deleted.` : `${ids.length} product(s) deleted.`
      );
      setDeleteRequest(null);
    } catch (err) {
      // Keep the product in the catalog and show the real server error.
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const currentSyncMessage =
    selectedProduct && syncMessages[selectedProduct.id]
      ? syncMessages[selectedProduct.id]
      : null;

  const wooConnected = Boolean(health?.wooCommerceConnected);

  return (
    <div className="app">
      {/* Interactive dot-field background. Fixed + non-interactive so it sits
          behind every page without blocking clicks or scrolling. */}
      <div className="app__bg" aria-hidden="true">
        <DotField
          dotRadius={1.5}
          dotSpacing={6}
          bulgeStrength={67}
          glowRadius={160}
          sparkle={false}
          waveAmplitude={0}
          cursorRadius={500}
          cursorForce={0.1}
          bulgeOnly
          gradientFrom="#A855F7"
          gradientTo="#B497CF"
          glowColor="#120F17"
        />
      </div>

      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        showSync={wooConnected}
      />

      <main className="content">
        {connectionError && (
          <div className="conn-banner conn-banner--error">
            <WifiOff size={16} />
            <span>{connectionError}</span>
            <button className="btn btn--secondary btn--sm" onClick={loadProducts}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {activePage === "products" && (
          <div className="page">
            <header className="page__header page__header--products">
              <div className="page__header-left">
                <button
                  className="icon-button content__menu"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                  aria-label="Toggle navigation"
                >
                  <Menu size={18} />
                </button>
                <div>
                  <h1>{PAGE_TITLES.products.title}</h1>
                  <p>{PAGE_TITLES.products.subtitle}</p>
                </div>
                <span className="count-pill count-pill--lg">
                  {filteredProducts.length} of {stats.total}
                </span>
              </div>
              <div className="page__actions">
                <button className="btn btn--ghost" onClick={loadProducts} disabled={loading}>
                  {loading ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                  Refresh
                </button>
                {wooConnected && (
                  <button
                    className="btn btn--secondary"
                    onClick={() => setActivePage("sync")}
                    title="Open synchronization"
                  >
                    <RefreshCw size={15} />
                    Sync with WooCommerce
                  </button>
                )}
                <button className="btn btn--primary" onClick={openCreate}>
                  <Plus size={16} />
                  Add Product
                </button>
              </div>
            </header>

            <div className="stats-grid">
              <StatCard label="Total Products" value={stats.total} icon={Package} />
              <StatCard label="Published Products" value={stats.published} icon={CheckCircle2} tone="good" />
              <StatCard label="Draft Products" value={stats.draft} icon={Clock} tone="warn" />
              <StatCard label="Incomplete Products" value={stats.incomplete} icon={AlertTriangle} tone="bad" />
            </div>

            <div className="toolbar">
              <div className="toolbar__search">
                <Search size={16} />
                <input
                  type="search"
                  placeholder="Search by product name or SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>

              <div className="toolbar__sort">
                <ArrowUpDown size={15} />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="name-desc">Name (Z–A)</option>
                  <option value="price-asc">Price (low → high)</option>
                  <option value="price-desc">Price (high → low)</option>
                  <option value="completeness-asc">Completeness (low → high)</option>
                  <option value="completeness-desc">Completeness (high → low)</option>
                </select>
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="bulk-bar">
                <span>{selectedIds.size} selected</span>
                <button className="btn btn--danger btn--sm" onClick={askBulkDelete}>
                  <Trash2 size={14} /> Delete selected
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
              </div>
            )}

            <div className={`workspace ${selectedProduct ? "workspace--split" : ""}`}>
              <ProductTable
                products={filteredProducts}
                selectedId={selectedId}
                selectedIds={selectedIds}
                onSelect={setSelectedId}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
                onEdit={openEdit}
                onDelete={askDeleteProduct}
                loading={loading}
                totalCount={products.length}
                onClearFilters={clearFilters}
                showSync={wooConnected}
              />

              {selectedProduct && (
                <>
                  <div
                    className="details-backdrop"
                    onClick={() => setSelectedId(null)}
                    aria-hidden="true"
                  />
                  <ProductDetails
                  product={selectedProduct}
                  onClose={() => setSelectedId(null)}
                  onEdit={openEdit}
                  onSync={handleSync}
                  syncing={syncingId === selectedProduct.id}
                  syncMessage={currentSyncMessage}
                  onFixMissing={openEdit}
                  onDelete={askDeleteProduct}
                  showSync={wooConnected}
                />
                </>
              )}
            </div>
          </div>
        )}

        {activePage === "dashboard" && (
          <DashboardPage products={products} stats={stats} onNavigate={setActivePage} />
        )}
        {activePage === "categories" && <CategoriesPage products={products} />}
        {activePage === "attributes" && <AttributesPage products={products} />}
        {activePage === "quality" && <DataQualityPage products={products} onFix={openEdit} />}
        {activePage === "sync" && (
          <SyncPage
            products={products}
            wooConnected={wooConnected}
            syncingId={syncingId}
            onSync={handleSync}
            syncMessages={syncMessages}
          />
        )}
        {activePage === "settings" && (
          <SettingsPage
            apiBaseUrl={api.baseUrl}
            health={health}
            wooConnected={wooConnected}
            productCount={products.length}
          />
        )}
      </main>

      {formOpen && (
        <ProductForm
          open={formOpen}
          initialProduct={editingProduct}
          categories={categories}
          submitting={submitting}
          error={formError}
          onClose={closeForm}
          onSubmit={handleFormSubmit}
        />
      )}

      {deleteRequest && (
        <ConfirmDialog
          open
          title={deleteRequest.name ? "Delete product" : "Delete products"}
          message={
            deleteRequest.name
              ? `Delete “${deleteRequest.name}”? This cannot be undone.`
              : `Delete ${deleteRequest.ids.length} selected product(s)? This cannot be undone.`
          }
          confirmLabel={
            deleteRequest.name ? "Delete product" : `Delete ${deleteRequest.ids.length}`
          }
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {toast && <div className={`toast toast--${toast.type}`}>{toast.text}</div>}
    </div>
  );
}
