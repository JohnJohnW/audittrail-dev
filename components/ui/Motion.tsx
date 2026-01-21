"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import {
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  fadeIn,
  scaleIn,
  staggerContainer,
  staggerContainerFast,
  staggerItem,
  pageTransition,
  defaultTransition,
  slowReveal,
} from "@/lib/animations";
import type { Variants } from "framer-motion";

// ============================================
// FadeIn Component - Animates children on mount
// ============================================

type FadeInDirection = "up" | "down" | "left" | "right" | "none" | "scale";

interface FadeInProps {
  children: ReactNode;
  direction?: FadeInDirection;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
}

const directionVariants: Record<FadeInDirection, Variants> = {
  up: fadeInUp,
  down: fadeInDown,
  left: fadeInLeft,
  right: fadeInRight,
  none: fadeIn,
  scale: scaleIn,
};

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  duration = 0.5,
  className,
  once = true,
}: FadeInProps) {
  return (
    <motion.div
      variants={directionVariants[direction]}
      initial="initial"
      whileInView="animate"
      viewport={{ once, margin: "-50px" }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// Stagger Components - For list animations
// ============================================

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  fast?: boolean;
  delay?: number;
}

export function StaggerContainer({
  children,
  className,
  fast = false,
  delay = 0,
}: StaggerContainerProps) {
  const variants = fast ? staggerContainerFast : staggerContainer;

  return (
    <motion.div
      variants={variants}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delayChildren: delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItem} transition={defaultTransition} className={className}>
      {children}
    </motion.div>
  );
}

// ============================================
// Page Transition - Wraps page content
// ============================================

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={defaultTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// AnimatedList - Staggers list items
// ============================================

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({ children, className, staggerDelay = 0.1 }: AnimatedListProps) {
  return (
    <motion.ul
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
      variants={{
        initial: {},
        animate: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.ul>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return (
    <motion.li variants={staggerItem} transition={defaultTransition} className={className}>
      {children}
    </motion.li>
  );
}

// ============================================
// Reveal - Reveals on scroll
// ============================================

interface RevealProps {
  children: ReactNode;
  className?: string;
  width?: "fit" | "full";
}

export function Reveal({ children, className, width = "fit" }: RevealProps) {
  return (
    <div className={width === "fit" ? "w-fit" : "w-full"}>
      <motion.div
        variants={fadeInUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
        transition={slowReveal}
        className={className}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ============================================
// Presence - For conditional rendering with animation
// ============================================

interface PresenceProps {
  children: ReactNode;
  show: boolean;
  mode?: "wait" | "sync" | "popLayout";
}

export function Presence({ children, show, mode = "wait" }: PresenceProps) {
  return (
    <AnimatePresence mode={mode}>
      {show && (
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={defaultTransition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// HoverScale - Scale on hover
// ============================================

interface HoverScaleProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export function HoverScale({ children, className, scale = 1.02 }: HoverScaleProps) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// CountUp - Animated number counter
// ============================================

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export function CountUp({
  value,
  duration = 1,
  className,
  suffix = "",
  prefix = "",
}: CountUpProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.span initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        {prefix}
        <motion.span
          initial={{ count: 0 }}
          whileInView={{ count: value }}
          viewport={{ once: true }}
          transition={{ duration, ease: "easeOut" }}
        >
          {/* Note: For actual count animation, use a library like react-countup */}
          {value}
        </motion.span>
        {suffix}
      </motion.span>
    </motion.span>
  );
}

// Re-export AnimatePresence for convenience
export { AnimatePresence };
