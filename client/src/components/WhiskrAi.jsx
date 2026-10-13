import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  Package,
  Search,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import api from "../services/api";
import StatCard from "./StatCard";
import { PageShell } from "./OtherPages";

const ISSUE_LABELS = {
  missing_description: "Missing description",
  missing_category: "Missing category",
  missing_seo_title: "Missing SEO title",
};

const FIELD_LABELS = {
  description: "Description",
  seoTitle: "SEO title",
};

// Which quality issue triggers generation for each suggestion field.
const FIELD_ISSUE = {
  description: "missing_description",
  seoTitle: "missing_seo_title",
};

// Fields we can generate for (the product actually has this issue).
function generatableFields(issues) {
  return Object.keys(FIELD_ISSUE).filter((field) =>
    issues.includes(FIELD_ISSUE[field])
  );
}

function toneFor(count) {
  return count > 0 ? "warn" : "neutral";
}

/**
 * Whiskr AI assistant panel.
 *
 * Every number shown comes from the real GET /api/ai/product-quality
 * report; suggestions come from the real POST /api/ai/suggestions endpoint.
 * Approving sends ONLY the approved field to the existing product update
 * endpoint, and success is reported only after the backend confirms it.
 */
export default function WhiskrAi({ onRefresh }) {
  const [report, setReport] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  // Global banner: { type: "ok" | "warn" | "error", text }
  const [notice, setNotice] = useState(null);

  // productId -> { fields, existing, proposed, explanations, drafts }
  const [suggestions, setSuggestions] = useState({});
  const [generatingId, setGeneratingId] = useState(null);
  const [genErrors, setGenErrors] = useState({});
  // "productId:field" -> true while the update request is in flight
  const [busy, setBusy] = useState({});
  // "productId:field" -> validation / server error for that draft
  const [fieldStatus, setFieldStatus] = useState({});

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    setNotice(null);
    try {
      const data = await api.getProductQuality();
      setReport(data);
    } catch (err) {
      setReport(null);
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  // Silent refresh used after a confirmed save.
  const refreshReport = useCallback(async () => {
    try {
      const data = await api.getProductQuality();
      setReport(data);
      setAnalysisError(null);
    } catch (err) {
      setAnalysisError(err.message);
    }
  }, []);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const generate = async (product, fields) => {
    setGeneratingId(product.id);
    setGenErrors((prev) => ({ ...prev, [product.id]: null }));
    setNotice(null);
    try {
      const data = await api.getProductSuggestions(product.id, fields);
      setSuggestions((prev) => ({
        ...prev,
        [product.id]: {
          fields: data.fields,
          existing: data.existing,
          proposed: data.proposed,
          explanations: data.explanations,
          drafts: { ...data.proposed },
        },
      }));
    } catch (err) {
      setGenErrors((prev) => ({ ...prev, [product.id]: err.message }));
    } finally {
      setGeneratingId(null);
    }
  };

  const setDraft = (productId, field, value) => {
    setSuggestions((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        drafts: { ...prev[productId].drafts, [field]: value },
      },
    }));
  };

  const dropField = (productId, field) => {
    setSuggestions((prev) => {
      const next = { ...prev };
      const entry = { ...next[productId] };
      const fields = entry.fields.filter((f) => f !== field);
      if (fields.length === 0) {
        delete next[productId];
      } else {
        next[productId] = { ...entry, fields };
      }
      return next;
    });
    setFieldStatus((prev) => ({ ...prev, [`${productId}:${field}`]: null }));
  };

  const approve = async (product, field) => {
    const key = `${product.id}:${field}`;
    const draft = (suggestions[product.id]?.drafts?.[field] ?? "").trim();

    if (!draft) {
      setFieldStatus((prev) => ({
        ...prev,
        [key]: { type: "error", text: "The draft is empty — nothing to save." },
      }));
      return;
    }

    setBusy((prev) => ({ ...prev, [key]: true }));
    setFieldStatus((prev) => ({ ...prev, [key]: null }));
    setNotice(null);
    try {
      // Only the approved field is sent to the existing update endpoint.
      await api.updateProduct(product.id, { [field]: draft });
      // The backend has confirmed the save: only now do we report success.
      dropField(product.id, field);
      setNotice({
        type: "ok",
        text: `Saved “${FIELD_LABELS[field]}” to “${product.name}”. Product list and quality report refreshed.`,
      });
      await refreshReport();
      await Promise.resolve(onRefresh?.());
    } catch (err) {
      setFieldStatus((prev) => ({
        ...prev,
        [key]: { type: "error", text: err.message },
      }));
    } finally {
      setBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const reject = (product, field) => {
    dropField(product.id, field);
    setNotice({
      type: "warn",
      text: `Discarded the ${FIELD_LABELS[field].toLowerCase()} suggestion for “${product.name}”. The product was not modified.`,
    });
  };

  return (
    <PageShell
      title="Whiskr AI"
      subtitle="Analyse catalog quality, then refine AI-drafted content before anything is saved."
      actions={
        <button
          className="btn btn--primary"
          onClick={runAnalysis}
          disabled={analyzing}
        >
          {analyzing ? (
            <Loader2 size={15} className="spin" />
          ) : (
            <Search size={15} />
          )}
          Find incomplete products
        </button>
      }
    >
      {notice && (
        <div className={`conn-banner ai-notice conn-banner--${notice.type}`}>
          {notice.type === "ok" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <div className="panel">
        <div className="panel__head">
          <h3>Quality report</h3>
          {report && (
            <span className="count-pill">{report.totalProducts} analysed</span>
          )}
        </div>

        {analysisError && (
          <div className="sync-error" style={{ marginBottom: 12 }}>
            <AlertTriangle size={15} />
            <span>{analysisError}</span>
            <button className="btn btn--secondary btn--sm" onClick={runAnalysis}>
              Retry
            </button>
          </div>
        )}

        {report ? (
          <>
            <div className="stats-grid stats-grid--auto">
              <StatCard
                label="Products analysed"
                value={report.totalProducts}
                icon={Package}
              />
              <StatCard
                label="Need attention"
                value={report.productsNeedingAttention}
                icon={AlertTriangle}
                tone={report.productsNeedingAttention > 0 ? "bad" : "neutral"}
              />
              <StatCard
                label="Missing descriptions"
                value={report.missingDescriptions}
                icon={FileText}
                tone={toneFor(report.missingDescriptions)}
              />
              <StatCard
                label="Missing categories"
                value={report.missingCategories}
                icon={Tags}
                tone={toneFor(report.missingCategories)}
              />
              <StatCard
                label="Missing SEO titles"
                value={report.missingSeoTitles}
                icon={Globe}
                tone={toneFor(report.missingSeoTitles)}
              />
            </div>

            {!report.seoTitleFieldExists && (
              <p className="ai-note">
                The product model has no SEO title field yet, so SEO titles are
                reported as 0 until the model adds one.
              </p>
            )}

            {report.totalProducts === 0 && (
              <p className="muted">No products in the catalog yet.</p>
            )}
            {report.totalProducts > 0 &&
              report.productsNeedingAttention === 0 && (
                <div className="conn-banner conn-banner--ok ai-notice">
                  <CheckCircle2 size={16} />
                  <span>
                    All {report.totalProducts} products pass the quality checks.
                  </span>
                </div>
              )}
          </>
        ) : (
          !analysisError && (
            <p className="muted">
              Click “Find incomplete products” to analyse the catalog.
            </p>
          )
        )}
      </div>

      {report && report.products.length > 0 && (
        <div className="panel">
          <div className="panel__head">
            <h3>Products needing attention</h3>
            <span className="count-pill">{report.products.length}</span>
          </div>

          <div className="ai-list">
            {report.products.map((product) => {
              const entry = suggestions[product.id];
              const fields = generatableFields(product.issues);
              const isGenerating = generatingId === product.id;

              return (
                <article className="ai-card" key={product.id}>
                  <div className="ai-card__head">
                    <span className="ai-card__name">{product.name}</span>
                    <code className="ai-card__sku">{product.sku}</code>
                    <span className="ai-card__issues">
                      {product.issues.map((issue) => (
                        <span key={issue} className="badge badge--draft">
                          {ISSUE_LABELS[issue] || issue}
                        </span>
                      ))}
                    </span>
                  </div>

                  {product.issues.includes("missing_category") && (
                    <p className="ai-note">
                      Set the category from the product editor — the AI never
                      guesses it.
                    </p>
                  )}

                  {fields.length > 0 && !entry && (
                    <div className="ai-card__actions">
                      <button
                        className="btn btn--secondary btn--sm"
                        onClick={() => generate(product, fields)}
                        disabled={generatingId !== null}
                      >
                        {isGenerating ? (
                          <Loader2 size={13} className="spin" />
                        ) : (
                          <Sparkles size={13} />
                        )}
                        {isGenerating ? "Generating…" : "Generate suggestions"}
                      </button>
                    </div>
                  )}

                  {genErrors[product.id] && (
                    <div className="sync-error" style={{ marginTop: 10 }}>
                      <AlertTriangle size={15} />
                      <span>{genErrors[product.id]}</span>
                    </div>
                  )}

                  {entry && (
                    <div className="ai-suggestion">
                      <p className="ai-suggestion__title">
                        <Sparkles size={14} /> AI proposal — review before
                        saving
                      </p>

                      {entry.fields.map((field) => {
                        const key = `${product.id}:${field}`;
                        const status = fieldStatus[key];
                        const isBusy = Boolean(busy[key]);
                        const current = entry.existing[field];
                        const isLong = field === "description";

                        return (
                          <div className="ai-field" key={field}>
                            <div className="ai-field__head">
                              <strong>{FIELD_LABELS[field]}</strong>
                            </div>
                            <p className="ai-field__explanation">
                              Why: {entry.explanations[field]}
                            </p>

                            <div className="compare">
                              <div className="compare__box">
                                <span className="compare__label">
                                  Before — current value
                                </span>
                                {current ? (
                                  <p className="compare__value">{current}</p>
                                ) : (
                                  <p className="compare__value muted">
                                    Empty
                                  </p>
                                )}
                              </div>
                              <div className="compare__box">
                                <span className="compare__label">
                                  After — editable draft
                                </span>
                                <textarea
                                  className="ai-draft"
                                  rows={isLong ? 4 : 2}
                                  value={entry.drafts[field] || ""}
                                  onChange={(e) =>
                                    setDraft(product.id, field, e.target.value)
                                  }
                                  aria-label={`Draft ${FIELD_LABELS[field]}`}
                                />
                              </div>
                            </div>

                            <div className="ai-card__actions">
                              <button
                                className="btn btn--primary btn--sm"
                                onClick={() => approve(product, field)}
                                disabled={isBusy}
                              >
                                {isBusy ? (
                                  <Loader2 size={13} className="spin" />
                                ) : (
                                  <CheckCircle2 size={13} />
                                )}
                                Approve
                              </button>
                              <button
                                className="btn btn--ghost btn--sm"
                                onClick={() => reject(product, field)}
                                disabled={isBusy}
                              >
                                <X size={13} />
                                Reject
                              </button>
                              <span className="ai-status-note">
                                Approve saves this field only; Reject discards
                                it without touching the product.
                              </span>
                            </div>

                            {status && (
                              <div className="sync-error" style={{ marginTop: 8 }}>
                                <AlertTriangle size={15} />
                                <span>{status.text}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
