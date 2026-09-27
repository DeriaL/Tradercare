"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { ACCOUNT, MISTAKES, STATS, TRADES, computeStats, fmtUsd, mistakeCost, type Trade } from "@/lib/demo";
import { useMedia } from "@/lib/useMedia";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

type Seg = { t: string; tone?: "loss" | "profit" | "ink" };
type Focus = "strong" | "soft" | null;
type Ring = "loss" | "accent";

const totalCost = (Object.keys(MISTAKES) as (keyof typeof MISTAKES)[]).reduce((s, id) => s + mistakeCost(id).cost, 0);
const usd = (v: number) => fmtUsd(v, { cents: false });

// "Розбери цей тиждень": week 39, same slice as the review preview
const WEEK = TRADES.filter((t) => t.day >= 21 && t.day <= 25);
const week = computeStats(WEEK);
const weekCost = WEEK.reduce((s, t) => s + (t.mistake ? (t.rulePnl ?? 0) - t.pnl : 0), 0);

// "Чи не переторговую я?": trades per day
const days = [...TRADES.reduce((m, t) => m.set(t.day, [...(m.get(t.day) ?? []), t]), new Map<number, typeof TRADES>())];
const busy = days.filter(([, ts]) => ts.length >= 3);
const calm = days.filter(([, ts]) => ts.length < 3);
const dayNet = (ds: typeof days) => ds.reduce((s, [, ts]) => s + ts.reduce((x, t) => x + t.pnl, 0), 0);
const busyDays = new Set(busy.map(([d]) => d));

// "Перевір мою консистентність": best day / total profit must stay under the firm's limit
const CONSISTENCY_LIMIT = 45;
const maxNextDay = (CONSISTENCY_LIMIT / (100 - CONSISTENCY_LIMIT)) * STATS.net;
const BEST_DAY = days.reduce((b, c) => (dayNet([c]) > dayNet([b]) ? c : b))[0];

const THREADS: { q: string; a: Seg[]; sources: string[]; focus: (t: Trade) => Focus; ring: (t: Trade) => Ring }[] = [
  {
    q: "Де я втрачаю найбільше?",
    a: [
      { t: `За ${ACCOUNT.month} порушення правил коштували` },
      { t: usd(-totalCost), tone: "loss" },
      { t: ". Найдорожчі: ризик понад план" },
      { t: usd(-mistakeCost("risk").cost), tone: "loss" },
      { t: "і реванш після мінуса" },
      { t: usd(-mistakeCost("revenge").cost), tone: "loss" },
      { t: ". Обидва реванші ти відкрив одразу після двох збитків поспіль. Твоє правило про паузу закрило б їх ще до входу." },
    ],
    sources: [`${TRADES.length} угоди за ${ACCOUNT.month}`, "Торгова система: 4 правила"],
    focus: (t) => (!t.mistake ? null : t.mistake === "risk" || t.mistake === "revenge" ? "strong" : "soft"),
    ring: () => "loss",
  },
  {
    q: "Розбери цей тиждень",
    a: [
      { t: "Тиждень 21-25 вересня:" },
      { t: fmtUsd(week.net, { sign: true, cents: false }), tone: "profit" },
      { t: `за ${week.trades} угод, win rate ${week.winRate.toFixed(0)}%. Найкраща угода GBPUSD Long +2.25R у Лондонську сесію. Помилки коштували` },
      { t: usd(-weekCost), tone: "loss" },
      { t: ": ризик понад план і вхід поза сетапом. Care Score 78, на 6 більше, ніж тижнем раніше." },
    ],
    sources: ["Розбір тижня 39", `${WEEK.length} угод`],
    focus: (t) => (t.day >= 21 && t.day <= 25 ? "strong" : null),
    ring: () => "accent",
  },
  {
    q: "Чи не переторговую я?",
    a: [
      { t: "У середньому" },
      { t: `${Math.round(TRADES.length / days.length)} угоди на день`, tone: "ink" },
      { t: `, це в межах плану. Але обидва дні з трьома угодами (${busy.map(([d]) => d).join(" і ")} вер) закрились у мінус, разом` },
      { t: usd(dayNet(busy)), tone: "loss" },
      { t: ". В обидва дні третя угода була реваншем після двох стопів поспіль. Дні з однією-двома угодами дали" },
      { t: fmtUsd(dayNet(calm), { sign: true, cents: false }), tone: "profit" },
      { t: "." },
    ],
    sources: [`Торгових днів: ${days.length}`, "Угоди за днями"],
    // The revenge trade keeps a loss ring only, the rest of the busy day gets the accent ring.
    focus: (t) => (!busyDays.has(t.day) ? null : t.mistake === "revenge" ? "soft" : "strong"),
    ring: (t) => (t.mistake === "revenge" ? "loss" : "accent"),
  },
  {
    q: "Перевір мою консистентність",
    a: [
      { t: "Найкращий день дає" },
      { t: `${STATS.consistency.toFixed(1)}%`, tone: "ink" },
      { t: `прибутку при ліміті програми ${CONSISTENCY_LIMIT}%, правило виконується із запасом. Навіть якщо наступний день стане найкращим, ліміт витримає до` },
      { t: usd(maxNextDay), tone: "ink" },
      { t: `за день. Просадка ${((STATS.maxDd / ACCOUNT.start) * 100).toFixed(1)}% з 10%, ціль ${((STATS.net / ACCOUNT.start) * 100).toFixed(1)}% з 10%.` },
    ],
    sources: [`${ACCOUNT.name}, ${ACCOUNT.phase}`, "Правила програми"],
    focus: (t) => (t.day === BEST_DAY ? "strong" : null),
    ring: () => "accent",
  },
];
const CONSISTENCY_THREAD = 3;

