"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Counter } from "@/components/ui/Counter";
import { cn } from "@/lib/cn";
import { linePath, project } from "@/lib/chart";
import { ACCOUNT, MISTAKES, TRADES, equitySeries, fmtUsd, mistakeCost, type MistakeId } from "@/lib/demo";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;
const IDS = Object.keys(MISTAKES) as MistakeId[];
const N = TRADES.length;

// chart space: the svg stretches to any width, so everything else is placed in % of it
const W = 1000;
const H = 300;
const PAD_T = 18;
const PAD_B = 78; // the bottom band holds the per-trade P&L bars, like a volume pane
const MIN = 98_800;
const MAX = 112_400;
const BOX = { w: W, h: H, padTop: PAD_T, padBottom: PAD_B, min: MIN, max: MAX };

// equity moves in straight segments, trade to trade: no smoothing, it is money
const ACTUAL = equitySeries(); // N + 1 points: the start balance, then after every trade
const ACTUAL_PTS = project(ACTUAL, BOX);
const ACTUAL_LINE = linePath(ACTUAL_PTS);
const ACTUAL_BACK = linePath([...ACTUAL_PTS].reverse()).replace(/^M/, "L");

// P&L bars around a zero line at the bottom of the chart
const BAR_ZERO = H - 27;
const BAR_MAX = 22;
const BIGGEST = Math.max(...TRADES.map((t) => Math.abs(t.pnl)));
const BARS = TRADES.map((t, i) => {
  const h = Math.max(1.5, (Math.abs(t.pnl) / BIGGEST) * BAR_MAX);
  const slot = W / N;
  return { x: i * slot + slot * 0.2, w: slot * 0.6, y: t.pnl >= 0 ? BAR_ZERO - h : BAR_ZERO, h, t };
});

const MARKERS = TRADES.map((t, i) => ({ t, i: i + 1 })).filter((m) => m.t.mistake);
const TICKS = [1, 8, 15, 22, 30].map((d) => {
  const i = TRADES.findIndex((t) => t.day >= d);
  return { d, x: d === 1 ? 0 : ((i + 1) / N) * 100 };
});
const COSTS = Object.fromEntries(IDS.map((id) => [id, mistakeCost(id)])) as Record<MistakeId, { cost: number; count: number }>;
const TOTAL = IDS.reduce((s, id) => s + COSTS[id].cost, 0);

// static, hoisted: the section re-renders on every trade of the scrub, the bars never change
const BAR_LAYER = (
  <g>
    <line x1={0} x2={W} y1={BAR_ZERO} y2={BAR_ZERO} stroke="oklch(var(--ink) / 0.1)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    {BARS.map((b, i) => (
      <rect
        key={i}
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        fill={b.t.mistake ? "oklch(var(--warn))" : b.t.pnl >= 0 ? "oklch(var(--profit) / 0.6)" : "oklch(var(--loss) / 0.6)"}
      />
    ))}
  </g>
);

const xPct = (i: number) => (i / N) * 100;
const yPct = (v: number) => ((PAD_T + (1 - (v - MIN) / (MAX - MIN)) * (H - PAD_T - PAD_B)) / H) * 100;
const dayAt = (i: number) => TRADES[Math.max(0, i - 1)].day;
const money = (v: number) => fmtUsd(-v);
const signed = (v: number) => fmtUsd(v, { sign: true });

/**
 * The month as a scroll: the section pins and the reader's scroll is the playhead.
 * Both equity curves draw trade by trade, each broken rule drops a marker with its price,
 * and the running cost ticks up. At the end the rules become switches.
 */
