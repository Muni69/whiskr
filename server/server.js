const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
require("dotenv").config();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/*
 * Whiskr PIM API
 * --------------
 * This server currently keeps products in memory. The data shape below is
 * intentionally aligned with the fields the frontend edits so persistence can
 * later be swapped for MySQL without changing the HTTP contracts.
 *
 * WooCommerce is NOT connected in this build. The sync endpoint reports that
 * honestly instead of faking a successful synchronization.
 */

// Whether a real WooCommerce connection has been configured (via .env).
const WOOCOMMERCE_CONNECTED = process.env.WOOCOMMERCE_CONNECTED === "true";

// Fields that count toward the data-quality completeness score.
const REQUIRED_FIELDS = [
  "name",
  "sku",
  "description",
  "price",
  "category",
  "image",
];

function computeCompleteness(product) {
  const filled = REQUIRED_FIELDS.filter((field) => {
    const value = product[field];
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "number") return !Number.isNaN(value);
    return true;
  }).length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

function getMissingFields(product) {
  return REQUIRED_FIELDS.filter((field) => {
    const value = product[field];
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
  });
}

function withCompleteness(product) {
  return {
    ...product,
    completeness: computeCompleteness(product),
    missingFields: getMissingFields(product),
  };
}

let nextId = 5;

let products = [
  {
    id: 1,
    name: "Classic Cotton T-Shirt",
    sku: "TSHIRT-001",
    description:
      "A soft, breathable 100% cotton t-shirt with a relaxed everyday fit.",
    category: "Clothing",
    price: 799,
    status: "Published",
    image: "",
    attributes: {
      brand: "Whiskr Basics",
      color: "White",
      size: "M",
      material: "Cotton",
    },
    wooId: 501,
    syncStatus: "Not connected",
    lastSyncedAt: null,
    syncError: null,
  },
  {
    id: 2,
    name: "Everyday Sneakers",
    sku: "SHOE-002",
    description:
      "Lightweight low-top sneakers designed for all-day comfort and grip.",
    category: "Footwear",
    price: 1499,
    status: "Published",
    image: "",
    attributes: {
      brand: "Stride",
      color: "Grey",
      size: "42",
      material: "Mesh",
    },
    wooId: 502,
    syncStatus: "Not connected",
    lastSyncedAt: null,
    syncError: null,
  },
  {
    id: 3,
    name: "Canvas Tote Bag",
    sku: "BAG-003",
    description: "",
    category: "Accessories",
    price: 499,
    status: "Draft",
    image: "",
    attributes: {
      brand: "Whiskr Basics",
      color: "Natural",
      size: "",
      material: "Canvas",
    },
    wooId: null,
    syncStatus: "Not connected",
    lastSyncedAt: null,
    syncError: null,
  },
  {
    id: 4,
    name: "Minimalist Watch",
    sku: "WATCH-004",
    description: "A slim stainless-steel watch with a clean, uncluttered dial.",
    category: "Accessories",
    price: 2199,
    status: "Draft",
    image: "",
    attributes: {
      brand: "Meridian",
      color: "Silver",
      size: "",
      material: "Stainless Steel",
    },
    wooId: null,
    syncStatus: "Not connected",
    lastSyncedAt: null,
    syncError: null,
  },
];

/* ---------------------------------------------------------------------
 * Whiskr AI Product Assistant — step 1: real data-quality checker.
 * No AI generation yet: this only inspects the live product data served
 * by the existing product endpoints. Every count is derived from that
 * data — nothing is hardcoded.
 * ------------------------------------------------------------------- */

const SEO_TITLE_KEYS = ["seoTitle", "seo_title", "metaTitle", "meta_title"];

function isBlank(value) {
  if (value === null || value === undefined) return true;
  return typeof value === "string" ? value.trim() === "" : false;
}

