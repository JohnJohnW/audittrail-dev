import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "accent";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-yellow-50 text-yellow-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  accent: "bg-accent-light text-accent",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-gray-400",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  info: "bg-blue-500",
  accent: "bg-accent",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}

// Status-specific badges for common use cases
interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "error" | "synced" | "not_synced";
  className?: string;
}

const statusConfig: Record<
  StatusBadgeProps["status"],
  { variant: BadgeVariant; label: string; dot: boolean }
> = {
  active: { variant: "success", label: "Active", dot: true },
  inactive: { variant: "default", label: "Inactive", dot: true },
  pending: { variant: "warning", label: "Pending", dot: true },
  error: { variant: "error", label: "Error", dot: true },
  synced: { variant: "success", label: "Synced", dot: false },
  not_synced: { variant: "warning", label: "Not synced", dot: false },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} dot={config.dot} className={className}>
      {config.label}
    </Badge>
  );
}

// Plan badges
interface PlanBadgeProps {
  plan: "free" | "pro" | "enterprise";
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const config = {
    free: { variant: "default" as BadgeVariant, label: "Free" },
    pro: { variant: "accent" as BadgeVariant, label: "Pro" },
    enterprise: { variant: "info" as BadgeVariant, label: "Enterprise" },
  };

  return (
    <Badge variant={config[plan].variant} className={className}>
      {config[plan].label}
    </Badge>
  );
}
