"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { SESSIONS, fmtDuration, sessionStatus } from "@/lib/market";

/**
 * The three FX sessions from the visitor's real clock: open or closed and how long until that changes.
 * Server render and first paint show names only, the clock fills in after mount.
 */
export function Sessions({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 20_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <ul className={cn("flex items-center gap-x-5 gap-y-1 font-mono text-[11px] leading-5", className)} aria-label="Торгові сесії">
      {SESSIONS.map((s) => {
        const st = now ? sessionStatus(s, now) : null;
        return (
          <li key={s.id} className="flex items-center gap-2 whitespace-nowrap">
            <span className="relative flex h-1.5 w-1.5">
              {st?.open && <span className="absolute inset-0 animate-ping rounded-full bg-profit/60 motion-reduce:hidden" />}
              <span className={cn("relative h-1.5 w-1.5 rounded-full", st?.open ? "bg-profit" : "bg-faint")} />
            </span>
            <span className="text-ink-2">{s.name}</span>
            {st && (
              <span className="text-faint">
                {compact ? `${st.open ? "ще" : "за"} ${fmtDuration(st.minutes)}` : st.open ? `до закриття ${fmtDuration(st.minutes)}` : `відкриття через ${fmtDuration(st.minutes)}`}
                <span className="sr-only">{st.open ? ", сесія відкрита" : ", сесія закрита"}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
