// Centralized API client for the Whiskr PIM.
// All requests go to the existing Express backend. No mock data lives here:
// a failed request is surfaced as an error so the UI can show a real
// connection problem instead of silently faking a response.

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkError) {
    // fetch only rejects on network failures / CORS, not on HTTP errors.
    throw new Error(
      `Cannot reach the Whiskr API at ${API_BASE_URL}. Is the backend running?`,
      { cause: networkError }
    );
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  baseUrl: API_BASE_URL,

  getHealth() {
    return request("/api/health");
  },

  getProducts() {
    return request("/api/products");
  },

  // AI Product Assistant — step 1: structured data-quality report.
  getProductQuality() {
    return request("/api/ai/product-quality");
  },

  // AI Product Assistant — step 2: LLM improvement suggestions.
  // Only the product id and requested fields travel to the server; the
  // backend fetches the product itself and never persists during generation.
  getProductSuggestions(id, fields) {
    return request("/api/ai/suggestions", {
      method: "POST",
      body: JSON.stringify({ id, fields }),
    });
  },

  getProduct(id) {
    return request(`/api/products/${id}`);
  },

  createProduct(payload) {
    return request("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateProduct(id, payload) {
    return request(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteProduct(id) {
    return request(`/api/products/${id}`, { method: "DELETE" });
  },

  bulkDelete(ids) {
    return request("/api/products/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  syncProduct(id) {
    return request(`/api/products/${id}/sync`, { method: "POST" });
  },
};

export default api;