type Token = { w: string; tone?: Seg["tone"] };
const tokenize = (a: Seg[]): Token[] => a.flatMap((s) => s.t.split(" ").filter(Boolean).map((w) => ({ w, tone: s.tone })));

// Board: one column per trading day, a hairline where a new week starts (gap in calendar days).
const COLS = days.map(([day, trades], i) => ({ day, trades, weekStart: i > 0 && day - days[i - 1][0] > 1 }));
const SCAN = 1.1; // seconds for the beam to cross the board

const shortPnl = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toFixed(1).replace(/\.0$/, "")}K` : `${Math.round(a)}`;
  return `${v < 0 ? "−" : "+"}${s}`;
};
const tipFor = (t: Trade) =>
  [`${t.day} вер · ${t.symbol} ${t.side}`, fmtUsd(t.pnl, { sign: true, cents: false }), t.mistake ? MISTAKES[t.mistake].label : null]
    .filter(Boolean)
    .join(" · ");

export function Assistant() {
  return (
    <section id="assistant" className="relative overflow-hidden py-24 sm:py-32">
      <div className="container-page relative">
        <Reveal className="max-w-[44rem]">
          <h2 className="t-h2">Асистент, який прочитав твій журнал</h2>
          <p className="t-lead mt-5 max-w-[36rem]">
            Питай звичайною мовою. Відповідь спирається на твої угоди, правила й розбори, а не на загальні поради.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 sm:mt-12">
          <Reader />
        </Reveal>
      </div>
    </section>
  );
}

type Phase = "idle" | "scan" | "stream" | "done";

function Reader() {
  const reduce = useSafeReducedMotion();
  const isLg = useMedia("(min-width: 1024px)");
  const boardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const inView = useInView(boardRef, { once: true, amount: 0.6 });

  const [thread, setThread] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState(0);
  const [scanKey, setScanKey] = useState(0);
  // Highlights lag the selection: they belong to the thread whose scan has finished.
  const [lit, setLit] = useState<number | null>(null);
  const [litOn, setLitOn] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || thread !== null) return;
    // Let the board finish its entrance so the first scan is visible.
    const id = window.setTimeout(() => setThread((t) => t ?? 0), 450);
    return () => window.clearTimeout(id);
  }, [inView, thread]);

  const tokens = useMemo(() => (thread === null ? [] : tokenize(THREADS[thread].a)), [thread]);

  useEffect(() => {
    if (thread === null) return;
    if (reduce) {
      setLit(thread);
      setLitOn(true);
      setShown(tokens.length);
      setPhase("done");
      return;
    }
    setShown(0);
    setLitOn(false);
    setPhase("scan");
    setScanKey((k) => k + 1);
    let n = 0;
    let id = 0;
    const start = window.setTimeout(() => {
      setLit(thread);
      setLitOn(true);
      setPhase("stream");
      id = window.setInterval(() => {
        n += 1;
        setShown(n);
        if (n >= tokens.length) {
          window.clearInterval(id);
          setPhase("done");
        }
      }, 42);
    }, SCAN * 1000 + 120);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, [thread, tokens, reduce]);

  const scanning = phase === "scan" && !reduce;
  const done = phase === "done";
  const litThread = lit === null ? null : THREADS[lit];

  return (
    <div>
      {/* Questions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 flex w-full items-center gap-2 text-[13px] font-medium text-ink sm:w-auto">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden />
          Trader Assistant
          <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[11px] font-normal text-muted">Sonnet</span>
        </span>
        {THREADS.map((t, i) => (
          <button
            key={t.q}
            type="button"
            onClick={() => setThread(i)}
            aria-pressed={thread === i}
            className={cn(
              "h-11 rounded-full px-4 text-[15px] transition-colors duration-200",
              thread === i
                ? "bg-accent/[0.14] text-accent shadow-[inset_0_0_0_1px_oklch(var(--accent)/0.3)]"
                : "bg-ink/[0.05] text-ink-2 hairline hover:bg-ink/[0.09] hover:text-ink",
            )}
          >
            {t.q}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="mt-10 flex h-6 items-center text-[12.5px] sm:mt-12">
        <AnimatePresence mode="wait" initial={false}>
          {scanning ? (
            <motion.span
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 text-muted"
            >
              <span className="flex items-center gap-1" aria-hidden>
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-1.5 w-1.5 rounded-full bg-muted"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </span>
              <span>
                Читаю <span className="num">{TRADES.length}</span> угоди · <span className="text-ink-2">getMetrics</span>
              </span>
            </motion.span>
          ) : (
            <motion.span
              key="rest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-faint"
            >
              Журнал за {ACCOUNT.month} · <span className="num">{TRADES.length}</span> угоди
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Journal board */}
      <div ref={boardRef} role="group" aria-label={`Угоди за ${ACCOUNT.month} по днях`} className="relative mt-4">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[78px] h-px bg-ink/[0.08] md:top-[180px]" />
        <div ref={gridRef} className="relative grid grid-cols-[repeat(22,minmax(0,1fr))] gap-1 md:gap-1.5">
          {COLS.map((col, ci) => {
            const delay = Math.max(0, ((ci + 0.5) / COLS.length) * SCAN - 0.12);
            const best = col.day === BEST_DAY;
            const bestOn = litOn && lit === CONSISTENCY_THREAD;
            return (
              <div key={col.day} className="relative flex flex-col">
                {col.weekStart && (
                  <span aria-hidden className="absolute -left-[2.5px] bottom-0 top-0 w-px bg-ink/[0.07] md:-left-[3.5px]" />
                )}
                <div className="relative flex h-[76px] flex-col-reverse gap-1 md:h-[178px]">
                  {col.trades.map((t) => {
                    const f = litThread ? litThread.focus(t) : null;
                    const ring = litThread ? litThread.ring(t) : "accent";
                    const on = litOn && f !== null;
                    const dim = litOn && f === null;
                    const tip = on && isLg;
                    const tipAlign = ci < 3 ? "left-0" : ci > COLS.length - 4 ? "right-0" : "left-1/2 -translate-x-1/2";
                    return (
                      <span
                        key={`${t.symbol}-${t.side}-${t.pnl}`}
                        tabIndex={tip ? 0 : undefined}
                        role={tip ? "img" : undefined}
                        aria-label={tip ? tipFor(t) : undefined}
                        aria-hidden={tip ? undefined : true}
                        className={cn(
                          "group relative block aspect-square shrink-0 rounded-[3px] transition-opacity duration-[400ms] md:aspect-auto md:h-[46px] md:rounded-md",
                          t.pnl > 0 ? "bg-profit/[0.3]" : "bg-loss/[0.3]",
                          "lg:bg-surface-2 lg:shadow-[inset_0_0_0_1px_oklch(var(--ink)/0.08)]",
                          dim ? "opacity-30" : "opacity-100",
                          tip && "hover:z-raised focus-visible:z-raised",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-[400ms]",
                            on ? "opacity-100" : "opacity-0",
                            ring === "loss"
                              ? "shadow-[inset_0_0_0_1.5px_oklch(var(--loss))]"
                              : "shadow-[inset_0_0_0_1.5px_oklch(var(--accent))]",
                            ring === "loss" && f === "strong" && "bg-loss/[0.16]",
                          )}
                        />
                        {scanning && (
                          <motion.span
                            key={scanKey}
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-accent/[0.28]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.45, delay, times: [0, 0.3, 1], ease: "easeOut" }}
                          />
                        )}
                        <span className="relative hidden h-full flex-col items-center justify-center gap-1 lg:flex">
                          <span className="text-[10px] leading-none text-muted">{t.symbol.slice(0, 3)}</span>
                          <span className={cn("num text-[11px] font-medium leading-none", t.pnl > 0 ? "text-profit" : "text-loss")}>
                            {shortPnl(t.pnl)}
                          </span>
                        </span>
                        {tip && (
                          <span
                            aria-hidden
                            className={cn(
                              "pointer-events-none absolute bottom-[calc(100%+8px)] hidden whitespace-nowrap rounded-md bg-surface-3 px-2.5 py-1.5 text-[12px] leading-snug text-ink-2 opacity-0 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6),inset_0_0_0_1px_oklch(var(--ink)/0.08)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block",
                              tipAlign,
                            )}
                          >
                            <span className="num text-ink">
                              {t.day} вер · {t.symbol} {t.side}
                            </span>
                            <span className={cn("num ml-2 font-medium", t.pnl > 0 ? "text-profit" : "text-loss")}>
                              {fmtUsd(t.pnl, { sign: true, cents: false })}
                            </span>
                            {t.mistake && <span className="block text-muted">{MISTAKES[t.mistake].label}</span>}
                          </span>
                        )}
                      </span>
                    );
                  })}
                  {best && (
                    <>
                      <span
                        aria-hidden
                        className={cn(
                          "mx-auto mb-1 mt-[28px] w-px flex-1 bg-accent/50 transition-opacity duration-[400ms]",
                          bestOn ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-1/2 top-0 z-raised -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-3 px-2.5 py-1 text-[11.5px] leading-none text-ink transition-opacity duration-[400ms] hairline",
                          bestOn ? "opacity-100" : "opacity-0",
                        )}
                      >
                        найкращий день · <span className="num">{STATS.consistency.toFixed(1)}%</span>
                      </span>
                    </>
                  )}
                </div>
                <span
                  aria-hidden
                  className={cn(
                    "num mt-3 whitespace-nowrap text-center text-[11px] leading-none text-faint",
                    ci % 5 !== 0 && "invisible md:visible",
                  )}
                >
                  {col.day}
                </span>
              </div>
            );
          })}
        </div>
        {scanning && width > 0 && (
          <motion.div
            key={scanKey}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-raised h-[76px] w-[2px] rounded-full bg-accent shadow-[0_0_16px_2px_oklch(var(--accent)/0.45)] motion-reduce:hidden md:h-[178px]"
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: width - 2, opacity: [0, 1, 1, 0] }}
            transition={{
              x: { duration: SCAN, ease: "linear" },
              opacity: { duration: SCAN, times: [0, 0.06, 0.9, 1], ease: "linear" },
            }}
          >
            <span className="absolute inset-y-0 right-full w-16 bg-gradient-to-r from-transparent to-accent/[0.1]" />
          </motion.div>
        )}
      </div>

      {/* Answer */}
      <div className="mt-12 sm:mt-14">
        <div className="flex min-h-7 items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
            <LogoMark className="h-3.5 w-3.5" />
          </span>
          <AnimatePresence mode="wait" initial={false}>
            {thread !== null && (
              <motion.span
                key={thread}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="min-w-0 truncate text-[15px] text-muted"
              >
                {THREADS[thread].q}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 min-h-[20rem] max-w-[52rem] sm:min-h-[13rem]" aria-live="polite">
          {thread !== null && (
            <p
              className="leading-[1.5] tracking-[-0.012em] text-ink-2"
              style={{ fontSize: "clamp(1.25rem, 1rem + 0.8vw, 1.75rem)" }}
            >
              {tokens.slice(0, shown).map((tk, i) => (
                <span
                  key={i}
                  className={cn(
                    "num",
                    tk.tone === "loss" && "font-medium text-loss",
                    tk.tone === "profit" && "font-medium text-profit",
                    tk.tone === "ink" && "text-ink",
                  )}
                >
                  {/^[.,:]/.test(tk.w) ? "" : i ? " " : ""}
                  {tk.w}
                </span>
              ))}
              {!done && <span className="ml-1 inline-block h-[0.95em] w-[2px] translate-y-[0.14em] bg-accent" aria-hidden />}
            </p>
          )}
          <AnimatePresence>
            {done && thread !== null && (
              <motion.div
                key={thread}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="mt-5 flex flex-wrap gap-2"
              >
                {THREADS[thread].sources.map((s) => (
                  <span key={s} className="num rounded-full bg-ink/[0.05] px-2.5 py-1 text-[12px] text-muted hairline">
                    {s}
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex flex-col justify-between gap-2 border-t border-ink/[0.06] pt-5 text-[13px] text-muted sm:flex-row">
          <span>Аналіз, а не торгові сигнали. Не психологічна й не медична допомога.</span>
          <span>Моделі: Haiku у Solo, Sonnet у Trader, Opus у Pro</span>
        </div>
      </div>
    </div>
  );
}
