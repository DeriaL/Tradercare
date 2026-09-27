"use client";

import { useEffect, useState } from "react";

/** Media query as state. false on the server and first render, then the real value. */
export function useMedia(query: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const set = () => setOn(m.matches);
    set();
    m.addEventListener("change", set);
    return () => m.removeEventListener("change", set);
  }, [query]);
  return on;
}
