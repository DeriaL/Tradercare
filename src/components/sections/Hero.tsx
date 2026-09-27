"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import {
  ArrowUpRight,
  CircleCheck,
  NotebookPen,
  Play,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { LiveChart } from "@/components/market/LiveChart";
import { Sessions } from "@/components/market/Sessions";
import { Ticker } from "@/components/market/Ticker";
import {
  MOVED_PTS,
  RISK_PTS,
  TARGET_PTS,
  USD_PER_PT,
  fmtMoney,
  type ChartLayout,
  type TradeEvent,
} from "@/components/market/engine";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { MISTAKES } from "@/lib/demo";
import { links } from "@/lib/links";
import { useMedia } from "@/lib/useMedia";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;
const RISK = RISK_PTS * USD_PER_PT;
const MOVED_RISK = MOVED_PTS * USD_PER_PT;
const TARGET = TARGET_PTS * USD_PER_PT;

// Desktop: the chart is the whole backdrop and dissolves under the headline, bottom left.
const DESKTOP: ChartLayout = {
  top: 140,
  bottom: 240,
  axisW: 78,
  step: 10,
  rightPad: 13,
  edge: 0,
  scaleFrom: 0.34,
  hole: (w, h) => {
    const left = Math.max(32, (w - 1240) / 2 + 32);
    return { x: left + 300, y: h * 0.9, rx: Math.min(940, w * 0.64), ry: Math.max(640, h * 0.9) };
  },
};
// Phones and tablets: a full-bleed chart block between the headline and the ticket.
const COMPACT: ChartLayout = {
  top: 58,
  bottom: 24,
  axisW: 68,
  step: 7,
  rightPad: 10,
  edge: 28,
  scaleFrom: 0.1,
};

/**
 * Hero: a live market, not a screenshot. NAS100 replays in 1-minute candles while a trade plays out on it:
 * the stop gets dragged and the loss outgrows the plan, then a trade by the plan hits 2R.
 * The ticket beside it is what Traders Care writes into the journal.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const desktop = useMedia("(min-width: 1024px)");
  const reduce = useSafeReducedMotion();

  const [trade, setTrade] = useState<TradeEvent>({
    kind: "moved",
    phase: "open",
    pnl: 0,
  });
  const pnlEl = useRef<HTMLSpanElement>(null);
  const rEl = useRef<HTMLSpanElement>(null);
  const writePnl = useCallback((v: number) => {
    const sign = v < 0 ? "neg" : "pos";
    const text = fmtMoney(v);
    const r = `${v < 0 ? "−" : "+"}${Math.abs(v / RISK).toFixed(2)}R`;
    for (const [el, s] of [
      [pnlEl.current, text],
      [rEl.current, r],
    ] as const) {
      if (!el) continue;
      if (el.textContent !== s) el.textContent = s;
      el.dataset.sign = sign;
    }
  }, []);

  // desktop: the market sinks a little slower than the page as you leave
  const { scrollYProgress } = useScroll({
    target: root,
    offset: ["start start", "end start"],
  });
  const chartY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const chartOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.25]);
  const parallax = desktop && !reduce;

  return (
    <section
      ref={root}
      id="hero"
      className="relative isolate flex flex-col overflow-hidden lg:min-h-[max(100svh,700px)]"
    >
      {/* the market: in flow on phones, the whole backdrop on desktop */}
      <motion.div
        style={parallax ? { y: chartY, opacity: chartOpacity } : undefined}
        className="relative order-2 mt-10 h-[clamp(340px,56svh,480px)] lg:absolute lg:inset-x-0 lg:bottom-11 lg:top-0 lg:order-none lg:mt-0 lg:h-auto"
      >
        <LiveChart
          className="h-full w-full"
          layout={desktop ? DESKTOP : COMPACT}
          hoverRoot={root}
          onTrade={setTrade}
          onPnl={writePnl}
          legendClassName="container-page inset-x-0 top-3 lg:top-[calc(var(--nav-h)+26px)]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--nav-h)+26px)] hidden xl:block">
          <div className="container-page flex justify-end">
            <Sessions />
          </div>
        </div>
      </motion.div>

      {/* copy and ticket: stacked around the chart on phones, one row along the bottom on desktop */}
      <div className="container-page contents lg:relative lg:z-raised lg:mt-auto lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-10 lg:pb-12">
        <div className="order-1 px-4 pt-[calc(var(--nav-h)+2.5rem)] sm:px-6 lg:col-span-7 lg:px-0 lg:pt-[calc(var(--nav-h)+7rem)] xl:col-span-8">
          <div data-nocross>
            <motion.a
              {...rise(0.05, reduce)}
              href={links.tools}
              className="group inline-flex items-center gap-2 rounded-full bg-raised py-1.5 pl-1.5 pr-3 text-[13px] text-ink-2 hairline transition-colors hover:bg-surface hover:text-ink"
            >
              <span className="rounded-full bg-accent/[0.14] px-2 py-0.5 text-[12px] font-medium text-accent">
                Free
              </span>
              Інструменти для трейдера без реєстрації
              <ArrowUpRight
                className="h-3.5 w-3.5 text-muted transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
                aria-hidden
              />
            </motion.a>

            <h1 className="t-display mt-6 text-[clamp(2.6rem,0.2rem+4.7vw,5.25rem)] leading-[1.02] lg:whitespace-nowrap">
              <Line delay={0.15} reduce={reduce}>
                Кожне відхилення
              </Line>
              <Line delay={0.28} reduce={reduce}>
                має <span className="text-accent">ціну.</span>
              </Line>
            </h1>

            <motion.p
              {...rise(0.45, reduce)}
              className="t-lead mt-6 max-w-[34rem]"
            >
              Traders Care рахує її за тебе: журнал з MetaTrader, аналітика і
              проп-правила наживо в одному воркспейсі.
            </motion.p>
            <motion.div
              {...rise(0.58, reduce)}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Magnetic>
                <Button href={links.register} size="lg" arrow>
                  Почати безкоштовно
                </Button>
              </Magnetic>
              <Button href="#how" size="lg" variant="secondary">
                <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                Як це працює
              </Button>
            </motion.div>
          </div>
        </div>

        <motion.div
          {...rise(0.9, reduce)}
          data-nocross
          className="order-3 mt-4 px-4 sm:px-6 lg:col-span-5 lg:mt-0 lg:flex lg:justify-end lg:px-0 xl:col-span-4"
        >
          <TradeTicket
            trade={trade}
            pnlRef={pnlEl}
            rRef={rEl}
            reduce={reduce}
          />
        </motion.div>
      </div>

      <Sessions
        compact
        className="order-4 mt-5 flex-wrap px-4 sm:px-6 lg:hidden"
      />
      <Ticker className="order-5 mt-10 lg:mt-0" />
    </section>
  );
}

