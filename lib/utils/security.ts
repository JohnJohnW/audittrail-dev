/**
 * Security Utilities
 *
 * Functions for sanitizing and escaping user input.
 */

/**
 * Escapes HTML special characters to prevent XSS/HTML injection.
 *
 * @param unsafe - Untrusted string to escape
 * @returns Escaped string safe for HTML output
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Escapes a string for use in CSV fields.
 * Wraps in quotes and escapes internal quotes if needed.
 *
 * @param value - String to escape
 * @returns CSV-safe string
 */
export function escapeCSV(value: string): string {
  if (!value) return "";
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
