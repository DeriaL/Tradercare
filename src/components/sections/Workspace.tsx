"use client";

import { motion, useInView } from "motion/react";
import { ArrowDownRight, Check, FileText, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { linePath, project } from "@/lib/chart";
import { ACCOUNT, MISTAKES, STATS, TRADES, fmtUsd, mistakeCost, type MistakeId } from "@/lib/demo";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

export function Workspace() {
  return (
    <section id="workspace" className="relative py-24 sm:py-32">
      <div className="container-page">
        <Reveal className="max-w-[54rem]">
          <h2 className="t-h2">Один воркспейс замість таблиць, скриншотів і нотаток</h2>
          <p className="t-lead mt-5 max-w-[38rem]">
            Журнал, статистика, торгова система і план угоди знають одне про одного. Тому розбір займає хвилини, а не вечір.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-3 sm:mt-14 md:grid-cols-2 lg:grid-cols-6 lg:gap-4">
          <Cell i={0} className="md:col-span-2 lg:col-span-4">
            <CellText title="Журнал, який веде себе сам" text="Угоди з брокера, скриншоти, теги й нотатки в одному місці. Список, галерея або календар місяця." />
            <CalendarViz />
          </Cell>

          <Cell i={1} className="md:col-span-1 lg:col-span-2 lg:row-span-2">
            <CellText title="Статистика, яка не бреше" text="Win rate, profit factor і R за сетапами та сесіями. Мала вибірка позначена чесно." />
            <StatsViz />
          </Cell>

          <Cell i={2} className="lg:col-span-2">
            <CellText title="Торгова система" text="Доктрина, сетапи й правила ризику записані один раз і працюють у кожній угоді." />
            <SystemViz />
          </Cell>

          <Cell i={3} className="lg:col-span-2" tone="accent">
            <CellText tone="accent" title="План до входу" text="Ідея, рівні й чекліст сетапу. Коли план спрацював, він стає угодою одним кліком." />
            <PlanViz />
          </Cell>

          <Cell i={4} className="md:col-span-1 lg:col-span-3">
            <CellText title="Помилки з ціною" text="Кожна помилка має частоту, суму і тренд. Видно, яка з них коштує найдорожче." />
            <MistakesViz />
          </Cell>

          <Cell i={5} className="md:col-span-2 lg:col-span-3">
            <CellText title="База знань трейдера" text="Нотатки з прикладами реальних угод і тегами. Журнал з Notion переноситься імпортом." />
            <NotesViz />
          </Cell>
        </div>
      </div>
    </section>
  );
}

function Cell({ i, className, tone, children }: { i: number; className?: string; tone?: "accent"; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useSafeReducedMotion();

  // a soft light follows the cursor inside the tile
  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={move}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={reduce ? { duration: 0 } : { duration: 0.7, delay: (i % 3) * 0.08, ease: EASE }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl",
        tone === "accent" ? "bg-accent text-accent-ink" : "panel",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), ${tone === "accent" ? "oklch(1 0 0 / 0.22)" : "oklch(var(--ink) / 0.055)"}, transparent 65%)`,
        }}
      />
      {children}
    </motion.div>
  );
}

function CellText({ title, text, tone }: { title: string; text: string; tone?: "accent" }) {
  return (
    <div className="p-6 pb-0 sm:p-7 sm:pb-0">
      <h3 className={cn("t-h3", tone === "accent" ? "text-accent-ink" : "text-ink")}>{title}</h3>
      <p className={cn("mt-2 max-w-[30rem] text-[14.5px] leading-relaxed", tone === "accent" ? "text-accent-ink/75" : "text-ink-2")}>{text}</p>
    </div>
  );
}

/** Starts a cell's internal animation when it scrolls into view. */
function useStart<T extends Element>(amount = 0.35) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount });
  const reduce = useSafeReducedMotion();
  return { ref, on: inView || reduce, reduce };
}

/* ---------- calendar ---------- */

const byDay = new Map<number, number>();
for (const t of TRADES) byDay.set(t.day, (byDay.get(t.day) ?? 0) + t.pnl);
const maxAbs = Math.max(...[...byDay.values()].map(Math.abs));
// September 2026 starts on a Tuesday; Monday 31 Aug leads the first row.
const WEEKS: (number | null)[][] = [
  [null, 1, 2, 3, 4],
  [7, 8, 9, 10, 11],
  [14, 15, 16, 17, 18],
  [21, 22, 23, 24, 25],
  [28, 29, 30, null, null],
];

function CalendarViz() {
  const { ref, on, reduce } = useStart<HTMLDivElement>();
  return (
    <div ref={ref} className="mt-auto p-4 pt-6 sm:p-7 sm:pt-8">
      <div className="num grid grid-cols-5 gap-1.5 pb-2 text-[11px] text-faint sm:gap-2">
        {["Пн", "Вт", "Ср", "Чт", "Пт"].map((d) => (
          <span key={d} className="px-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {WEEKS.flat().map((day, i) => {
          if (day === null) return <span key={`e${i}`} className="rounded-lg bg-ink/[0.02] sm:h-[58px]" />;
          const v = byDay.get(day) ?? 0;
          const k = 0.1 + (Math.abs(v) / maxAbs) * 0.32;
          return (
            <motion.div
              key={day}
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={on ? { opacity: 1, scale: 1 } : undefined}
              transition={{ duration: 0.5, delay: i * 0.025, ease: EASE }}
              className="flex h-[48px] flex-col justify-between rounded-lg p-1.5 hairline sm:h-[58px] sm:p-2"
              style={{ background: `oklch(var(--${v >= 0 ? "profit" : "loss"}) / ${k.toFixed(3)})` }}
            >
              <span className="num text-[10.5px] text-ink-2">{day}</span>
              <span className={cn("num truncate text-[10.5px] font-medium sm:text-[12px]", v >= 0 ? "text-profit" : "text-loss")}>
                {v >= 0 ? "+" : "−"}
                {Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(1)}K` : Math.round(Math.abs(v))}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- statistics ---------- */

function group(key: "setup" | "session") {
  const m = new Map<string, { n: number; wins: number; net: number }>();
  for (const t of TRADES) {
    const g = m.get(t[key]) ?? { n: 0, wins: 0, net: 0 };
    g.n += 1;
    g.net += t.pnl;
    if (t.pnl > 0) g.wins += 1;
    m.set(t[key], g);
  }
  return [...m.entries()].map(([name, g]) => ({ name, ...g, wr: (g.wins / g.n) * 100 })).sort((a, b) => b.net - a.net);
}
const SETUPS = group("setup");
const SESSIONS = group("session");

// R-multiple histogram, 1R = planned risk
const R_EDGES: [number, number, string][] = [
  [-Infinity, -1.5, "−2R"],
  [-1.5, -0.5, "−1R"],
  [-0.5, 0.5, "0"],
  [0.5, 1.5, "+1R"],
  [1.5, 2.5, "+2R"],
  [2.5, Infinity, "+3R"],
];
const R_BINS = R_EDGES.map(([lo, hi, label]) => ({
  label,
  tone: label === "0" ? "flat" : lo < -0.5 ? "loss" : "profit",
  n: TRADES.filter((t) => {
    const r = t.pnl / ACCOUNT.riskPerTrade;
    return r >= lo && r < hi;
  }).length,
}));

function StatsViz() {
  const { ref, on, reduce } = useStart<HTMLDivElement>(0.25);
  const maxNet = Math.max(...SETUPS.map((s) => Math.abs(s.net)));
  const maxBin = Math.max(...R_BINS.map((b) => b.n));
  return (
    <div ref={ref} className="flex flex-1 flex-col justify-between gap-8 p-6 pt-8 sm:p-7 sm:pt-9">
      <div>
        <div className="mb-3 flex justify-between text-[12px] text-muted">
          <span>Розподіл результатів</span>
          <span className="num">середній {STATS.avgR >= 0 ? "+" : "−"}{Math.abs(STATS.avgR).toFixed(2)}R</span>
        </div>
        <div className="flex h-[92px] items-end gap-1.5">
          {R_BINS.map((b, i) => (
            <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="num text-[10.5px] text-muted">{b.n}</span>
              <motion.span
                className={cn("block w-full origin-bottom rounded-[4px]", b.tone === "profit" ? "bg-profit/75" : b.tone === "loss" ? "bg-loss/75" : "bg-ink/25")}
                style={{ height: `${(b.n / maxBin) * 62}px` }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={on ? { scaleY: 1 } : undefined}
                transition={{ duration: 0.8, delay: i * 0.06, ease: EASE }}
              />
            </div>
          ))}
        </div>
        <div className="num mt-1.5 flex gap-1.5 text-[10px] text-faint">
          {R_BINS.map((b) => (
            <span key={b.label} className="flex-1 text-center">
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex justify-between text-[12px] text-muted">
          <span>За сетапом</span>
          <span>P&L</span>
        </div>
        <ul className="space-y-3.5">
          {SETUPS.map((s, i) => (
            <li key={s.name}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn("truncate", s.name === "Без сетапу" ? "text-loss" : "text-ink")}>{s.name}</span>
                <span className={cn("num shrink-0", s.net >= 0 ? "text-profit" : "text-loss")}>{fmtUsd(s.net, { sign: true, cents: false })}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                  <motion.div
                    className={cn("h-full origin-left rounded-full", s.net >= 0 ? "bg-profit/80" : "bg-loss/80")}
                    style={{ width: `${(Math.abs(s.net) / maxNet) * 100}%` }}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={on ? { scaleX: 1 } : undefined}
                    transition={{ duration: 1, delay: 0.1 + i * 0.1, ease: EASE }}
                  />
                </div>
                <span className="num w-[5.5rem] shrink-0 text-right text-[11.5px] text-muted">
                  {s.n} уг · {s.wr.toFixed(0)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-3 text-[12px] text-muted">За сесією</div>
        <div className="grid grid-cols-3 gap-2">
          {SESSIONS.map((s, i) => {
            const small = s.n < 5;
            return (
              <motion.div
                key={s.name}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={on ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.6, delay: 0.5 + i * 0.08, ease: EASE }}
                className={cn("rounded-xl p-2.5 hairline", small ? "bg-ink/[0.02]" : "bg-surface-2/70")}
              >
                <div className="truncate text-[11.5px] text-muted">{s.name}</div>
                <div className={cn("num mt-1 text-[1.05rem] font-semibold", small ? "text-faint" : "text-ink")}>{s.wr.toFixed(0)}%</div>
                <div className="num text-[10.5px] text-faint">{small ? "мала вибірка" : `${s.n} угод`}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- trading system ---------- */

const CHECKS = ["Діапазон Азії не ширший за 40 пп", "Пробій на закритті M15", "Ретест рівня з об'ємом", "Стоп за протилежною межею"];

function SystemViz() {
  const { ref, on, reduce } = useStart<HTMLDivElement>(0.4);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    if (reduce) return setN(CHECKS.length);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= CHECKS.length) window.clearInterval(id);
    }, 420);
    return () => window.clearInterval(id);
  }, [on, reduce]);

  return (
    <div ref={ref} className="mt-auto p-4 pt-6 sm:p-7 sm:pt-7">
      <div className="rounded-xl bg-surface-2/70 p-4 hairline">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-medium text-ink">Пробій діапазону</span>
          <span className="num text-[11.5px] text-muted">
            {SETUPS.find((s) => s.name === "Пробій діапазону")?.wr.toFixed(0)}% win rate
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {CHECKS.map((c, i) => {
            const done = i < n;
            return (
              <li key={c} className="flex items-center gap-2.5 text-[12.5px]">
                <motion.span
                  animate={{ backgroundColor: done ? "oklch(var(--accent))" : "oklch(var(--ink) / 0.06)", scale: done ? [1, 1.18, 1] : 1 }}
                  transition={{ duration: 0.35 }}
                  className="grid h-4 w-4 shrink-0 place-items-center rounded-[5px] text-accent-ink"
                >
                  {done && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
                </motion.span>
                <span className={cn("transition-colors duration-300", done ? "text-ink" : "text-muted")}>{c}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ---------- plan ---------- */

// product statuses: Planning → On radar → Triggered (then "Convert to trade")
const PLAN_STATES = ["Планую", "На радарі", "Спрацював"];

function PlanViz() {
  const { ref, on, reduce } = useStart<HTMLDivElement>(0.4);
  const [s, setS] = useState(0);
  useEffect(() => {
    if (reduce) return setS(2);
    if (!on) return;
    const a = window.setTimeout(() => setS(1), 1400);
    const b = window.setTimeout(() => setS(2), 2800);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [on, reduce]);

  return (
    <div ref={ref} className="mt-auto p-4 pt-6 sm:p-7 sm:pt-7">
      <div className="rounded-xl bg-accent-ink p-4 text-ink shadow-[0_20px_40px_-20px_oklch(0_0_0/0.6)]">
        <div className="flex items-center justify-between">
          <span className="num text-[13.5px] font-medium">EURUSD · Long</span>
          <motion.span
            key={s}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px]",
              s === 2 ? "bg-accent text-accent-ink" : "bg-ink/[0.1] text-ink-2",
            )}
          >
            {PLAN_STATES[s]}
          </motion.span>
        </div>
        <dl className="num mt-3 grid grid-cols-3 gap-2 text-[12px]">
          {[
            ["Вхід", "1.1742"],
            ["Стоп", "1.1722"],
            ["Ціль", "1.1802"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-ink/[0.06] px-2.5 py-2">
              <dt className="text-[11px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
          <span>R:R 1 : 3 · ризик 0.5%</span>
          <span className={cn("transition-colors duration-300", s === 2 ? "text-accent" : "text-faint")}>В угоду →</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- mistakes ---------- */

// six-month counts per mistake, most recent last (sample data)
const TREND: Record<MistakeId, number[]> = {
  stop: [9, 8, 8, 6, 5, 3],
  risk: [6, 7, 5, 4, 3, 2],
  setup: [8, 6, 7, 5, 5, 3],
  revenge: [7, 6, 4, 4, 3, 2],
};

function MistakesViz() {
  const { ref, on, reduce } = useStart<HTMLDivElement>(0.35);
  const rows = (Object.keys(MISTAKES) as MistakeId[])
    .map((id) => ({ id, ...mistakeCost(id) }))
    .sort((a, b) => b.cost - a.cost);
  return (
    <div ref={ref} className="mt-auto p-4 pt-6 sm:p-7 sm:pt-8">
      <ul className="divide-y divide-ink/[0.06] rounded-xl bg-surface-2/60 px-4 hairline">
        {rows.map((r, i) => {
          const pts = project(TREND[r.id], { w: 56, h: 22, padTop: 3, padBottom: 3, min: 0, max: 10 });
          return (
            <motion.li
              key={r.id}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              animate={on ? { opacity: 1, x: 0 } : undefined}
              transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
              className="flex items-center gap-3 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{MISTAKES[r.id].label}</span>
              <svg viewBox="0 0 56 22" className="h-[22px] w-14 shrink-0 overflow-visible" aria-hidden>
                <motion.path
                  d={linePath(pts)}
                  fill="none"
                  stroke="oklch(var(--ink-2))"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={on ? { pathLength: 1 } : undefined}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                />
              </svg>
              <span className="num flex w-[3.25rem] shrink-0 items-center justify-end gap-0.5 text-[11.5px] text-profit">
                <ArrowDownRight className="h-3 w-3" aria-hidden />
                {Math.round((1 - TREND[r.id][5] / TREND[r.id][0]) * 100)}%
              </span>
              <span className="num w-[4.5rem] shrink-0 text-right text-[13px] text-loss">{fmtUsd(-r.cost, { cents: false })}</span>
            </motion.li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] text-muted">Частота за шість місяців</p>
    </div>
  );
}

/* ---------- notes ---------- */

function NotesViz() {
  const { ref, on, reduce } = useStart<HTMLDivElement>(0.35);
  return (
    <div ref={ref} className="mt-auto grid gap-3 p-4 pt-6 sm:grid-cols-[1.2fr_1fr] sm:p-7 sm:pt-8">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={on ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.7, ease: EASE }}
        className="rounded-xl bg-surface-2/60 p-4 hairline"
      >
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Нотатка
        </div>
        <div className="mt-2 text-[14px] font-medium text-ink">Хибний пробій на відкритті Нью-Йорка</div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
          Перші 15 хвилин після відкриття не входжу. Чекаю, поки ціна закріпиться за рівнем.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["#NY", "#пробій", "#NAS100"].map((t) => (
            <span key={t} className="rounded-md bg-ink/[0.06] px-2 py-0.5 text-[11px] text-ink-2">
              {t}
            </span>
          ))}
        </div>
      </motion.div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
        {[
          { label: "NAS100 · 29 вер", up: false },
          { label: "NAS100 · 10 вер", up: true },
        ].map((ex, i) => (
          <motion.div
            key={ex.label}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={on ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, delay: 0.12 + i * 0.1, ease: EASE }}
            className="rounded-xl bg-surface-2/60 p-3 hairline"
          >
            <MiniCandles up={ex.up} />
            <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-2">
              <Link2 className="h-3 w-3 text-muted" aria-hidden />
              <span className="num truncate">{ex.label}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MiniCandles({ up }: { up: boolean }) {
  // deterministic OHLC walk, scaled into the thumbnail: a trade example preview
  let seed = up ? 11 : 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bars: { o: number; c: number; h: number; l: number }[] = [];
  let p = 50;
  for (let i = 0; i < 12; i++) {
    const o = p;
    const c = o + (up ? 0.9 : -0.9) + (rnd() - 0.5) * 8;
    bars.push({ o, c, h: Math.max(o, c) + rnd() * 2, l: Math.min(o, c) - rnd() * 2 });
    p = c;
  }
  const lo = Math.min(...bars.map((b) => b.l));
  const hi = Math.max(...bars.map((b) => b.h));
  const y = (v: number) => 3 + (1 - (v - lo) / (hi - lo)) * 38;
  const step = 100 / bars.length;
  return (
    <svg viewBox="0 0 100 44" preserveAspectRatio="none" className="block h-11 w-full" aria-hidden>
      {bars.map((b, i) => {
        const bull = b.c >= b.o;
        const x = i * step + step / 2;
        const color = bull ? "oklch(var(--profit))" : "oklch(var(--loss))";
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(b.h)} y2={y(b.l)} stroke={color} strokeOpacity={0.7} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
            <rect x={x - step * 0.3} y={y(Math.max(b.o, b.c))} width={step * 0.6} height={Math.max(1, Math.abs(y(b.o) - y(b.c)))} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}
