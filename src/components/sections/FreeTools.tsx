"use client";

import { ArrowUpRight, ChevronDown, Minus, Plus } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ACCOUNT } from "@/lib/demo";
import { cn } from "@/lib/cn";
import { links } from "@/lib/links";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;

// same inputs as the product's Position size tool: instrument, balance, risk, entry, stop.
// USD-quoted instruments only, so pip value needs no FX conversion
const INSTRUMENTS = [
  {
    id: "EURUSD",
    contract: 100_000,
    pip: 0.0001,
    entry: "1.1742",
    stop: "1.1722",
  },
  {
    id: "GBPUSD",
    contract: 100_000,
    pip: 0.0001,
    entry: "1.3425",
    stop: "1.3400",
  },
  {
    id: "AUDUSD",
    contract: 100_000,
    pip: 0.0001,
    entry: "0.6618",
    stop: "0.6600",
  },
  { id: "XAUUSD", contract: 100, pip: 0.1, entry: "3350.0", stop: "3344.0" },
] as const;
type InstId = (typeof INSTRUMENTS)[number]["id"];

const RISK_MIN = 0.1;
const RISK_MAX = 2;
const RISK_STEP = 0.05;
const DEFAULT_RISK = (ACCOUNT.riskPerTrade * 100) / ACCOUNT.start;

