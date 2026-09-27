"use client";

import Lenis from "lenis";
import { motion, useScroll, useSpring } from "motion/react";
import { useEffect } from "react";

let instance: Lenis | null = null;

/** Scroll the page to an absolute y, through Lenis when it runs so the two never fight. */
export function scrollToY(y: number, smooth = true) {
  if (instance) instance.scrollTo(y, { immediate: !smooth });
  else window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
}

/**
 * Inertial scrolling for the whole page. Lenis drives the native scroll position,
 * so every motion useScroll keeps working. Off for reduced motion and touch-only devices.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.1, anchors: { offset: -(nav + 24) } });
    instance = lenis;
    document.documentElement.classList.add("has-lenis");
    return () => {
      instance = null;
      lenis.destroy();
      document.documentElement.classList.remove("has-lenis");
    };
  }, []);
  return null;
}

/** Thin lime line on the top edge: how far through the page you are. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="pointer-events-none fixed inset-x-0 top-0 z-overlay h-[2px] origin-left bg-accent motion-reduce:hidden"
    />
  );
}
