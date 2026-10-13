// Data-quality helpers.
// The required-field list mirrors the completeness rules the backend applies
// (see REQUIRED_FIELDS in server/server.js), so the UI can explain exactly
// what is missing and how to fix it.

export const REQUIRED_FIELD_LABELS = {
  name: "Product name",
  sku: "SKU",
  description: "Description",
  price: "Price",
  category: "Category",
  image: "Product image",
};

const REQUIRED_FIELD_HINTS = {
  name: "Give the product a clear, descriptive name.",
  sku: "Add a unique SKU so the product can be identified in your store.",
  description: "Write a short description of what the product is.",
  price: "Set a price of 0 or more.",
  category: "Assign a category so the product is easy to find.",
  image: "Add an image URL so the product shows a thumbnail.",
};

export function missingFieldLabel(field) {
  return REQUIRED_FIELD_LABELS[field] || field;
}

export function missingFieldHint(field) {
  return REQUIRED_FIELD_HINTS[field] || `Provide a value for ${field}.`;
}

// Turns ["image", "description"] into [{ field, label, hint }, ...].
export function missingFieldGuidance(fields = []) {
  return fields.map((field) => ({
    field,
    label: missingFieldLabel(field),
    hint: missingFieldHint(field),
  }));
}
