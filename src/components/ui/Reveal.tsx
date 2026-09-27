"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

type Props = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
  amount?: number;
};

/**
 * Enters once when scrolled into view. The initial state is the same on server and client;
 * under reduced motion the transition just takes no time. No blur: animated filters repaint every frame.
 */
export function Reveal({ delay = 0, y = 16, amount = 0.3, children, ...rest }: Props) {
  const reduce = useSafeReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={reduce ? { duration: 0 } : { duration: 0.7, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
