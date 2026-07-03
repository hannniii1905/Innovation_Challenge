// Shared formatting and labeling helpers.

// Workflow stages reported by the backend (see src/api/schemas.py).
export const STAGE = {
  UPLOADED: "uploaded",
  EXTRACTING: "extracting",
  AWAITING_VERIFICATION: "awaiting_verification",
  ANALYZING: "analyzing",
  COMPLETED: "completed",
  FAILED: "failed",
};

const sgd = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plain = new Intl.NumberFormat("en-SG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as SGD currency with thousands separators. */
export function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return sgd.format(n);
}

/** Format a number with thousands separators (no currency symbol). */
export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return plain.format(n);
}

const BANK_LABELS = {
  DBS: "DBS Bank",
  OCBC: "OCBC Bank",
  MAYBANK: "Maybank",
  UOB: "United Overseas Bank",
  IRAS_NOA: "IRAS Notice of Assessment",
};

/** Turn a backend document-type / bank identifier into a friendly label. */
export function humanizeDocType(docType) {
  if (!docType) return "Document";
  return BANK_LABELS[docType] || docType;
}

/** Humanize a credit-kiting pattern identifier, e.g. circular_fund_movement. */
export function humanizePattern(pattern) {
  if (!pattern) return "Finding";
  return pattern
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const IRAS_NOA = "IRAS_NOA";