// Returns the SEO title when the product model carries that field, or
// undefined when the model has no SEO title field at all.
function readSeoTitle(product) {
  if (!product || typeof product !== "object") return undefined;
  for (const key of SEO_TITLE_KEYS) {
    if (product[key] !== undefined) return product[key];
  }
  const seo = product.seo;
  if (seo && typeof seo === "object") {
    if (seo.title !== undefined) return seo.title;
    if (seo.seoTitle !== undefined) return seo.seoTitle;
  }
  return undefined;
}

// Builds the structured quality report from actual products.
function analyzeProductQuality(productList) {
  const list = Array.isArray(productList) ? productList : [];

  let missingDescriptions = 0;
  let missingCategories = 0;
  let missingSeoTitles = 0;
  let seoTitleFieldExists = false;
  const affected = [];

  for (const product of list) {
    const issues = [];

    if (isBlank(product.description)) {
      issues.push("missing_description");
      missingDescriptions += 1;
    }
    if (isBlank(product.category)) {
      issues.push("missing_category");
      missingCategories += 1;
    }

    const seoTitle = readSeoTitle(product);
    if (seoTitle !== undefined) {
      seoTitleFieldExists = true;
      if (isBlank(seoTitle)) {
        issues.push("missing_seo_title");
        missingSeoTitles += 1;
      }
    }

    if (issues.length > 0) {
      affected.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        issues,
      });
    }
  }

  return {
    totalProducts: list.length,
    productsNeedingAttention: affected.length,
    missingDescriptions,
    missingCategories,
    missingSeoTitles,
    seoTitleFieldExists,
    products: affected,
  };
}

// Structured data-quality report for the AI Product Assistant.
/* ---------------------------------------------------------------------
 * Whiskr AI Product Assistant — step 2: LLM-backed improvement
 * suggestions (server-side only).
 *
 * The OpenAI key is read from the backend environment (server/.env,
 * variable OPENAI_API_KEY) and is never sent to the React app. Nothing
 * here writes back to the product store: generation is read-only.
 * ------------------------------------------------------------------- */

const AI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SUGGESTABLE_FIELDS = ["description", "seoTitle"];

const AI_SYSTEM_PROMPT = [
  "You are Whiskr's product content assistant inside a Product Information Management (PIM) tool.",
  "Using ONLY the product information supplied in the user message, propose improvements for the requested fields.",
  "Hard rules:",
  "- Never invent technical specifications, certifications, ingredients, dimensions, warranties, guarantees, performance claims, ratings, reviews, shipping details or price information that is not present in the supplied data.",
  "- Do not add materials, sizes, colours, brands or features that are not in the data; an empty or unknown value must stay unknown.",
  "- Keep every proposal faithful to the provided name, SKU, category, price, status, description and attributes.",
  "- description: a concise, honest marketing description built strictly from the known fields (2-3 sentences).",
  "- seoTitle: at most 60 characters, leads with the product name and includes the category when one is known; no clickbait and no unsupported claims.",
  "Respond with a single JSON object only, in exactly this shape:",
  '{"description":"...","seoTitle":"...","explanations":{"description":"short reason for this suggestion","seoTitle":"short reason for this suggestion"}}',
].join("\n");

// Validates/normalises the requested fields. Returns null when malformed.
function normalizeSuggestFields(raw) {
  if (!Array.isArray(raw)) return null;
  const fields = [...new Set(raw.map((field) => String(field).trim()))];
  if (fields.length === 0) return null;
  for (const field of fields) {
    if (!SUGGESTABLE_FIELDS.includes(field)) return null;
  }
  return fields;
}

