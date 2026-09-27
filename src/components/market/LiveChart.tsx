"use client";

import { HandGrab, MousePointer2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { ChartEngine, fmtPrice, type ChartLayout, type CursorState, type LegendData, type TradeEvent } from "./engine";

type Props = {
  layout: ChartLayout;
  onTrade?: (e: TradeEvent) => void;
  onPnl?: (pnl: number, open: boolean) => void;
  /** element whose pointer moves drive the crosshair (the chart may sit under other content) */
  hoverRoot?: React.RefObject<HTMLElement | null>;
  className?: string;
  legendClassName?: string;
};

/**
 * Live candlestick chart on canvas with a TradingView-style legend and the hand that drags the stop.
 * Ticks only while on screen and the tab is visible; reduced motion gets one still frame.
 */
export function LiveChart({ layout, onTrade, onPnl, hoverRoot, className, legendClassName }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ChartEngine | null>(null);
  const hand = useRef<HTMLDivElement>(null);
  const lg = {
    time: useRef<HTMLSpanElement>(null),
    o: useRef<HTMLSpanElement>(null),
    h: useRef<HTMLSpanElement>(null),
    l: useRef<HTMLSpanElement>(null),
    c: useRef<HTMLSpanElement>(null),
    chg: useRef<HTMLSpanElement>(null),
    vals: useRef<HTMLDivElement>(null),
  };
  const cb = useRef({ onTrade, onPnl });
  cb.current = { onTrade, onPnl };
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const eng = new ChartEngine(cv, layoutRef.current);
    engine.current = eng;

    eng.on({
      trade: (e) => cb.current.onTrade?.(e),
      pnl: (v, open) => cb.current.onPnl?.(v, open),
      legend: (d: LegendData) => {
        const { candle: k, prev, time } = d;
        const set = (r: React.RefObject<HTMLSpanElement | null>, s: string) => {
          if (r.current && r.current.textContent !== s) r.current.textContent = s;
        };
        set(lg.time, time);
        set(lg.o, fmtPrice(k.o));
        set(lg.h, fmtPrice(k.h));
        set(lg.l, fmtPrice(k.l));
        set(lg.c, fmtPrice(k.c));
        const ch = k.c - prev;
        set(lg.chg, `${ch >= 0 ? "+" : "−"}${fmtPrice(Math.abs(ch))} (${ch >= 0 ? "+" : "−"}${Math.abs((ch / prev) * 100).toFixed(2)}%)`);
        if (lg.vals.current) lg.vals.current.dataset.dir = k.c >= k.o ? "up" : "down";
      },
      cursor: (s: CursorState) => {
        const n = hand.current;
        if (!n) return;
        n.dataset.mode = s.mode;
        if (s.mode !== "hidden") n.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
      },
    });

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      eng.resize(width, height);
    });
    ro.observe(el);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let onScreen = false;
    let introDone = false;
    const sync = () => {
      if (!reduce && onScreen && !document.hidden) {
        eng.start(!introDone);
        introDone = true;
      } else eng.stop();
    };
    let io: IntersectionObserver | null = null;
    if (reduce) eng.still();
    else {
      io = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        sync();
      });
      io.observe(el);
      document.addEventListener("visibilitychange", sync);
    }
    // canvas text needs the mono face; redraw once it is in
    document.fonts?.ready.then(() => eng.readTheme());

    const root = hoverRoot?.current ?? el;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if ((e.target as Element | null)?.closest?.("[data-nocross]")) return eng.setHover(null);
      const r = cv.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      eng.setHover(x >= 0 && y >= 0 && x <= r.width && y <= r.height ? { x, y } : null);
    };
    const leave = () => eng.setHover(null);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", leave);

    return () => {
      eng.stop();
      ro.disconnect();
      io?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      engine.current = null;
    };
    // the engine lives for the component's lifetime; layout changes go through setLayout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engine.current?.setLayout(layout);
  }, [layout]);

  return (
    <div ref={box} className={cn("relative", className)}>
      {/* own compositor layer: a tick re-uploads the canvas instead of repainting the page under it */}
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full will-change-transform" />

      {/* legend, the way a terminal prints it */}
      <div className={cn("pointer-events-none absolute font-mono text-[11px] leading-5", legendClassName)}>
        <div className="flex flex-wrap items-center gap-x-2 text-ink-2">
          <span className="text-[12.5px] font-semibold text-ink">NAS100</span>
          <span className="text-faint">·</span>
          <span>1м</span>
          <span className="hidden text-faint sm:inline">·</span>
          <span ref={lg.time} className="hidden text-muted sm:inline">
            10:14
          </span>
          <span className="rounded bg-ink/[0.06] px-1.5 text-[10.5px] text-muted">реплей ×30 · демо-дані</span>
        </div>
        <div ref={lg.vals} data-dir="up" className="group/v flex flex-wrap gap-x-3 text-faint">
          <span>
            O <span ref={lg.o} className="group-data-[dir=down]/v:text-loss group-data-[dir=up]/v:text-profit" />
          </span>
          <span>
            H <span ref={lg.h} className="group-data-[dir=down]/v:text-loss group-data-[dir=up]/v:text-profit" />
          </span>
          <span>
            L <span ref={lg.l} className="group-data-[dir=down]/v:text-loss group-data-[dir=up]/v:text-profit" />
          </span>
          <span>
            C <span ref={lg.c} className="group-data-[dir=down]/v:text-loss group-data-[dir=up]/v:text-profit" />
          </span>
          <span ref={lg.chg} className="hidden group-data-[dir=down]/v:text-loss group-data-[dir=up]/v:text-profit sm:inline" />
        </div>
      </div>

      {/* the trader's hand */}
      <div
        ref={hand}
        data-mode="hidden"
        aria-hidden
        className="group/hand pointer-events-none absolute left-0 top-0 opacity-100 transition-opacity duration-200 data-[mode=hidden]:opacity-0"
      >
        <MousePointer2
          className="absolute left-[-3px] top-[-3px] h-[22px] w-[22px] fill-ink text-bg opacity-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)] group-data-[mode=point]/hand:opacity-100"
          strokeWidth={1.6}
        />
        <HandGrab
          className="absolute left-[-11px] top-[-7px] h-[22px] w-[22px] text-ink opacity-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] group-data-[mode=grab]/hand:opacity-100"
          strokeWidth={2}
        />
      </div>
    </div>
  );
}
