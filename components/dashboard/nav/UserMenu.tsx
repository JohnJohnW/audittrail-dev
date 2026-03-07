"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SettingsIcon, LogoutIcon, ChevronDownIcon } from "./NavIcons";

interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function UserMenu({ user, isOpen, onToggle, onClose }: UserMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 text-sm p-1.5 rounded-lg transition-all duration-200",
          isOpen ? "bg-gray-100" : "hover:bg-gray-100"
        )}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-accent-light to-accent/20 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
          {user.image ? (
            <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <span className="text-sm text-accent font-semibold">
              {user.name?.[0] || user.email?.[0] || "U"}
            </span>
          )}
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.name || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
              </div>
              <div className="py-1">
                <DropdownLink href="/settings" icon={SettingsIcon} onClick={onClose}>
                  Settings
                </DropdownLink>
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LogoutIcon className="w-4 h-4 text-gray-400" />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DropdownLinkProps {
  href: string;
  icon: React.FC<{ className?: string }>;
  onClick: () => void;
  children: React.ReactNode;
}

function DropdownLink({ href, icon: Icon, onClick, children }: DropdownLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <Icon className="w-4 h-4 text-gray-400" />
      {children}
    </Link>
  );
}