// Calls the OpenAI API. Throws on provider/network/malformed-output errors;
// the caller maps them to an honest HTTP error — no canned responses.
async function requestAiSuggestions(product, fields) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000,
    maxRetries: 1,
  });

  // Only known, server-side product data is sent to the model; nothing
  // supplied by the browser is trusted or forwarded.
  const knownInfo = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    status: product.status,
    description: product.description,
    attributes: product.attributes || {},
  };

  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: AI_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `Requested fields: ${fields.join(", ")}\n` +
          `Known product information (the ONLY source of truth):\n` +
          JSON.stringify(knownInfo),
      },
    ],
  });

  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    const err = new Error("The AI provider returned an empty response.");
    err.code = "malformed";
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const err = new Error("The AI provider returned malformed JSON.");
    err.code = "malformed";
    throw err;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    const err = new Error("The AI provider returned an unexpected payload.");
    err.code = "malformed";
    throw err;
  }
  return parsed;
}

// Generates improvement suggestions for one product. Read-only: the
// product is never modified by this endpoint.
app.post("/api/ai/suggestions", async (req, res) => {
  const body = req.body || {};

  const id = Number(body.id !== undefined ? body.id : body.productId);
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "A numeric product id is required" });
  }

  const fields = normalizeSuggestFields(body.fields);
  if (!fields) {
    return res.status(400).json({
      error: 'fields must be a non-empty array containing "description" and/or "seoTitle"',
    });
  }

  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error:
        "OPENAI_API_KEY is not configured on the server. Add OPENAI_API_KEY=... to server/.env (keep it server-side, never in the React app) and restart the Whiskr API.",
    });
  }

  let parsed;
  try {
    parsed = await requestAiSuggestions(product, fields);
  } catch (err) {
    if (err.code === "malformed") {
      return res.status(502).json({ error: err.message });
    }
    const providerStatus = err?.status ? ` (provider status ${err.status})` : "";
    return res.status(502).json({
      error: `AI provider error${providerStatus}: ${err?.message || "unknown error"}`,
    });
  }

  const proposed = {};
  const explanations = {};
  const missing = [];
  for (const field of fields) {
    const value = parsed[field];
    const explanation = parsed.explanations ? parsed.explanations[field] : undefined;
    if (typeof value !== "string" || value.trim() === "") {
      missing.push(field);
      continue;
    }
    if (typeof explanation !== "string" || explanation.trim() === "") {
      missing.push(field);
      continue;
    }
    proposed[field] = value.trim();
    explanations[field] = explanation.trim();
  }
  if (missing.length > 0) {
    return res.status(502).json({
      error: `The AI provider returned a malformed response (missing or empty: ${missing.join(", ")}).`,
    });
  }

  const existing = {};
  for (const field of fields) {
    existing[field] =
      field === "seoTitle" ? readSeoTitle(product) ?? "" : product[field] ?? "";
  }

  // Read-only guarantee: nothing above (or below) mutates `products`.
  return res.json({
    productId: product.id,
    fields,
    existing,
    proposed,
    explanations,
    model: AI_MODEL,
    generatedAt: new Date().toISOString(),
    saved: false,
  });
});

app.get("/api/ai/product-quality", (req, res) => {
  res.json(analyzeProductQuality(products));
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Whiskr API",
    wooCommerceConnected: WOOCOMMERCE_CONNECTED,
  });
});

// List all products.
app.get("/api/products", (req, res) => {
  res.json(products.map(withCompleteness));
});

// Retrieve a single product.
app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(withCompleteness(product));
});

