"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { ArrowUpRight, ListChecks, Scale, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { ACCOUNT, STATS, fmtUsd } from "@/lib/demo";
import { links } from "@/lib/links";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;
const DAILY_LIMIT = 5_000;
const WARN_AT = -DAILY_LIMIT * 0.8;
const CONSISTENCY_LIMIT = 45; // firm default
// verdicts as in the product: OK, WARNING from 80% of a limit, BREACH once the floor is broken
type Verdict = "ok" | "warning" | "breach" | "goal";
const VERDICT: Record<Exclude<Verdict, "goal">, string> = { ok: "OK", warning: "Увага", breach: "Порушення" };
// intraday P&L anchors: drifts toward the limit, trips the warning, recovers
const TAPE = [-640, -1210, -1790, -2380, -2950, -3520, -4080, -4210, -3890, -3340, -2760, -2130, -1480];

// chart: 09:00 to 17:00 on X, today's P&L fixed to [-5,600, +1,000] on Y
const N = 140;
const TICK_MS = 110;
const HOLD_MS = 2500;
const Y_MAX = 1_000;
const Y_MIN = -5_600;
const yPct = (v: number) => ((Y_MAX - v) / (Y_MAX - Y_MIN)) * 100;
const xPct = (i: number) => (i / (N - 1)) * 100;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// deterministic tick path: straight lines between the TAPE anchors plus seeded, mean-reverting noise
const PATH: number[] = (() => {
  const rand = mulberry32(23);
  const anchors = [0, ...TAPE];
  const at = anchors.map((_, k) => Math.round((k * (N - 1)) / (anchors.length - 1)));
  const out: number[] = [];
  let noise = 0;
  for (let k = 0; k < anchors.length - 1; k++) {
    const a = at[k];
    const b = at[k + 1];
    for (let i = a; i < b; i++) {
      const t = (i - a) / (b - a);
      const base = anchors[k] + (anchors[k + 1] - anchors[k]) * t;
      const jitter = (rand() < 0.5 ? -1 : 1) * (40 + rand() * 70);
      noise = noise * 0.45 + jitter * 0.55;
      const env = i === a ? 0 : Math.min(1, 3 * Math.min(t, 1 - t));
      out.push(Math.round((base + noise * env) * 100) / 100);
    }
  }
  out.push(anchors[anchors.length - 1]);
  return out;
})();
const MIN_IDX = PATH.reduce((m, v, i) => (v < PATH[m] ? i : m), 0);
const PX = PATH.map((_, i) => +(xPct(i) * 10).toFixed(2)); // viewBox x 0..1000
const PY = PATH.map((v) => +yPct(v).toFixed(2)); // viewBox y 0..100

