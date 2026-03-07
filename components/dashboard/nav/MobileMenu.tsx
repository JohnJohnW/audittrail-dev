"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavItem } from "./types";

interface MobileMenuProps {
  isOpen: boolean;
  navigation: NavItem[];
  isActive: (href: string) => boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, navigation, isActive, onClose }: MobileMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="lg:hidden overflow-hidden"
        >
          <div className="py-3 border-t border-gray-100">
            <div className="flex flex-col gap-0.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-accent-light/50 text-accent font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <Icon
                      className={cn("w-4 h-4 shrink-0", active ? "text-accent" : "text-gray-400")}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