// Create a product.
app.post("/api/products", (req, res) => {
  const body = req.body || {};

  if (!body.name || !String(body.name).trim()) {
    return res.status(400).json({ error: "Product name is required" });
  }
  if (!body.sku || !String(body.sku).trim()) {
    return res.status(400).json({ error: "SKU is required" });
  }

  const price = Number(body.price);
  if (body.price !== undefined && body.price !== "" && Number.isNaN(price)) {
    return res.status(400).json({ error: "Price must be a number" });
  }
  if (!Number.isNaN(price) && price < 0) {
    return res.status(400).json({ error: "Price cannot be negative" });
  }

  const duplicate = products.find(
    (p) => p.sku.toLowerCase() === String(body.sku).trim().toLowerCase()
  );
  if (duplicate) {
    return res.status(409).json({ error: "A product with this SKU already exists" });
  }

  const product = {
    id: nextId++,
    name: String(body.name).trim(),
    sku: String(body.sku).trim(),
    description: body.description ? String(body.description) : "",
    category: body.category ? String(body.category) : "",
    price: Number.isNaN(price) ? 0 : price,
    status: body.status === "Published" ? "Published" : "Draft",
    image: body.image ? String(body.image) : "",
    attributes: {
      brand: body.attributes?.brand || "",
      color: body.attributes?.color || "",
      size: body.attributes?.size || "",
      material: body.attributes?.material || "",
    },
    wooId: null,
    syncStatus: "Not connected",
    lastSyncedAt: null,
    syncError: null,
  };

  products.push(product);
  res.status(201).json(withCompleteness(product));
});

// Update a product.
app.put("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const body = req.body || {};

  if (body.name !== undefined && !String(body.name).trim()) {
    return res.status(400).json({ error: "Product name is required" });
  }
  if (body.sku !== undefined && !String(body.sku).trim()) {
    return res.status(400).json({ error: "SKU is required" });
  }
  if (body.price !== undefined && body.price !== "") {
    const price = Number(body.price);
    if (Number.isNaN(price)) {
      return res.status(400).json({ error: "Price must be a number" });
    }
    if (price < 0) {
      return res.status(400).json({ error: "Price cannot be negative" });
    }
  }
  if (body.sku !== undefined) {
    const duplicate = products.find(
      (p) =>
        p.id !== id &&
        p.sku.toLowerCase() === String(body.sku).trim().toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ error: "A product with this SKU already exists" });
    }
  }

  if (body.name !== undefined) product.name = String(body.name).trim();
  if (body.sku !== undefined) product.sku = String(body.sku).trim();
  if (body.description !== undefined) product.description = String(body.description);
  if (body.category !== undefined) product.category = String(body.category);
  if (body.price !== undefined && body.price !== "") product.price = Number(body.price);
  if (body.status !== undefined) {
    product.status = body.status === "Published" ? "Published" : "Draft";
  }
  if (body.image !== undefined) product.image = String(body.image);
  if (body.attributes !== undefined) {
    product.attributes = {
      brand: body.attributes?.brand || "",
      color: body.attributes?.color || "",
      size: body.attributes?.size || "",
      material: body.attributes?.material || "",
    };
  }

  res.json(withCompleteness(product));
});

// Delete a product.
app.delete("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Product not found" });
  }
  const [removed] = products.splice(index, 1);
  res.json({ success: true, id: removed.id });
});

// Bulk delete (used by the catalog selection toolbar).
app.post("/api/products/bulk-delete", (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number) : [];
  if (ids.length === 0) {
    return res.status(400).json({ error: "No product ids provided" });
  }
  const before = products.length;
  products = products.filter((p) => !ids.includes(p.id));
  res.json({ success: true, deleted: before - products.length });
});

// WooCommerce synchronization.
// This build is NOT connected to WooCommerce, so we report that honestly
// rather than pretending the product was pushed to the store.
app.post("/api/products/:id/sync", (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (!WOOCOMMERCE_CONNECTED) {
    product.syncStatus = "Not connected";
    product.syncError =
      "WooCommerce is not connected. Configure store credentials on the server to enable live sync.";
    return res.status(200).json({
      ok: false,
      connected: false,
      message: product.syncError,
      product: withCompleteness(product),
    });
  }

  // Placeholder for the real WooCommerce integration.
  product.syncStatus = "Synced";
  product.lastSyncedAt = new Date().toISOString();
  product.syncError = null;
  res.json({
    ok: true,
    connected: true,
    message: "Product synced with WooCommerce.",
    product: withCompleteness(product),
  });
});

app.listen(PORT, () => {
  console.log(`Whiskr API running at http://localhost:${PORT}`);
});