export function DeviationCost() {
  const root = useRef<HTMLElement>(null);
  const reduce = useSafeReducedMotion();
  const [fixed, setFixed] = useState<Set<MistakeId>>(() => new Set(IDS));
  const [idx, setIdx] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end end"] });
  const scrub = useTransform(scrollYProgress, [0.05, 0.8], [0, 1], { clamp: true });
  const one = useMotionValue(1);
  const t = reduce ? one : scrub;

  useMotionValueEvent(scrub, "change", (v) => {
    if (!reduce) setIdx(Math.round(v * N));
  });
  useEffect(() => {
    if (reduce) setIdx(N);
  }, [reduce]);

  const headX = useTransform(t, (v) => `${v * 100}%`);
  const done = idx >= N;

  const rules = useMemo(() => {
    const v = equitySeries(fixed);
    const line = linePath(project(v, BOX));
    return { v, line, band: `${line}${ACTUAL_BACK}Z` };
  }, [fixed]);

  const actualNet = ACTUAL[idx] - ACCOUNT.start;
  const rulesNet = rules.v[idx] - ACCOUNT.start;
  const cost = rulesNet - actualNet;
  const last = done ? null : [...MARKERS].reverse().find((m) => m.i <= idx) ?? null;

  const toggle = (id: MistakeId) =>
    setFixed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section ref={root} id="cost" className="relative h-[260vh] lg:h-[320vh] motion-reduce:!h-auto">
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden pb-5 pt-[calc(var(--nav-h)+1.75rem)] sm:pb-8 lg:pt-[calc(var(--nav-h)+2.75rem)] [@media(min-width:640px)_and_(max-height:820px)]:pt-[calc(var(--nav-h)+1.5rem)] [@media(min-width:640px)_and_(max-height:820px)]:pb-5 motion-reduce:!static motion-reduce:!h-auto motion-reduce:!py-24">
        {/* header: the question, and the bill running up */}
        <div className="container-page flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-[46rem]">
            <h2 className="t-h2 text-[clamp(1.6rem,1.05rem+2.5vw,3.25rem)] [@media(min-width:640px)_and_(max-height:820px)]:text-[2.25rem]">Скільки коштує порушити власне правило?</h2>
            <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2 sm:mt-4 sm:text-base [@media(max-width:639px)_and_(max-height:760px)]:hidden">
              Вересень демо-трейдера: {N} угоди, {MARKERS.length} з них поза правилами. Гортай, і місяць пройде угода за угодою.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 sm:flex-nowrap sm:gap-12">
            <div>
              <div className="text-[13px] text-muted">Ціна відхилень</div>
              <div className="num mt-1 text-[clamp(2.25rem,1.3rem+3.2vw,4.25rem)] whitespace-nowrap font-semibold leading-none tracking-[-0.035em] text-loss">
                <Counter value={cost} format={money} inView={false} from={0} duration={0.45} />
              </div>
            </div>
            <dl className="flex w-full flex-wrap gap-x-4 gap-y-1 text-[13px] sm:block sm:w-auto sm:shrink-0 sm:space-y-2">
              <div className="flex items-center gap-2 sm:justify-between sm:gap-5">
                <dt className="flex items-center gap-2 whitespace-nowrap text-muted">
                  <span className="h-0.5 w-4 rounded-full bg-ink-2" aria-hidden />
                  Фактично
                </dt>
                <dd className="num font-medium text-ink">{signed(actualNet)}</dd>
              </div>
              <div className="flex items-center gap-2 sm:justify-between sm:gap-5">
                <dt className="flex items-center gap-2 whitespace-nowrap text-muted">
                  <span className="h-0.5 w-4 rounded-full bg-accent" aria-hidden />
                  За правилами
                </dt>
                <dd className="num font-medium text-accent">{signed(rulesNet)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <p className="sr-only">
          За {ACCOUNT.month} порушення правил коштували {fmtUsd(TOTAL)}: фактично {signed(ACTUAL[N] - ACCOUNT.start)}, за правилами{" "}
          {signed(ACTUAL[N] - ACCOUNT.start + TOTAL)}.
        </p>

        {/* the chart runs edge to edge */}
        <div className="relative mt-auto px-4 pt-9 sm:px-8 sm:pt-10 [@media(min-width:640px)_and_(max-height:820px)]:pt-8" aria-hidden>
          <div className="relative h-[23svh] min-h-[160px] [@media(max-width:639px)_and_(max-height:760px)]:h-[18svh] [@media(max-width:639px)_and_(max-height:760px)]:min-h-[120px] sm:h-[min(40svh,440px)] [@media(min-width:640px)_and_(max-height:820px)]:h-[30svh] [@media(min-width:640px)_and_(max-height:820px)]:min-h-[150px]">
            <div className="absolute inset-0 sm:right-12">
              {/* the curves are drawn once; a curtain the colour of the page slides off them, so scrubbing costs no repaint */}
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
                <g>
                  {BAR_LAYER}
                  <motion.path initial={false} animate={{ d: rules.band }} transition={{ duration: 0.7, ease: EASE }} fill="oklch(var(--loss) / 0.12)" />
                  <path d={ACTUAL_LINE} fill="none" stroke="oklch(var(--ink-2))" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
                  <motion.path
                    initial={false}
                    animate={{ d: rules.line }}
                    transition={{ duration: 0.7, ease: EASE }}
                    fill="none"
                    stroke="oklch(var(--accent))"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="miter"
                  />
                </g>
              </svg>
              <div className="absolute -inset-y-3 left-0 right-0 overflow-hidden">
                <motion.div
                  style={{ x: headX }}
                  className="absolute inset-y-0 left-0 w-full bg-[linear-gradient(to_right,oklch(var(--bg)/0)_0px,oklch(var(--bg))_22px)] will-change-transform"
                />
              </div>
            </div>

            {[100_000, 104_000, 108_000, 112_000].map((v) => (
              <div key={v} className="pointer-events-none absolute inset-x-0 flex items-center" style={{ top: `${yPct(v)}%` }}>
                <span className="h-px flex-1 bg-ink/[0.06]" />
                <span className="ml-3 hidden font-mono text-[11px] text-faint sm:block">{(v / 1000).toFixed(0)}K</span>
              </div>
            ))}

            <div
              className={cn("absolute inset-0 sm:right-12", done && "cursor-crosshair")}
              onPointerMove={(e) => {
                if (!done || e.pointerType !== "mouse") return;
                const r = e.currentTarget.getBoundingClientRect();
                setHover(Math.min(N, Math.max(1, Math.ceil(((e.clientX - r.left) / r.width) * N))));
              }}
              onPointerLeave={() => setHover(null)}
            >
              {/* broken rules, dropped as the playhead passes them */}
              {MARKERS.map((m) => {
                const on = fixed.has(m.t.mistake!);
                return (
                  <motion.span
                    key={m.i}
                    initial={false}
                    animate={{ scale: m.i <= idx ? 1 : 0, opacity: m.i <= idx ? 1 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 26 }}
                    className={cn(
                      "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-bg transition-colors duration-300",
                      on ? "bg-loss" : "bg-surface-3",
                    )}
                    style={{ left: `${xPct(m.i)}%`, top: `${yPct(ACTUAL[m.i])}%` }}
                  />
                );
              })}

              {/* live points at the playhead */}
              <LiveDot x={xPct(idx)} y={yPct(rules.v[idx])} className="h-2.5 w-2.5 bg-accent shadow-[0_0_0_5px_oklch(var(--accent)/0.18)]" />
              <LiveDot x={xPct(idx)} y={yPct(ACTUAL[idx])} className="h-2 w-2 bg-ink" />

              {/* playhead */}
              <motion.div style={{ x: headX }} className="pointer-events-none absolute inset-0 w-full" animate={{ opacity: done ? 0 : 1 }}>
                <span className="absolute -top-8 bottom-0 left-0 w-px bg-gradient-to-b from-ink/40 via-ink/15 to-transparent" />
                <span className="absolute -top-9 left-0 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] font-medium text-bg">
                  {dayAt(idx)} вер
                </span>
              </motion.div>

              {/* after the month: a crosshair reads any trade */}
              {done && hover !== null && <TradeCrosshair i={hover} />}

              {/* the latest broken rule, with its price */}
              <AnimatePresence>
                {last && (
                  <motion.div
                    key={last.i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="float-card absolute z-raised w-[216px] -translate-y-full rounded-xl px-3.5 py-3 text-[12.5px] max-sm:scale-90"
                    style={{
                      left: `clamp(0px, calc(${xPct(last.i)}% - 108px), calc(100% - 216px))`,
                      top: `calc(${yPct(ACTUAL[last.i])}% - 18px)`,
                    }}
                  >
                    <div className="num text-ink">
                      {last.t.day} вер · {last.t.symbol} · {last.t.side}
                    </div>
                    <div className="mt-0.5 text-muted">{MISTAKES[last.t.mistake!].label}</div>
                    <div className="num mt-2 flex justify-between border-t border-ink/[0.08] pt-2">
                      <span className="text-muted">Результат {fmtUsd(last.t.pnl, { sign: true })}</span>
                      <DeviationPrice trade={last.t} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="relative mt-3 h-4 font-mono text-[11px] text-muted sm:mr-12">
            {TICKS.map((tk, i) => (
              <span
                key={tk.d}
                className="absolute top-0 whitespace-nowrap"
                style={{
                  left: `${tk.x}%`,
                  transform: i === 0 ? "none" : i === TICKS.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {tk.d} вер
              </span>
            ))}
          </div>
        </div>

        {/* at the end of the month the rules become switches */}
        <div className="container-page mt-4 sm:mt-8 [@media(min-width:640px)_and_(max-height:820px)]:mt-4">
          <div inert={!done} className={cn("transition-opacity duration-500", done ? "opacity-100" : "opacity-25")}>
            <p className="text-[13px] text-muted">Вимкни правило й подивись, як змінюється рахунок:</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
              {IDS.map((id) => {
                const on = fixed.has(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      onClick={() => toggle(id)}
                      className={cn(
                        "flex h-full w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors duration-200 lg:rounded-full lg:py-2",
                        on ? "bg-ink/[0.06] hover:bg-ink/[0.09]" : "bg-transparent hairline hover:bg-ink/[0.04]",
                      )}
                    >
                      <Switch on={on} />
                      <span className="min-w-0 lg:flex lg:items-baseline lg:gap-3">
                        <span className={cn("block text-[13px] leading-snug transition-colors sm:text-[14px]", on ? "text-ink" : "text-muted")}>
                          {MISTAKES[id].rule}
                        </span>
                        <span className={cn("num block text-[12.5px] transition-colors", on ? "text-loss" : "text-faint line-through decoration-ink/20")}>
                          {fmtUsd(-COSTS[id].cost, { cents: false })}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Vertical line through one trade and its ticket, TradingView-style. */
function TradeCrosshair({ i }: { i: number }) {
  const t = TRADES[i - 1];
  const x = ((i - 0.5) / N) * 100;
  return (
    <>
      <span className="pointer-events-none absolute -top-3 bottom-0 w-px border-l border-dashed border-ink/40" style={{ left: `${x}%` }} />
      <span
        className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink ring-[3px] ring-bg"
        style={{ left: `${xPct(i)}%`, top: `${yPct(ACTUAL[i])}%` }}
      />
      <div
        className="float-card pointer-events-none absolute top-0 z-raised w-[208px] rounded-xl px-3 py-2.5 font-mono text-[11.5px] leading-5"
        style={{ left: `clamp(0px, calc(${x}% + 14px), calc(100% - 208px))` }}
      >
        <div className="flex justify-between text-ink">
          <span>
            {t.symbol} · {t.side}
          </span>
          <span className="text-faint">{t.day} вер</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">P&amp;L</span>
          <span className={t.pnl >= 0 ? "text-profit" : "text-loss"}>{fmtUsd(t.pnl, { sign: true })}</span>
        </div>
        {t.mistake ? (
          <div className="mt-1 flex justify-between gap-2 border-t border-ink/[0.08] pt-1">
            <span className="truncate text-warn">{MISTAKES[t.mistake].label}</span>
            <DeviationPrice trade={t} />
          </div>
        ) : (
          <div className="mt-1 border-t border-ink/[0.08] pt-1 text-faint">за правилами</div>
        )}
      </div>
    </>
  );
}

/** What breaking the rule changed. A profitable deviation shows as a gain in profit colour, never as a red positive. */
function DeviationPrice({ trade }: { trade: (typeof TRADES)[number] }) {
  const delta = trade.pnl - (trade.rulePnl ?? 0);
  return <span className={delta < 0 ? "text-loss" : "text-profit"}>{fmtUsd(delta, { sign: true })}</span>;
}

/** A point riding the curve at the playhead. Moves by transform only: x inside a full-width track, y inside a full-height one. */
function LiveDot({ x, y, className }: { x: number; y: number; className: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 transition-transform duration-150 ease-out" style={{ transform: `translateX(${x}%)` }}>
      <span className="absolute inset-y-0 left-0 w-0 transition-transform duration-150 ease-out" style={{ transform: `translateY(${y}%)` }}>
        <span className={cn("absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full", className)} />
      </span>
    </span>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors duration-300",
        on ? "bg-accent" : "bg-ink/[0.14]",
      )}
    >
      {/* a plain x spring: layout animations would re-measure on every scrub re-render */}
      <motion.span
        initial={false}
        animate={{ x: on ? 16 : 0 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        className={cn("h-4 w-4 rounded-full shadow-sm transition-colors duration-300", on ? "bg-accent-ink" : "bg-ink-2")}
      />
    </span>
  );
}
