"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type Props = {
  value: number;
  format: (v: number) => string;
  duration?: number;
  delay?: number;
  /** start counting only when visible */
  inView?: boolean;
  from?: number;
  className?: string;
};

/**
 * Tweens between values by writing textContent directly,
 * so a counting number never re-renders React.
 */
export function Counter({ value, format, duration = 1.4, delay = 0, inView = true, from = 0, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const current = useRef(from);
  const started = useRef(false);
  const fmt = useRef(format);
  fmt.current = format;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = fmt.current(value);
      current.current = value;
      return;
    }
    if (inView && !seen) return;
    const first = !started.current;
    started.current = true;
    const controls = animate(current.current, value, {
      duration,
      delay: first ? delay : 0,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        current.current = v;
        el.textContent = fmt.current(v);
      },
    });
    return () => controls.stop();
  }, [value, seen, inView, reduce, duration, delay]);

  return (
    <span ref={ref} className={className}>
      {format(from)}
    </span>
  );
}
