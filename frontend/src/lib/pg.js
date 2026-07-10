// Shared helpers for the personal-guarantor (PG) flow, used by both the
// MyInfo review step (PG selection) and the PG verification step.

// A guarantor's age at loan maturity should not exceed this (common bank policy).
export const PG_MAX_AGE_AT_MATURITY = 70;

/** Whole-years age from an ISO date-of-birth string, or null if unparseable. */
export function ageFromDob(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/**
 * Deterministic demo IRAS NOA income keyed off a stable seed (NRIC/name) so the
 * same guarantor always shows the same figure across a session.
 */
export function demoIrasIncome(seedStr) {
  let hash = 0;
  for (let i = 0; i < (seedStr || "").length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  // Range roughly S$60k – S$220k.
  return 60000 + (hash % 160) * 1000;
}

/** Format a number as Singapore dollars, or an em dash when null. */
export function formatSgd(value) {
  if (value == null) return "—";
  return `S$${Number(value).toLocaleString("en-SG")}`;
}
