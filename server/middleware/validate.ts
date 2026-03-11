// ─── Input Validation & Sanitization Utilities ────────────────────────

/**
 * Strip HTML tags to prevent XSS in stored strings.
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "")       // Strip HTML tags
    .replace(/[<>"'`]/g, "")       // Remove dangerous characters
    .trim();
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

/**
 * Validate a string has content and is within length bounds.
 */
export function isValidString(input: unknown, minLen = 1, maxLen = 500): boolean {
  return typeof input === "string" && input.trim().length >= minLen && input.trim().length <= maxLen;
}

/**
 * Validate a positive number.
 */
export function isPositiveNumber(input: unknown): boolean {
  return typeof input === "number" && Number.isFinite(input) && input > 0;
}

/**
 * Validate a non-negative integer.
 */
export function isNonNegativeInt(input: unknown): boolean {
  return typeof input === "number" && Number.isInteger(input) && input >= 0;
}

/**
 * Validate a positive integer.
 */
export function isPositiveInt(input: unknown): boolean {
  return typeof input === "number" && Number.isInteger(input) && input > 0;
}

/**
 * Validate a date string (YYYY-MM-DD format).
 */
export function isValidDate(input: unknown): boolean {
  if (typeof input !== "string") return false;
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(input)) return false;
  const date = new Date(input);
  return !isNaN(date.getTime());
}

/**
 * Validate a URL string.
 */
export function isValidUrl(input: unknown): boolean {
  if (typeof input !== "string") return false;
  try {
    const url = new URL(input);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate that a value is in an allowed set.
 */
export function isOneOf<T>(input: T, allowed: T[]): boolean {
  return allowed.includes(input);
}
