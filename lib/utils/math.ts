/**
 * Math Utilities
 *
 * Common mathematical operations.
 */

/**
 * Clamps a number between min and max values.
 *
 * @param value - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Rounds a number to a specified number of decimal places.
 *
 * @param value - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded value
 */
export function round(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calculates the percentage of a value relative to a total.
 *
 * @param value - The part value
 * @param total - The total value
 * @returns Percentage (0-100)
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return round((value / total) * 100, 1);
}
