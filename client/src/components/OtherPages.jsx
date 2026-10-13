import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Server,
  Link2,
  Sparkles,
} from "lucide-react";
import StatCard from "./StatCard";
import StatusBadge from "./StatusBadge";
import { formatDateTime, completenessTone } from "../utils/format";
import { missingFieldLabel } from "../utils/completeness";

export function PageShell({ title, subtitle, children, actions }) {
  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {actions}
      </header>
      <div className="page__body">{children}</div>
    </div>
  );
}

export function DashboardPage({ products, stats, onNavigate }) {
  const recent = products.slice(0, 5);
  return (
    <PageShell
      title="Dashboard"
      subtitle="A snapshot of your product catalog health."
      actions={
        <button className="btn btn--ghost" onClick={() => onNavigate("ai")}>
          <Sparkles size={15} />
          Whiskr AI
        </button>
      }
    >
      <div className="stats-grid">
        <StatCard label="Total Products" value={stats.total} icon={ShieldCheck} />
        <StatCard label="Published" value={stats.published} icon={CheckCircle2} tone="good" />
        <StatCard label="Drafts" value={stats.draft} icon={Clock} tone="warn" />
        <StatCard
          label="Incomplete"
          value={stats.incomplete}
          icon={AlertTriangle}
          tone="bad"
        />
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3>Recently added</h3>
          <button className="btn btn--ghost btn--sm" onClick={() => onNavigate("products")}>
            View all products
          </button>
        </div>
        <ul className="mini-list">
          {recent.map((p) => (
            <li key={p.id}>
              <span className="mini-list__name">{p.name}</span>
              <code className="muted">{p.sku}</code>
              <span className={`score-pill score-pill--${completenessTone(p.completeness)}`}>
                {p.completeness}%
              </span>
            </li>
          ))}
          {recent.length === 0 && <li className="muted">No products yet.</li>}
        </ul>
      </div>
    </PageShell>
  );
}

export function CategoriesPage({ products }) {
  const counts = products.reduce((acc, p) => {
    const key = p.category || "Uncategorised";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <PageShell
      title="Categories"
      subtitle="How your catalog is distributed across categories."
    >
      <div className="panel">
        {rows.length === 0 ? (
          <p className="muted">No categories yet.</p>
        ) : (
          <ul className="mini-list">
            {rows.map(([name, count]) => (
              <li key={name}>
                <span className="mini-list__name">{name}</span>
                <span className="count-pill">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

export function AttributesPage({ products }) {
  const groups = { brand: new Set(), color: new Set(), size: new Set(), material: new Set() };
  products.forEach((p) => {
    Object.keys(groups).forEach((key) => {
      const v = p.attributes?.[key];
      if (v) groups[key].add(v);
    });
  });
  return (
    <PageShell
      title="Attributes"
      subtitle="Distinct attribute values available across your catalog."
    >
      <div className="attribute-grid">
        {Object.entries(groups).map(([key, set]) => (
          <div className="panel" key={key}>
            <h3 className="panel__title">{key.charAt(0).toUpperCase() + key.slice(1)}</h3>
            <div className="tag-row">
              {[...set].length === 0 && <span className="muted">None</span>}
              {[...set].map((v) => (
                <span className="tag" key={v}>
                  {v}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function DataQualityPage({ products, onFix }) {
  const ranked = [...products].sort((a, b) => a.completeness - b.completeness);
  return (
    <PageShell
      title="Data Quality"
      subtitle="Products ranked by completeness — fix the weakest first."
    >
      <div className="panel">
        {ranked.length === 0 ? (
          <p className="muted">No products to analyse.</p>
        ) : (
          <ul className="mini-list mini-list--quality">
            {ranked.map((p) => (
              <li key={p.id}>
                <span className="mini-list__name">{p.name}</span>
                <span className="mini-list__missing">
                  {(p.missingFields || []).length === 0 ? (
                    <span className="muted">Complete</span>
                  ) : (
                    <>Missing: {p.missingFields.map((f) => missingFieldLabel(f)).join(", ")}</>
                  )}
                </span>
                <span className={`score-pill score-pill--${completenessTone(p.completeness)}`}>
                  {p.completeness}%
                </span>
                <button className="btn btn--ghost btn--sm" onClick={() => onFix(p)}>
                  Fix
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

export function SyncPage({
  products,
  wooConnected,
  syncingId,
  onSync,
  syncMessages,
}) {
  return (
    <PageShell
      title="Synchronization"
      subtitle="WooCommerce connection status for every product."
    >
      <div className={`conn-banner ${wooConnected ? "conn-banner--ok" : "conn-banner--warn"}`}>
        {wooConnected ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
        {wooConnected
          ? "WooCommerce shop connection is configured."
          : "WooCommerce is not connected. Sync actions report the real connection state and do not fake a success."}
      </div>

      <div className="panel">
        <table className="product-table product-table--sync">
          <thead>
            <tr>
              <th>Product</th>
              <th>Local ID</th>
              <th>Woo ID</th>
              <th>Status</th>
              <th>Last synced</th>
              <th className="col-action" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const msg = syncMessages[p.id];
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>#{p.id}</td>
                  <td>{p.wooId ? `#${p.wooId}` : <span className="muted">—</span>}</td>
                  <td>
                    <StatusBadge status={p.syncStatus} />
                    {msg && <div className="sync-inline">{msg.text}</div>}
                  </td>
                  <td>{formatDateTime(p.lastSyncedAt) || <span className="muted">Never</span>}</td>
                  <td className="col-action">
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => onSync(p)}
                      disabled={syncingId === p.id}
                    >
                      {syncingId === p.id ? (
                        <Loader2 size={13} className="spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      Sync
                    </button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No products.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

export function SettingsPage({ apiBaseUrl, health, wooConnected, productCount }) {
  return (
    <PageShell title="Settings" subtitle="Connection and integration configuration.">
      <div className="panel settings-panel">
        <div className="settings-row">
          <Server size={17} />
          <div>
            <span className="settings-row__label">API base URL</span>
            <code>{apiBaseUrl}</code>
          </div>
        </div>
        <div className="settings-row">
          <CheckCircle2 size={17} />
          <div>
            <span className="settings-row__label">Backend status</span>
            <span>{health ? `${health.app} · ${health.status}` : "Unreachable"}</span>
          </div>
        </div>
        {wooConnected && (
          <div className="settings-row">
            <Link2 size={17} />
            <div>
              <span className="settings-row__label">WooCommerce</span>
              <span>Connected</span>
            </div>
          </div>
        )}
        <div className="settings-row">
          <ShieldCheck size={17} />
          <div>
            <span className="settings-row__label">Products loaded</span>
            <span>{productCount}</span>
          </div>
        </div>
        {wooConnected && (
          <p className="settings-hint">
            Live WooCommerce sync is configured on the server. Store credentials
            stay server-side — never put consumer keys in the React app.
          </p>
        )}
      </div>
    </PageShell>
  );
}
