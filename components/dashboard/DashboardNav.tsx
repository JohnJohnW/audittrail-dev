"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  RepoIcon,
  ShieldIcon,
  CheckIcon,
  ExportIcon,
  GrcIcon,
  CisoIcon,
  MenuIcon,
  CloseIcon,
} from "./nav/NavIcons";
import { UserMenu } from "./nav/UserMenu";
import { MobileMenu } from "./nav/MobileMenu";
import { AlertBell, AlertsPanel } from "./AlertsPanel";
import type { NavItem, NavUser } from "./nav/types";

interface DashboardNavProps {
  user: NavUser;
}

export function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Poll unread alert count every 5 minutes
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/alerts?resolved=false&limit=1");
        if (res.ok) {
          const data = await res.json();
          setUnreadAlerts(data.unreadCount ?? 0);
        }
      } catch {
        // Silently fail - nav unread count is non-critical
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Memoized navigation items
  const navigation: NavItem[] = useMemo(
    () => [
      { name: "Overview", href: "/dashboard", icon: HomeIcon },
      { name: "Repositories", href: "/repositories", icon: RepoIcon },
      { name: "Evidence", href: "/evidence", icon: ShieldIcon },
      { name: "Compliance", href: "/compliance", icon: CheckIcon },
      { name: "GRC", href: "/grc", icon: GrcIcon },
      { name: "CISO", href: "/ciso", icon: CisoIcon },
      { name: "Exports", href: "/exports", icon: ExportIcon },
    ],
    []
  );

  // Memoized active check function
  const isActive = useCallback(
    (href: string) => {
      if (href === "/dashboard") {
        return pathname === "/dashboard";
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  // Scroll detection for nav styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change - this is intentional to reset
  // menu state when navigating, not a cascading render issue
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (mobileMenuOpen) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMobileMenuOpen(false);
      }
    }
  }, [pathname, mobileMenuOpen]);

  return (
    <>
      <motion.nav
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200/50"
            : "bg-white border-b border-gray-200"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and desktop navigation */}
            <div className="flex items-center min-w-0 shrink-0">
              <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
                <div className="relative w-8 h-8 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-200 shrink-0">
                  <Image
                    src="/icon.svg"
                    alt="Vigil"
                    width={32}
                    height={32}
                    className="rounded-lg w-full h-full"
                    priority
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                  Vigil<span className="text-accent"> Sec</span>
                </span>
              </Link>

              {/* Desktop navigation */}
              <div className="hidden lg:flex ml-6 gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap",
                        active
                          ? "text-accent"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                      )}
                    >
                      <Icon
                        className={cn("w-4 h-4 shrink-0", active ? "text-accent" : "text-gray-400")}
                      />
                      {item.name}
                      {active && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-accent-light/50 rounded-lg -z-10"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side: alerts bell, mobile menu button and user menu */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Alerts bell */}
              <AlertBell unreadCount={unreadAlerts} onClick={() => setAlertsOpen(true)} />

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <CloseIcon className="w-5 h-5" />
                ) : (
                  <MenuIcon className="w-5 h-5" />
                )}
              </button>

              {/* User menu */}
              <UserMenu
                user={user}
                isOpen={userMenuOpen}
                onToggle={() => setUserMenuOpen(!userMenuOpen)}
                onClose={() => setUserMenuOpen(false)}
              />
            </div>
          </div>

          {/* Mobile menu */}
          <MobileMenu
            isOpen={mobileMenuOpen}
            navigation={navigation}
            isActive={isActive}
            onClose={() => setMobileMenuOpen(false)}
          />
        </div>
      </motion.nav>

      {/* Alerts panel - rendered outside nav so it covers the full viewport */}
      <AlertsPanel
        isOpen={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        onUnreadCountChange={setUnreadAlerts}
      />
    </>
  );
}
