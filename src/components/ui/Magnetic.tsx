"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Pulls its child toward the cursor while the pointer is over it, then springs back.
 * Mouse only; touch and reduced motion get a plain wrapper.
 */
export function Magnetic({ children, strength = 0.28, className }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });

  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  function leave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} style={{ x: sx, y: sy }} className={cn("inline-block", className)}>
      {children}
    </motion.div>
  );
}
