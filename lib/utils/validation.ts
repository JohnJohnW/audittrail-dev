/**
 * Validation Utilities
 *
 * Functions for validating common data formats.
 */

/**
 * Validates a CUID format string.
 * CUIDs start with 'c' followed by lowercase alphanumeric characters.
 *
 * @param id - String to validate
 * @returns true if the string is a valid CUID
 */
export function isValidCuid(id: string): boolean {
  return /^c[a-z0-9]{20,}$/i.test(id);
}

/**
 * Validates an ISO date string.
 *
 * @param dateStr - String to validate
 * @returns true if the string can be parsed as a valid date
 */
export function isValidDateString(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validates an email address format.
 *
 * @param email - String to validate
 * @returns true if the string is a valid email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates a URL format.
 *
 * @param url - String to validate
 * @returns true if the string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
