"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { gauss, mulberry32 } from "@/lib/market";

// Sample quotes, labelled as such on the strip. Never real prices.
const QUOTES = [
  { s: "NAS100", p: 24851.4, d: 1, v: 0.00012 },
  { s: "EURUSD", p: 1.17342, d: 5, v: 0.00005 },
  { s: "XAUUSD", p: 3748.62, d: 2, v: 0.0001 },
  { s: "US30", p: 46312.0, d: 1, v: 0.0001 },
  { s: "GBPUSD", p: 1.34518, d: 5, v: 0.00006 },
  { s: "BTCUSD", p: 112480, d: 0, v: 0.00025 },
  { s: "GER40", p: 23874.5, d: 1, v: 0.0001 },
  { s: "USDJPY", p: 148.214, d: 3, v: 0.00006 },
  { s: "US500", p: 6641.8, d: 1, v: 0.0001 },
  { s: "WTI", p: 64.18, d: 2, v: 0.0002 },
];

// deterministic day change and sparkline per symbol, so server and client agree
const SEEDED = QUOTES.map((q, i) => {
  const r = mulberry32(i * 7919 + 13);
  const pts: number[] = [0];
  for (let k = 1; k < 24; k++) pts.push(pts[k - 1] + gauss(r) + (i % 3 === 0 ? 0.25 : i % 3 === 1 ? -0.2 : 0.05));
  const chg = Math.round(pts[pts.length - 1] * q.v * 1.6 * 1e5) / 1e5;
  const open = q.p / (1 + chg);
  return { ...q, open, pts };
});

const fmt = (v: number, d: number) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (p: number, open: number) => {
  const c = ((p - open) / open) * 100;
  return `${c >= 0 ? "+" : "−"}${Math.abs(c).toFixed(2)}%`;
};

function Spark({ pts, up }: { pts: number[]; up: boolean }) {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  // rounded: Math.log/cos may differ in the last bits between the server and the browser
  const d = pts.map((v, i) => `${((i / (pts.length - 1)) * 40).toFixed(1)},${(13 - ((v - min) / (max - min || 1)) * 12).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 40 14" className={cn("h-3.5 w-10", up ? "text-profit" : "text-loss")} aria-hidden>
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {SEEDED.map((q) => {
        const up = q.p >= q.open;
        return (
          <li key={q.s} data-q={q.s} className="flex items-center gap-2.5 whitespace-nowrap px-5 font-mono text-[12px]">
            <span className="text-ink-2">{q.s}</span>
            <span data-px className="text-ink data-[f=d]:text-loss data-[f=u]:text-profit">
              {fmt(q.p, q.d)}
            </span>
            <span data-pc data-up={up} className="text-[11px] data-[up=false]:text-loss data-[up=true]:text-profit">
              {pct(q.p, q.open)}
            </span>
            <Spark pts={q.pts} up={up} />
          </li>
        );
      })}
    </ul>
  );
}

/** Quote strip along the bottom of the hero: a slow marquee, prices tick and flash. Pauses on hover. */
export function Ticker({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = mulberry32(99);
    const px = SEEDED.map((q) => q.p);
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const id = window.setInterval(() => {
      if (!visible || document.hidden) return;
      for (let n = 0; n < 2; n++) {
        const i = Math.floor(r() * SEEDED.length);
        const q = SEEDED[i];
        const next = Math.max(q.open * 0.97, Math.min(q.open * 1.03, px[i] * (1 + gauss(r) * q.v)));
        const dir = next >= px[i] ? "u" : "d";
        px[i] = next;
        el.querySelectorAll<HTMLElement>(`[data-q="${q.s}"]`).forEach((li) => {
          const p = li.querySelector<HTMLElement>("[data-px]")!;
          const c = li.querySelector<HTMLElement>("[data-pc]")!;
          p.textContent = fmt(next, q.d);
          p.dataset.f = dir;
          c.textContent = pct(next, q.open);
          c.dataset.up = String(next >= q.open);
          // on and off, no colour transition: a fading colour would repaint the whole moving strip every frame
          window.setTimeout(() => delete p.dataset.f, 450);
        });
      }
    }, 900);
    return () => {
      window.clearInterval(id);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={root} className={cn("relative flex h-11 items-center border-t border-ink/[0.07] bg-bg", className)}>
      <span className="z-raised flex h-full shrink-0 items-center gap-2 border-r border-ink/[0.07] bg-bg pl-4 pr-4 font-mono text-[10.5px] uppercase tracking-[0.08em] text-faint sm:pl-6 lg:pl-8">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        Демо-котирування
      </span>
      <div className="group relative h-full flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_4%,black_96%,transparent)]">
        <div className="ticker-track flex h-full w-max items-center group-hover:[animation-play-state:paused]">
          <Row />
          <Row hidden />
        </div>
      </div>
    </div>
  );
}
