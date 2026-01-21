/**
 * Navigation Types
 */

export interface NavItem {
  name: string;
  href: string;
  icon: React.FC<{ className?: string }>;
}

export interface NavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
