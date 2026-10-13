// Small shared formatting helpers.

export function formatPrice(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return "—";
  return `₹${number.toLocaleString("en-IN")}`;
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function formatDateTime(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export function completenessTone(score) {
  if (score >= 100) return "good";
  if (score >= 60) return "warn";
  return "bad";
}