/** The trade as Traders Care sees it: live while open, a journal verdict once closed. */
function TradeTicket({
  trade,
  pnlRef,
  rRef,
  reduce,
}: {
  trade: TradeEvent;
  pnlRef: React.RefObject<HTMLSpanElement | null>;
  rRef: React.RefObject<HTMLSpanElement | null>;
  reduce: boolean;
}) {
  const closed = trade.phase === "closed";
  const moved = trade.kind === "moved" && trade.phase !== "open";
  const state = closed ? `closed-${trade.kind}` : moved ? "moved" : "open";
  const swap = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: reduce ? 0 : 0.28, ease: EASE },
  };

  return (
    <div
      className="float-card relative w-full rounded-2xl p-4 sm:max-w-[400px] lg:w-[360px]"
      aria-live="polite"
    >
      <div className="flex h-6 items-center justify-between gap-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={state}
            {...swap}
            className="flex items-center gap-2 text-[12.5px]"
          >
            {state === "open" && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-profit/60 motion-reduce:hidden" />
                  <span className="relative h-2 w-2 rounded-full bg-profit" />
                </span>
                <span className="text-ink-2">Позиція відкрита</span>
              </>
            )}
            {state === "moved" && (
              <>
                <TriangleAlert className="h-3.5 w-3.5 text-warn" aria-hidden />
                <span className="text-warn">Стоп пересунуто</span>
              </>
            )}
            {closed && (
              <span className="flex items-center gap-1.5 rounded-full bg-accent/[0.12] py-0.5 pl-1.5 pr-2.5 text-accent">
                <NotebookPen className="h-3.5 w-3.5" aria-hidden />
                Записано в журнал
              </span>
            )}
          </motion.span>
        </AnimatePresence>
        <span className="font-mono text-[11px] text-faint">
          NAS100 · LONG 20
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] text-muted">
            {closed ? "Результат угоди" : "Плаваючий P&L"}
          </div>
          <span
            ref={pnlRef}
            data-sign="pos"
            className="mt-1 block font-mono text-[1.75rem] font-semibold leading-none tracking-[-0.02em] data-[sign=neg]:text-loss data-[sign=pos]:text-profit"
          >
            +$0.00
          </span>
        </div>
        <span
          ref={rRef}
          data-sign="pos"
          className="font-mono text-[13px] text-muted data-[sign=neg]:text-loss/80 data-[sign=pos]:text-profit/80"
        >
          +0.00R
        </span>
      </div>

      <div className="mt-4 h-5 border-t border-ink/[0.07] pt-3 text-[12.5px] leading-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state}
            {...swap}
            className="flex items-center justify-between gap-3 whitespace-nowrap"
          >
            {state === "open" && (
              <span className="font-mono text-[12px] text-muted">
                Ризик {fmtMoney(-RISK, 0).slice(1)} · Ціль{" "}
                {fmtMoney(TARGET, 0).slice(1)} · 2R
              </span>
            )}
            {state === "moved" && (
              <>
                <span className="font-mono text-[12px] text-muted">
                  Ризик ${RISK}{" "}
                  <span className="text-warn">→ ${MOVED_RISK}</span>
                </span>
                <span className="truncate text-[12px] text-faint">
                  «{MISTAKES.stop.rule}»
                </span>
              </>
            )}
            {state === "closed-moved" && (
              <>
                <span className="flex items-center gap-1.5 text-warn">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                  Ціна відхилення
                </span>
                <span className="font-mono text-[14px] font-semibold text-loss">
                  {fmtMoney(-(MOVED_RISK - RISK))}
                </span>
              </>
            )}
            {state === "closed-plan" && (
              <>
                <span className="flex items-center gap-1.5 text-profit">
                  <CircleCheck className="h-3.5 w-3.5" aria-hidden />
                  Всі правила дотримано
                </span>
                <span className="font-mono text-[12px] text-muted">
                  за планом
                </span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Same initial state on server and client; reduced motion only collapses the duration.
function rise(delay: number, reduce: boolean) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.8, delay, ease: EASE },
  };
}

function Line({
  children,
  delay,
  reduce,
}: {
  children: React.ReactNode;
  delay: number;
  reduce: boolean;
}) {
  return (
    <span className="-mt-[0.06em] block overflow-hidden pb-[0.08em] pt-[0.06em]">
      <motion.span
        className="block"
        initial={{ y: "105%", rotate: 2.5 }}
        animate={{ y: "0%", rotate: 0 }}
        transition={
          reduce ? { duration: 0 } : { duration: 1.1, delay, ease: EASE }
        }
      >
        {children}
      </motion.span>
    </span>
  );
}
