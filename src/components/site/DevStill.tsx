"use client";

import { MotionGlobalConfig } from "motion/react";

// QA helper: "?still" jumps every motion animation to its end state,
// so screenshots can be taken from a background tab where rAF is paused.
if (
  process.env.NODE_ENV !== "production" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("still")
) {
  MotionGlobalConfig.skipAnimations = true;
}

export function DevStill() {
  return null;
}
