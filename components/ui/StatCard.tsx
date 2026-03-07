"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  /** The main value to display (number or formatted string) */
  value: string | number;
  /** Label describing what the value represents */
  label: string;
  /** Optional subtitle for additional context */
  subtitle?: string;
  /** Optional icon to display */
  icon?: ReactNode;
  /** Whether to highlight this card with accent styling */
  highlight?: boolean;
  /** Additional className for customization */
  className?: string;
}

/**
 * StatCard - A consistent stat/metric card component
 *
 * Features:
 * - Equal height when used in a grid with items-stretch
 * - Consistent accent color for values (professional, cohesive look)
 * - Optional icon and subtitle for richer display
 * - Subtle hover animation
 * - Responsive padding
 *
 * Usage:
 * ```tsx
 * // Simple usage
 * <StatCard value={42} label="Total Items" />
 *
 * // With icon and subtitle
 * <StatCard
 *   value="1,234"
 *   label="Commits"
 *   subtitle="collected"
 *   icon={<CommitIcon />}
 * />
 *
 * // Highlighted (call-to-action)
 * <StatCard value="Free" label="Current Plan" highlight />
 * ```
 */
export function StatCard({
  value,
  label,
  subtitle,
  icon,
  highlight = false,
  className,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)" }}
      transition={{ duration: 0.2 }}
      className={cn(
        // Base styles - h-full ensures equal height in grid
        "h-full flex flex-col rounded-xl border shadow-sm transition-all",
        // Responsive padding
        "p-4 sm:p-5",
        // Conditional styling based on highlight
        highlight
          ? "border-accent/30 bg-gradient-to-br from-accent-light/50 to-white"
          : "border-gray-200 bg-white",
        className
      )}
    >
      {/* Icon (optional) */}
      {icon && (
        <div className="mb-3">
          <div
            className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center",
              highlight ? "bg-accent/10 text-accent" : "bg-gray-100 text-gray-500"
            )}
          >
            {icon}
          </div>
        </div>
      )}

      {/* Value - always accent color for consistency */}
      <p
        className={cn(
          "font-bold text-accent",
          icon ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
        )}
      >
        {value}
      </p>

      {/* Label */}
      <p className={cn("text-gray-600 mt-1", icon ? "text-xs sm:text-sm font-medium" : "text-sm")}>
        {label}
      </p>

      {/* Subtitle (optional) */}
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}

/**
 * StatCardGrid - Container for StatCards that ensures equal heights
 *
 * Usage:
 * ```tsx
 * <StatCardGrid>
 *   <StatCard value={1} label="One" />
 *   <StatCard value={2} label="Two" />
 * </StatCardGrid>
 * ```
 */
interface StatCardGridProps {
  children: ReactNode;
  /** Number of columns at different breakpoints */
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  className?: string;
}

export function StatCardGrid({
  children,
  columns = { default: 2, sm: 2, md: 3, lg: 4 },
  className,
}: StatCardGridProps) {
  const gridCols = cn(
    columns.default === 1 && "grid-cols-1",
    columns.default === 2 && "grid-cols-2",
    columns.default === 3 && "grid-cols-3",
    columns.default === 4 && "grid-cols-4",
    columns.sm === 2 && "sm:grid-cols-2",
    columns.sm === 3 && "sm:grid-cols-3",
    columns.sm === 4 && "sm:grid-cols-4",
    columns.md === 3 && "md:grid-cols-3",
    columns.md === 4 && "md:grid-cols-4",
    columns.md === 5 && "md:grid-cols-5",
    columns.lg === 4 && "lg:grid-cols-4",
    columns.lg === 5 && "lg:grid-cols-5"
  );

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        // items-stretch ensures equal height
        "items-stretch",
        gridCols,
        className
      )}
    >
      {children}
    </div>
  );
}

export default StatCard;