const lotFmt = (v: number) => v.toFixed(2);
const usdFmt = (v: number) =>
  `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const parse = (s: string) => {
  const v = Number(s.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(v) ? v : NaN;
};

const TOOL_LINKS = [
  "Симулятор ризику",
  "Консистентність і виплата",
  "Усі інструменти",
];

export function FreeTools() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const reduce = useSafeReducedMotion();
  // reduced motion skips the entrance entirely: everything sits in its final state
  const shown = inView || reduce;

  return (
    <section id="tools" className="relative py-24 sm:py-32">
      <div ref={ref} className="container-page">
        <motion.div
          className="lg:flex lg:items-end lg:justify-between lg:gap-16"
          initial={{ opacity: 0, y: 16 }}
          animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
        >
          <h2 className="t-h2 max-w-[16ch]">Порахуй лот, поки читаєш</h2>
          <div className="mt-5 max-w-[27rem] lg:mt-0 lg:shrink-0">
            <p className="t-lead">
              Розмір позиції: один із безкоштовних інструментів Traders Care.
              Без реєстрації, нічого не зберігається.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-5">
              {TOOL_LINKS.map((t) => (
                <li key={t}>
                  <a
                    href={links.tools}
                    className="group inline-flex min-h-11 items-center gap-1 text-[15px] text-ink-2 transition-colors hover:text-ink"
                  >
                    {t}
                    <ArrowUpRight
                      className="h-4 w-4 text-muted transition-transform group-hover:-translate-y-px group-hover:translate-x-px"
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <Calculator shown={shown} reduce={reduce} />
      </div>
    </section>
  );
}

function Calculator({ shown, reduce }: { shown: boolean; reduce: boolean }) {
  const uid = useId();
  const [inst, setInst] = useState<InstId>("EURUSD");
  const [balance, setBalance] = useState(String(ACCOUNT.start));
  // text and number kept apart so a half-typed "0." survives until it parses
  const [riskText, setRiskText] = useState(String(DEFAULT_RISK));
  const [entry, setEntry] = useState<string>(INSTRUMENTS[0].entry);
  const [stop, setStop] = useState<string>(INSTRUMENTS[0].stop);
  const [settled, setSettled] = useState(false);

  // the word mask clips focus rings, so it comes off once the entrance is over
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setSettled(true), reduce ? 0 : 1200);
    return () => clearTimeout(t);
  }, [shown, reduce]);

  const I = INSTRUMENTS.find((i) => i.id === inst)!;
  const pick = (id: InstId) => {
    const next = INSTRUMENTS.find((i) => i.id === id)!;
    setInst(id);
    setEntry(next.entry);
    setStop(next.stop);
  };

  const b = parse(balance);
  const risk = parse(riskText);
  const e = parse(entry);
  const s = parse(stop);
  const balanceErr = !(b > 0) ? "Вкажи баланс більше нуля" : "";
  const riskErr = !(risk >= RISK_MIN && risk <= RISK_MAX)
    ? "Ризик від 0.1% до 2%"
    : "";
  const entryErr = !(e > 0) ? "Вкажи ціну входу" : "";
  const stopErr = !(s > 0)
    ? "Вкажи ціну стопа"
    : e > 0 && s === e
      ? "Стоп має відрізнятися від входу"
      : "";
  const valid = !balanceErr && !riskErr && !entryErr && !stopErr;
  const firstErr = balanceErr || riskErr || entryErr || stopErr;
  const errId = `${uid}-err`;

  const riskUsd = b > 0 && !riskErr ? (b * risk) / 100 : 0;
  // prices come in as decimals (1.1742 - 1.1722 = 0.0020000000000000018), so snap the distance to 1/1000 pip first
  const pips = valid ? Math.round((Math.abs(e - s) / I.pip) * 1000) / 1000 : 0;
  const pipValue = I.pip * I.contract;
  const lot = valid
    ? Math.floor((riskUsd / (pips * pipValue)) * 100 + 1e-9) / 100
    : 0; // broker step 0.01, never round risk up
  const tooSmall = valid && lot < 0.01;
  const side = valid ? (s < e ? "Long" : "Short") : "";

  const stepRisk = (dir: 1 | -1) => {
    const base = Number.isFinite(risk) ? risk : DEFAULT_RISK;
    const next = clamp(
      Math.round((base + dir * RISK_STEP) * 100) / 100,
      RISK_MIN,
      RISK_MAX,
    );
    setRiskText(String(next));
  };

  const live = valid && lot >= 0.01;
  const shownValue = lotFmt(shown && live ? lot : 0);

  let n = 0; // stagger index, in reading order
  const word = (children: ReactNode, className?: string) => (
    <Mask
      i={n++}
      shown={shown}
      reduce={reduce}
      settled={settled}
      className={className}
    >
      {children}
    </Mask>
  );

  return (
    <div className="mt-14 sm:mt-20">
      <form
        onSubmit={(ev) => ev.preventDefault()}
        aria-label="Калькулятор розміру позиції"
      >
        <p
          className="max-w-[62rem] font-medium text-muted"
          style={{
            fontSize: "clamp(1.5rem, 0.9rem + 2.4vw, 3rem)",
            lineHeight: 1.45,
            letterSpacing: "-0.02em",
          }}
        >
          {word("Торгую")}{" "}
          {word(
            <Slot>
              <select
                id={`${uid}-inst`}
                aria-label="Інструмент"
                value={inst}
                onChange={(ev) => pick(ev.target.value as InstId)}
                className="num h-[max(44px,1.35em)] cursor-pointer appearance-none bg-transparent pr-[0.85em] text-ink"
              >
                {INSTRUMENTS.map((i) => (
                  <option
                    key={i.id}
                    value={i.id}
                    className="bg-surface text-base text-ink"
                  >
                    {i.id}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-0 top-1/2 h-[0.6em] w-[0.6em] -translate-y-1/2 text-muted"
                strokeWidth={2.25}
                aria-hidden
              />
            </Slot>,
          )}{" "}
          {word("на")} {word("рахунку")}{" "}
          {word(
            <>
              <Slot invalid={!!balanceErr}>
                <span className="mr-[0.2em] text-muted" aria-hidden>
                  $
                </span>
                <SlotInput
                  id={`${uid}-bal`}
                  label="Баланс рахунку в доларах"
                  value={balance}
                  onChange={setBalance}
                  invalid={!!balanceErr}
                  errId={errId}
                />
              </Slot>
              ,
            </>,
          )}{" "}
          {word("ризикую")}{" "}
          {word(
            <>
              <Slot invalid={!!riskErr}>
                <SlotInput
                  id={`${uid}-risk`}
                  label="Ризик на угоду у відсотках"
                  value={riskText}
                  onChange={setRiskText}
                  invalid={!!riskErr}
                  errId={errId}
                />
                <span className="ml-[0.15em] text-muted" aria-hidden>
                  %
                </span>
              </Slot>
              <span className="ml-[0.3em] inline-flex gap-1.5 align-middle">
                <StepButton label="Зменшити ризик" onClick={() => stepRisk(-1)}>
                  <Minus className="h-4 w-4" aria-hidden />
                </StepButton>
                <StepButton label="Збільшити ризик" onClick={() => stepRisk(1)}>
                  <Plus className="h-4 w-4" aria-hidden />
                </StepButton>
              </span>
            </>,
            "whitespace-nowrap",
          )}{" "}
          {word("на")} {word("угоду.")} {word("Вхід")}{" "}
          {word(
            <>
              <Slot invalid={!!entryErr}>
                <SlotInput
                  id={`${uid}-entry`}
                  label="Ціна входу"
                  value={entry}
                  onChange={setEntry}
                  placeholder={I.entry}
                  invalid={!!entryErr}
                  errId={errId}
                />
              </Slot>
              ,
            </>,
          )}{" "}
          {word("стоп")}{" "}
          {word(
            <>
              <Slot invalid={!!stopErr}>
                <SlotInput
                  id={`${uid}-stop`}
                  label="Ціна стоп-лосу"
                  value={stop}
                  onChange={setStop}
                  placeholder={I.stop}
                  invalid={!!stopErr}
                  errId={errId}
                />
              </Slot>
              .
            </>,
          )}
        </p>
        <p
          id={errId}
          aria-live="polite"
          className="mt-3 min-h-6 text-[15px] text-loss"
        >
          {firstErr}
        </p>
      </form>

      <output
        htmlFor={`${uid}-inst ${uid}-bal ${uid}-risk ${uid}-entry ${uid}-stop`}
        aria-live="polite"
        className="mt-8 block sm:mt-10 lg:flex lg:items-end lg:justify-between lg:gap-16"
      >
        <p
          className="num flex min-w-0 flex-wrap items-baseline gap-x-[0.16em] font-semibold leading-none tracking-[-0.04em]"
          style={{ fontSize: readoutSize(shownValue.length) }}
        >
          <span className="font-light text-faint" aria-hidden>
            =
          </span>
          <Odometer
            value={shownValue}
            reduce={reduce}
            slow={!settled}
            className={cn(
              "transition-colors duration-300",
              live ? "text-accent" : "text-faint",
            )}
          />
          <span className="text-[0.25em] font-medium tracking-[-0.01em] text-ink-2">
            лота
          </span>
          <span className="sr-only">{`${live ? lotFmt(lot) : "0.00"} лота`}</span>
        </p>

        <span className="mt-10 block w-full lg:mt-0 lg:w-[22rem] lg:shrink-0">
          <dl className="divide-y divide-ink/[0.08] border-y border-ink/[0.08] text-[15px]">
            <Spec term="Ризик">{usdFmt(riskUsd)}</Spec>
            <Spec term="Стоп">{valid ? `${pips.toFixed(1)} пп` : "н/д"}</Spec>
            <Spec term="Вартість пункту">{usdFmt(pipValue)} / лот</Spec>
            <Spec term="Напрям">
              {side ? (
                <span className="inline-flex items-center rounded-full bg-ink/[0.08] px-2.5 py-0.5 text-[13px] text-ink hairline">
                  {side}
                </span>
              ) : (
                <span className="text-faint">н/д</span>
              )}
            </Spec>
          </dl>
          {tooSmall && (
            <span className="block pt-3 text-[14px] leading-snug text-ink-2">
              Менше мінімального лота 0.01. Збільш ризик або відсунь стоп.
            </span>
          )}
        </span>
      </output>
    </div>
  );
}

/** One word of the sentence: rises out of a clip that sits on its own line box. */
function Mask({
  i,
  shown,
  reduce,
  settled,
  className,
  children,
}: {
  i: number;
  shown: boolean;
  reduce: boolean;
  settled: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    // clip-path rather than overflow-hidden: overflow would move the inline-block baseline to its bottom edge
    <span
      className={cn(
        "inline-block",
        !settled && "[clip-path:inset(-1em_-1em_0_-1em)]",
        className,
      )}
    >
      <motion.span
        className="inline-block"
        initial={{ y: "110%" }}
        animate={{ y: shown ? "0%" : "110%" }}
        transition={{
          duration: reduce ? 0 : 0.6,
          delay: reduce ? 0 : i * 0.035,
          ease: EASE,
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Slot({
  invalid,
  children,
}: {
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="group/slot relative inline-flex items-baseline text-ink">
      {children}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-[0.12em] h-[2px] rounded-full transition-colors duration-200",
          invalid
            ? "bg-loss"
            : "bg-ink/[0.18] group-focus-within/slot:bg-accent",
        )}
      />
    </label>
  );
}

function SlotInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  invalid,
  errId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid: boolean;
  errId: string;
}) {
  return (
    <input
      id={id}
      aria-label={label}
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={value}
      placeholder={placeholder}
      onChange={(ev) => onChange(ev.target.value)}
      aria-invalid={invalid}
      aria-describedby={invalid ? errId : undefined}
      className="num h-[max(44px,1.35em)] min-w-0 bg-transparent p-0 text-ink placeholder:text-faint"
      style={{
        width: `${Math.max((value || placeholder || "").length, 3) + 0.6}ch`,
      }}
    />
  );
}

function StepButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      // 36px visual, the pseudo-element widens the hit area to 44px
      className="relative inline-grid h-9 w-9 place-items-center rounded-full bg-ink/[0.06] text-ink-2 transition-colors hairline after:absolute after:-inset-1 after:content-[''] hover:bg-ink/[0.1] hover:text-ink"
    >
      {children}
    </button>
  );
}

function Spec({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <dt className="text-muted">{term}</dt>
      <dd className="num text-ink">{children}</dd>
    </div>
  );
}

/** Mechanical counter: each digit is a 0-9 strip sliding inside a one-line window. */
function Odometer({
  value,
  reduce,
  slow,
  className,
}: {
  value: string;
  reduce: boolean;
  slow: boolean;
  className?: string;
}) {
  const chars = value.split("");
  return (
    <span className={cn("inline-flex items-baseline", className)} aria-hidden>
      {chars.map((c, i) => {
        // keyed from the right so a new leading digit does not re-roll the ones after it
        const pos = chars.length - 1 - i;
        return /\d/.test(c) ? (
          <Digit key={`d${pos}`} d={Number(c)} reduce={reduce} slow={slow} />
        ) : (
          <span key={`s${pos}`} className="leading-none">
            {c}
          </span>
        );
      })}
    </span>
  );
}

function Digit({
  d,
  reduce,
  slow,
}: {
  d: number;
  reduce: boolean;
  slow: boolean;
}) {
  return (
    // clip-path keeps the text baseline of the sizer, overflow-hidden would not
    <span className="relative inline-block leading-none [clip-path:inset(0)]">
      <span className="invisible">0</span>
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col"
        initial={{ y: "0%" }}
        animate={{ y: `-${d * 10}%` }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", visualDuration: slow ? 0.85 : 0.5, bounce: 0 }
        }
      >
        {DIGITS.map((n) => (
          <span key={n} className="block h-[1em] leading-none">
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

// long values step the display size down so the readout never overflows a 390px screen
function readoutSize(len: number) {
  if (len <= 5) return "clamp(4.5rem, 2rem + 9vw, 10rem)";
  if (len <= 7) return "clamp(3.25rem, 1.5rem + 6.5vw, 8rem)";
  return "clamp(2.25rem, 1rem + 4.5vw, 6rem)";
}
