// Pure catalog query helpers.
// These operate on the actual product objects returned by the backend, so the
// search box, the category/status filters and the sort dropdown all read from a
// single source of truth. Kept free of React so the logic is easy to test.

// Case-insensitive match against product name or SKU.
export function matchesSearch(product, term = "") {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return (
    (product.name || "").toLowerCase().includes(query) ||
    (product.sku || "").toLowerCase().includes(query)
  );
}

export function filterProducts(
  products,
  { search = "", category = "all", status = "all" } = {}
) {
  return products.filter(
    (product) =>
      matchesSearch(product, search) &&
      (category === "all" || product.category === category) &&
      (status === "all" || product.status === status)
  );
}

const SORT_SELECTORS = {
  name: (product) => (product.name || "").toLowerCase(),
  price: (product) => Number(product.price) || 0,
  completeness: (product) => Number(product.completeness) || 0,
};

export function sortProducts(products, sortBy = "name-asc") {
  const [key, direction] = String(sortBy).split("-");
  const select = SORT_SELECTORS[key] || SORT_SELECTORS.name;
  const factor = direction === "desc" ? -1 : 1;
  return [...products].sort((a, b) => {
    const av = select(a);
    const bv = select(b);
    if (av < bv) return -1 * factor;
    if (av > bv) return 1 * factor;
    return 0;
  });
}

// Filter + sort in one call; returns a new array.
export function queryProducts(products, options = {}) {
  const { search = "", category = "all", status = "all", sortBy = "name-asc" } =
    options;
  return sortProducts(filterProducts(products, { search, category, status }), sortBy);
}
