/**
 * Math Utilities
 *
 * Common mathematical operations and array helpers.
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

/**
 * Splits an array into chunks of a specified size.
 *
 * @param array - Array to split
 * @param size - Maximum chunk size
 * @returns Array of chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}