const clock = (i: number) => {
  const m = 9 * 60 + Math.round((i / (N - 1)) * 480);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// the revealed path split in two: normal runs, and the runs drawn while in warning
function paths(n: number) {
  let ok = `M ${PX[0]} ${PY[0]}`;
  let warn = "";
  let prev = false;
  for (let j = 1; j < n; j++) {
    const w = PATH[j] <= WARN_AT;
    const seg = `L ${PX[j]} ${PY[j]}`;
    const from = `M ${PX[j - 1]} ${PY[j - 1]} `;
    if (w) warn += prev ? ` ${seg}` : ` ${from}${seg}`;
    else ok += !prev ? ` ${seg}` : ` ${from}${seg}`;
    prev = w;
  }
  let area = "";
  if (n > 1) {
    area = `M ${PX[0]} 100`;
    for (let j = 0; j < n; j++) area += ` L ${PX[j]} ${PY[j]}`;
    area += ` L ${PX[n - 1]} 100 Z`;
  }
  return { ok, warn: warn.trim(), area };
}

const REF_LINES = [
  { v: 0, label: "Старт дня", line: "border-t border-ink/[0.18]", text: "text-muted" },
  { v: WARN_AT, label: "80% ліміту", line: "border-t border-dashed border-warn/70", text: "text-warn" },
  {
    v: -DAILY_LIMIT,
    label: `Денний ліміт ${fmtUsd(-DAILY_LIMIT, { cents: false })}`,
    line: "border-t border-loss/80",
    text: "text-loss",
  },
];
const X_TICKS = ["09:00", "11:00", "13:00", "15:00", "17:00"];

const BAR: Record<Verdict, string> = { ok: "bg-ink-2/70", warning: "bg-warn", breach: "bg-loss", goal: "bg-accent" };
const VERDICTS: Verdict[] = ["ok", "warning", "breach", "goal"];

const verdictOf = (used: number, goal?: boolean): Verdict =>
  goal ? "goal" : used >= 100 ? "breach" : used >= 80 ? "warning" : "ok";

type Rule = { name: string; kind: string; used: number; value: string; goal?: boolean };

export function PropRules() {
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { amount: 0.2 });
  const reduce = useSafeReducedMotion();
  const [n, setN] = useState(1); // points revealed; the head is n - 1
  const done = n >= N;

  // reduced motion: a still frame at the intraday low, which is a WARNING frame
  useEffect(() => {
    if (reduce) setN(MIN_IDX + 1);
  }, [reduce]);

  useEffect(() => {
    if (reduce || !inView) return;
    if (done) {
      const t = window.setTimeout(() => setN(1), HOLD_MS);
      return () => window.clearTimeout(t);
    }
    const id = window.setInterval(() => setN((v) => Math.min(N, v + 1)), TICK_MS);
    return () => window.clearInterval(id);
  }, [inView, reduce, done]);

  const head = n - 1;
  const day = PATH[head];
  const usedPct = (Math.max(0, -day) / DAILY_LIMIT) * 100;
  const warn = usedPct >= 80;
  const left = DAILY_LIMIT + day;
  const afterNext = left - ACCOUNT.riskPerTrade;
  // trailing drawdown from the last equity peak includes today's open loss
  const ddPct = (Math.max(STATS.maxDd, -day) / ACCOUNT.start) * 100;

  const rules: Rule[] = [
    {
      name: "Денний ліміт збитку",
      kind: "5%",
      used: usedPct,
      value: `${fmtUsd(day, { cents: false, sign: true })} / ${fmtUsd(-DAILY_LIMIT, { cents: false })}`,
    },
    {
      name: "Макс. просадка",
      kind: "Trailing",
      used: ddPct * 10,
      value: `${ddPct.toFixed(1)}% / 10%`,
    },
    {
      name: "Консистентність",
      kind: `≤ ${CONSISTENCY_LIMIT}%`,
      used: (STATS.consistency / CONSISTENCY_LIMIT) * 100,
      value: `${STATS.consistency.toFixed(1)}% / ≤${CONSISTENCY_LIMIT}%`,
    },
    {
      name: "Ціль прибутку",
      kind: "10%",
      used: (STATS.net / 10_000) * 100,
      value: `${((STATS.net / ACCOUNT.start) * 100).toFixed(1)}% / 10%`,
      goal: true,
    },
  ];

  const states = rules.map((r) => verdictOf(r.used, r.goal));
  const room = states.includes("breach") ? "loss" : states.includes("warning") ? "warn" : "accent";
  const d = paths(n);
  const hx = xPct(head);
  const hy = yPct(day);
  const tagLeft = hx > 76;

  return (
    <section id="prop" className="relative py-24 sm:py-32">
      <div className="container-page">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <Reveal className="max-w-[40rem]">
            <h2 className="t-h2">Проп-челендж без сюрпризів</h2>
            <p className="t-lead mt-5">
              Обери програму, і правила фірми підтягнуться в рахунок. Traders Care попередить до порушення, а не після нього.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="shrink-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span className="font-medium text-ink">
                {ACCOUNT.name} <span className="font-normal text-muted">· {ACCOUNT.phase} · день 23</span>
              </span>
              <span className="flex items-center gap-2 text-[12px] text-ink-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                наживо
              </span>
            </div>
            <dl className="mt-4 flex gap-8 lg:justify-end">
              <div>
                <dt className="text-[12px] text-muted">Баланс</dt>
                <dd className="num mt-1 font-mono text-[1.2rem] font-medium tracking-[-0.02em] text-ink">
                  {fmtUsd(ACCOUNT.start + STATS.net)}
                </dd>
              </div>
              <div className="min-w-[9.5rem]">
                <dt className="text-[12px] text-muted">P&amp;L за сьогодні</dt>
                <dd
                  className={cn(
                    "num mt-1 font-mono text-[1.2rem] font-medium tracking-[-0.02em]",
                    day < 0 ? "text-loss" : day > 0 ? "text-profit" : "text-ink-2",
                  )}
                >
                  {fmtUsd(day, { sign: true })}
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="mt-12 sm:mt-14">
          <div ref={stageRef} className="relative overflow-hidden rounded-2xl bg-raised p-5 hairline sm:p-8 lg:p-10">
            {(["accent", "warn", "loss"] as const).map((c) => (
              <div
                key={c}
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
                style={{
                  opacity: room === c ? 1 : 0,
                  background: `radial-gradient(60% 55% at 50% 32%, oklch(var(--${c}) / 0.11), transparent 70%)`,
                }}
              />
            ))}

            <div className="relative">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[13px] text-ink-2">P&amp;L за день, $</span>
                <span className="num font-mono text-[11px] text-faint">{clock(head)}</span>
              </div>

              <div aria-hidden className="relative mt-4 h-[200px] md:h-[260px]">
                {X_TICKS.map((t, k) => (
                  <div key={t} className="absolute inset-y-0 w-px bg-ink/[0.05]" style={{ left: `${k * 25}%` }} />
                ))}
                <div className="absolute inset-x-0 bottom-0 bg-loss/[0.07]" style={{ top: `${yPct(-DAILY_LIMIT)}%` }} />
                {REF_LINES.map((r) => (
                  <div key={r.v} className={cn("absolute inset-x-0", r.line)} style={{ top: `${yPct(r.v)}%` }}>
                    <span
                      className={cn(
                        "absolute bottom-full right-0 mb-1 whitespace-nowrap font-mono text-[11px] leading-none",
                        r.text,
                      )}
                    >
                      {r.label}
                    </span>
                  </div>
                ))}

                <svg
                  viewBox="0 0 1000 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full overflow-visible"
                  fill="none"
                >
                  {d.area && <path d={d.area} fill="oklch(var(--ink) / 0.04)" />}
                  <path
                    d={d.ok}
                    stroke="oklch(var(--ink-2))"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {d.warn && (
                    <path
                      d={d.warn}
                      stroke="oklch(var(--warn))"
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>

                <span
                  className={cn(
                    "absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-300 motion-reduce:transition-none",
                    warn ? "bg-warn" : "bg-ink",
                  )}
                  style={{ left: `${hx}%`, top: `${hy}%` }}
                />
                <span
                  className={cn(
                    "num absolute whitespace-nowrap rounded-md px-1.5 py-1 font-mono text-[11px] leading-none transition-colors duration-300 motion-reduce:transition-none",
                    warn ? "bg-warn/[0.16] text-warn" : day < 0 ? "bg-loss/[0.14] text-loss" : "bg-ink/[0.08] text-ink",
                  )}
                  style={{
                    left: `${hx}%`,
                    top: `${hy}%`,
                    transform: tagLeft ? "translate(calc(-100% - 10px), -50%)" : "translate(10px, -50%)",
                  }}
                >
                  {fmtUsd(day, { cents: false, sign: true })}
                </span>
              </div>

              <div aria-hidden className="relative mt-2 h-4 font-mono text-[11px] leading-4 text-faint">
                {X_TICKS.map((t, k) => {
                  const edge = k === 0 ? "left-0" : k === X_TICKS.length - 1 ? "right-0" : "-translate-x-1/2";
                  return (
                    <span
                      key={t}
                      className={cn("absolute top-0", edge)}
                      style={k === 0 || k === X_TICKS.length - 1 ? undefined : { left: `${k * 25}%` }}
                    >
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>

            <div role="status" className="relative mt-6 h-[92px] sm:h-[60px]">
              <AnimatePresence mode="wait" initial={false}>
                {warn ? (
                  <motion.div
                    key="warn"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                    className="flex h-full items-center gap-3 rounded-xl bg-warn/[0.12] px-4 text-[13px] leading-snug text-ink sm:px-5"
                  >
                    <TriangleAlert className="h-4 w-4 shrink-0 text-warn" aria-hidden />
                    <span>
                      Використано <span className="num font-mono font-medium text-warn">{usedPct.toFixed(0)}%</span> денного
                      ліміту. Ще один стоп з ризиком 0.5% лишить запас{" "}
                      <span className="num font-mono font-medium text-ink">{fmtUsd(afterNext, { cents: false })}</span>.
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ok"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                    className="flex h-full items-center gap-3 rounded-xl bg-ink/[0.03] px-4 text-[13px] leading-snug text-ink-2 hairline sm:px-5"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    <span>
                      Усі правила програми в межах. Запас до денного ліміту{" "}
                      <span className="num font-mono">{fmtUsd(left, { cents: false })}</span>.
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div role="table" aria-label="Цілі челенджу: значення і статус кожного правила" className="relative mt-6">
              <div
                role="row"
                className="sr-only md:not-sr-only md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_6.5rem] md:items-center md:gap-8 md:pb-3 md:font-mono md:text-[11px] md:text-faint"
              >
                <span role="columnheader">Правило</span>
                <span role="columnheader">Використано</span>
                <span role="columnheader" className="md:text-right">
                  Значення
                </span>
                <span role="columnheader" className="md:text-right">
                  Статус
                </span>
              </div>
              {rules.map((r, idx) => (
                <Objective key={r.name} rule={r} state={states[idx]} />
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <ul className="mt-14 grid gap-7 md:grid-cols-3 md:gap-8">
            {[
              { icon: ShieldCheck, title: "Будь-який тип просадки", text: "Static, Trailing і EOD рахуються так само, як у фірми." },
              { icon: ListChecks, title: "Каталог із 15 проп-фірм", text: "Рейтинг, ринки, платформи, максимальний капітал і знижки поруч." },
              { icon: Scale, title: "Чесний підбір за 4 питання", text: "Партнерські виплати не впливають на результат підбору." },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink/[0.05] text-accent hairline">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span>
                  <span className="block text-[16px] font-medium text-ink">{title}</span>
                  <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-2">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button href={links.propFirms} variant="secondary">
              Каталог проп-фірм
            </Button>
            <a href={links.propMatch} className="group inline-flex items-center gap-1.5 text-[15px] text-ink-2 transition-colors hover:text-ink">
              Підібрати фірму
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Objective({ rule, state }: { rule: Rule; state: Verdict }) {
  const pct = Math.round(Math.max(0, rule.used));
  const label = state === "goal" ? "ціль" : VERDICT[state];
  const aria =
    state === "goal"
      ? `${rule.name}, ${rule.kind}: ${rule.value}, виконано ${pct}% цілі.`
      : `${rule.name}, ${rule.kind}: ${rule.value}, використано ${pct}% ліміту. Статус: ${label}.`;

  return (
    <div
      role="row"
      aria-label={aria}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 border-t border-ink/[0.08] py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_6.5rem] md:gap-x-8 md:gap-y-0"
    >
      <div role="cell" className="col-start-1 row-start-1 min-w-0">
        <div className="text-[14px] leading-snug text-ink">{rule.name}</div>
        <div className="num mt-0.5 font-mono text-[11px] text-faint">{rule.kind}</div>
      </div>

      <div role="cell" aria-hidden className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
          <div
            className="absolute inset-0 origin-left transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleX(${Math.min(1, Math.max(0, rule.used / 100))})` }}
          >
            {VERDICTS.map((v) => (
              <div
                key={v}
                className={cn(
                  "absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none",
                  BAR[v],
                  v === state ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        role="cell"
        className="num col-span-2 row-start-3 font-mono text-[13px] text-ink-2 md:col-span-1 md:col-start-3 md:row-start-1 md:text-right"
      >
        {rule.value}
      </div>

      <div role="cell" className="col-start-2 row-start-1 justify-self-end md:col-start-4">
        <span
          className={cn(
            "inline-block rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors duration-500 motion-reduce:transition-none",
            state === "goal" && "bg-ink/[0.06] font-normal text-muted",
            state === "ok" && "bg-ink/[0.06] text-ink-2",
            state === "warning" && "bg-warn/[0.16] text-warn",
            state === "breach" && "bg-loss/[0.16] text-loss",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
