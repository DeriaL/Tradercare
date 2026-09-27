"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * prefers-reduced-motion that is false on the server AND on the first client render,
 * then flips to the real value. Use it for anything that changes markup or inline
 * styles, so hydration never sees a difference.
 */
export function useSafeReducedMotion() {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  useEffect(() => setOn(!!reduce), [reduce]);
  return on;
}
