import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

type ButtonAsButton = BaseButtonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonAsLink = BaseButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-gray-900 text-white border border-transparent",
    "hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-lg",
    "active:translate-y-0 active:shadow-md"
  ),
  secondary: cn(
    "bg-white text-gray-900 border border-gray-200",
    "hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-md",
    "active:translate-y-0 active:shadow-sm"
  ),
  ghost: cn(
    "bg-transparent text-gray-600 border border-transparent",
    "hover:text-gray-900 hover:bg-gray-100",
    "active:bg-gray-200"
  ),
  danger: cn(
    "bg-red-600 text-white border border-transparent",
    "hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/20",
    "active:translate-y-0 active:shadow-md"
  ),
  accent: cn(
    "bg-accent text-white border border-transparent",
    "hover:bg-accent-hover hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/20",
    "active:translate-y-0 active:shadow-md"
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-2.5 text-sm gap-2",
};

const baseStyles = cn(
  "inline-flex items-center justify-center font-medium rounded-lg",
  "transition-all duration-200",
  "focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2",
  "disabled:opacity-50 disabled:pointer-events-none disabled:transform-none disabled:shadow-none"
);

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, className = "", children, ...props },
    ref
  ) => {
    const combinedClassName = cn(baseStyles, variantStyles[variant], sizeStyles[size], className);

    if ("href" in props && props.href) {
      const { href, ...linkProps } = props;
      return (
        <Link
          href={href}
          className={combinedClassName}
          ref={ref as React.Ref<HTMLAnchorElement>}
          {...linkProps}
        >
          {loading && <LoadingSpinner />}
          {children}
        </Link>
      );
    }

    return (
      <button
        className={combinedClassName}
        disabled={loading || (props as ButtonAsButton).disabled}
        ref={ref as React.Ref<HTMLButtonElement>}
        {...(props as ButtonAsButton)}
      >
        {loading && <LoadingSpinner />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default Button;
