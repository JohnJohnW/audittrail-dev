/**
 * Design Tokens
 *
 * Centralized design values for consistent styling across the application.
 * These tokens should be used instead of hardcoded values.
 */

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Accent colors - The primary brand color (orange)
 * Use for: primary actions, highlights, emphasis, chart elements
 */
export const accent = {
  DEFAULT: "#ff6b35",
  light: "#fff4f0",
  hover: "#e55a2b",
  muted: "#ffb299",
} as const;

/**
 * Gray scale - For text, borders, and backgrounds
 * Aligned with Tailwind's gray palette
 */
export const gray = {
  50: "#fafafa",
  100: "#f5f5f5",
  200: "#e5e5e5",
  300: "#d4d4d4",
  400: "#a3a3a3",
  500: "#6b7280",
  600: "#4b5563",
  700: "#374151",
  800: "#1f2937",
  900: "#111827",
} as const;

/**
 * Status colors - ONLY for explicit status indicators
 * Use sparingly for badges, alerts, and status indicators
 * Do NOT use for decorative purposes or to differentiate similar elements
 */
export const status = {
  success: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    hex: "#15803d", // green-700
  },
  warning: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    hex: "#a16207", // yellow-700
  },
  error: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    hex: "#b91c1c", // red-700
  },
} as const;

/**
 * Chart colors - Monochromatic orange palette for data visualization
 * Use these instead of rainbow colors for a cohesive, professional look
 */
export const chart = {
  primary: "#ff6b35", // accent - main data
  secondary: "#ffb299", // accent-muted - secondary data
  tertiary: "#ffd4c4", // lighter - tertiary data
  quaternary: "#fff4f0", // accent-light - backgrounds/fills
  // For line charts that need distinction without color
  gray: "#9ca3af", // gray-400 - comparison/baseline data
} as const;

/**
 * Progress bar colors based on score thresholds
 * Use for compliance scores, progress indicators
 */
export const progress = {
  high: "#ff6b35", // accent - score >= 70%
  medium: "#ffb299", // accent-muted - score 40-69%
  low: "#ffd4c4", // lighter accent - score < 40%
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const typography = {
  // Font sizes with line heights
  display: "text-4xl sm:text-5xl font-semibold tracking-tight leading-tight",
  h1: "text-2xl sm:text-3xl font-semibold tracking-tight",
  h2: "text-xl sm:text-2xl font-semibold tracking-tight",
  h3: "text-lg sm:text-xl font-semibold",
  h4: "text-base sm:text-lg font-semibold",
  body: "text-sm sm:text-base text-gray-600",
  bodySmall: "text-xs sm:text-sm text-gray-500",
  label: "text-sm font-medium text-gray-700",
  caption: "text-xs text-gray-400",
} as const;

// =============================================================================
// SPACING
// =============================================================================

export const spacing = {
  // Section spacing
  sectionY: "py-6 sm:py-8 lg:py-12",
  sectionX: "px-4 sm:px-6 lg:px-8",

  // Card padding
  cardPadding: "p-4 sm:p-6",
  cardPaddingSmall: "p-3 sm:p-4",

  // Gap between elements
  gapSmall: "gap-2 sm:gap-3",
  gapMedium: "gap-3 sm:gap-4",
  gapLarge: "gap-4 sm:gap-6",
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const shadows = {
  card: "shadow-sm",
  cardHover: "shadow-md",
  cardElevated: "shadow-lg",
  dropdown: "shadow-lg",
} as const;

// =============================================================================
// BORDERS
// =============================================================================

export const borders = {
  default: "border border-gray-200",
  subtle: "border border-gray-100",
  accent: "border-2 border-accent/20",
  radius: {
    small: "rounded-lg",
    medium: "rounded-xl",
    large: "rounded-2xl",
    full: "rounded-full",
  },
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

export const transitions = {
  fast: "transition-all duration-150",
  default: "transition-all duration-200",
  slow: "transition-all duration-300",
} as const;

// =============================================================================
// CHART STYLING (for Recharts)
// =============================================================================

export const chartStyles = {
  grid: {
    strokeDasharray: "3 3",
    stroke: "#f3f4f6", // gray-100
  },
  axis: {
    tick: { fill: "#6b7280", fontSize: 12 }, // gray-500
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    },
  },
  bar: {
    radius: [4, 4, 0, 0] as [number, number, number, number],
  },
} as const;
