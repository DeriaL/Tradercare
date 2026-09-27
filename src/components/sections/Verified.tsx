"use client";

import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { BadgeCheck, EyeOff, Lock, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const EASE = [0.16, 1, 0.3, 1] as const;
const FLIP = { type: "spring", stiffness: 170, damping: 22, mass: 0.9 } as const;
const INSTANT = { duration: 0 } as const;

type Card = {
  title: string;
  url: string;
  sees: string;
  hidden: string;
  caption: string;
  Front: React.ComponentType;
};

const CARDS: Card[] = [
  {
    title: "Публічний профіль",
    url: "traderscare.io/u/range.hunter",
    sees: "Приріст, просадку, win rate і 12 місяців дохідності з брокера.",
    hidden: "Помилки, нотатки, розмір ризику й назва рахунку.",
    caption: "Показує 365 днів торгівлі, підтягнутих від брокера.",
    Front: ProfileCard,
  },
  {
    title: "Перевірена угода",
    url: "traderscare.io/verify/e4b1…9c",
    sees: "Вхід, вихід і результат у R на свічках брокера.",
    hidden: "Розмір ризику, назва рахунку й нотатки до угоди.",
    caption: "Вхід і вихід звірено зі свічками брокера.",
    Front: TradeCard,
  },
  {
    title: "Зафіксований розбір",
    url: "traderscare.io/v/7KQ2M9",
    sees: "P&L тижня, кількість угод, win rate і Care Score.",
    hidden: "Помилки, нотатки й назва рахунку.",
    caption: "Цифри тижня заморожені й збігаються з журналом.",
    Front: RecapCard,
  },
];

/* closed hand -> open fan. x is a share of the card's own width */
type Pose = { rot: number[]; x: string[]; y: number[]; z: number };
const FAN: Pose[] = [
  { rot: [-3, -12], x: ["-5%", "-38%"], y: [4, 24], z: 1 },
  { rot: [0, 0], x: ["0%", "0%"], y: [0, 0], z: 3 },
  { rot: [3, 12], x: ["5%", "38%"], y: [4, 24], z: 2 },
];

type FlipState = {
  flipped: boolean[];
  onToggle: (i: number) => void;
  reduce: boolean;
};

export function Verified() {
  const reduce = useSafeReducedMotion();
  const [flipped, setFlipped] = useState([false, false, false]);
  const onToggle = (i: number) => setFlipped((f) => f.map((v, j) => (j === i ? !v : v)));

  return (
    <section id="verified" className="relative overflow-x-clip py-24 sm:py-32">
      <div className="container-page">
        <Reveal className="max-w-[44rem]">
          <h2 className="t-h2">Результати, які не підробиш</h2>
          <p className="t-lead mt-5 max-w-[38rem]">
            Угоди приходять від брокера і закриті для редагування. Ділися профілем, угодою чи розбором через посилання, яке
            перевірить будь-хто.
          </p>
        </Reveal>

        <Fan flipped={flipped} onToggle={onToggle} reduce={reduce} />
        <Carousel flipped={flipped} onToggle={onToggle} reduce={reduce} />

        <Reveal className="mx-auto mt-14 flex max-w-[40rem] items-start justify-center gap-3 text-[14px] leading-relaxed text-muted sm:mt-20 sm:items-center">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
          <span>Помилки, нотатки, розмір ризику й назва рахунку в публічні посилання не потрапляють.</span>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- md+: a hand of cards that opens with scroll ---------- */

function Fan({ flipped, onToggle, reduce }: FlipState) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 220, damping: 32 });
  // reduced motion pins the fan open; set after mount so hydration sees the closed pose
  const pinned = useMotionValue(0);
  useEffect(() => pinned.set(reduce ? 1 : 0), [reduce, pinned]);
  const p = useTransform([smooth, pinned], ([s, r]: number[]) => (r ? 1 : s));

  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const active = hovered ?? focused;

  return (
    <div className="hidden md:block">
      <div ref={ref} className="mt-16 grid justify-items-center pb-24 pt-12 lg:mt-20">
        {CARDS.map((card, i) => (
          <FanCard
            key={card.url}
            card={card}
            pose={FAN[i]}
            p={p}
            lifted={active === i}
            dimmed={active !== null && active !== i}
            flipped={flipped[i]}
            onToggle={() => onToggle(i)}
            reduce={reduce}
            onHover={(on) => setHovered((h) => (on ? i : h === i ? null : h))}
            onFocusChange={(on) => setFocused((f) => (on ? i : f === i ? null : f))}
          />
        ))}
      </div>

      <ul className="mx-auto grid max-w-[36rem] grid-cols-3 gap-5 text-center lg:max-w-[44rem] lg:gap-6">
        {CARDS.map((card) => (
          <li key={card.url}>
            <Caption card={card} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FanCard({
  card,
  pose,
  p,
  lifted,
  dimmed,
  flipped,
  onToggle,
  reduce,
  onHover,
  onFocusChange,
}: {
  card: Card;
  pose: Pose;
  p: MotionValue<number>;
  lifted: boolean;
  dimmed: boolean;
  flipped: boolean;
  onToggle: () => void;
  reduce: boolean;
  onHover: (on: boolean) => void;
  onFocusChange: (on: boolean) => void;
}) {
  const rotate = useTransform(p, [0, 1], pose.rot);
  const x = useTransform(p, [0, 1], pose.x);
  const y = useTransform(p, [0, 1], pose.y);

  return (
    <motion.div
      style={{ rotate, x, y, zIndex: lifted ? 10 : pose.z, transformOrigin: "50% 160%" }}
      className="w-[272px] self-start will-change-transform [grid-area:1/1] lg:w-[356px]"
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <motion.div
        initial={false}
        animate={{ y: lifted ? -18 : 0, scale: lifted ? 1.03 : 1, opacity: dimmed ? 0.6 : 1 }}
        transition={reduce ? INSTANT : { duration: 0.45, ease: EASE }}
      >
        <FlipCard
          card={card}
          flipped={flipped}
          onToggle={onToggle}
          reduce={reduce}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
        />
      </motion.div>
    </motion.div>
  );
}

/* ---------- below md: swipeable row ---------- */

function Carousel({ flipped, onToggle, reduce }: FlipState) {
  const scroller = useRef<HTMLUListElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const ratios = CARDS.map(() => 0);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios[Number((e.target as HTMLElement).dataset.i)] = e.intersectionRatio;
        let best = 0;
        ratios.forEach((r, i) => {
          if (r > ratios[best]) best = i;
        });
        setCurrent(best);
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    items.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (i: number) => {
    const root = scroller.current;
    const el = items.current[i];
    if (!root || !el) return;
    const pad = parseFloat(getComputedStyle(root).scrollPaddingLeft) || 0;
    root.scrollTo({ left: el.offsetLeft - pad, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="mt-12 md:hidden">
      <ul
        ref={scroller}
        data-lenis-prevent-horizontal
        aria-label="Приклади публічних посилань"
        className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {CARDS.map((card, i) => (
          <li
            key={card.url}
            data-i={i}
            ref={(el) => {
              items.current[i] = el;
            }}
            className="w-[84vw] max-w-[380px] shrink-0 snap-start"
          >
            <FlipCard card={card} flipped={flipped[i]} onToggle={() => onToggle(i)} reduce={reduce} />
            <div className="mt-4 px-1">
              <Caption card={card} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex justify-center">
        {CARDS.map((card, i) => (
          <button
            key={card.url}
            type="button"
            aria-label={`Показати картку: ${card.title}`}
            aria-current={current === i ? "true" : undefined}
            onClick={() => go(i)}
            className="grid h-11 w-8 place-items-center"
          >
            <span
              className={cn(
                "block h-1.5 w-1.5 rounded-full transition-[transform,background-color] duration-300 ease-out motion-reduce:transition-none",
                current === i ? "scale-[1.4] bg-accent" : "bg-ink/25",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Caption({ card }: { card: Card }) {
  return (
    <>
      <div className="text-[15px] font-medium text-ink">{card.title}</div>
      <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{card.caption}</p>
    </>
  );
}

/* ---------- the card: front is the shared page, back says what the link exposes ---------- */

function FlipCard({
  card,
  flipped,
  onToggle,
  reduce,
  onFocus,
  onBlur,
}: {
  card: Card;
  flipped: boolean;
  onToggle: () => void;
  reduce: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const id = useId();
  const frontId = `${id}-front`;
  const backId = `${id}-back`;
  const Front = card.Front;

  return (
    <button
      type="button"
      aria-pressed={flipped}
      aria-label={`Показати, що відкриває посилання: ${card.title}`}
      aria-describedby={flipped ? backId : frontId}
      onClick={onToggle}
      onFocus={onFocus}
      onBlur={onBlur}
      className="block w-full cursor-pointer rounded-[20px] text-left [perspective:1400px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <motion.div
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? INSTANT : FLIP}
        className="grid [transform-style:preserve-3d]"
      >
        <div id={frontId} aria-hidden={flipped} className="[backface-visibility:hidden] [grid-area:1/1] [&>article]:h-full">
          <Front />
        </div>
        <div
          id={backId}
          aria-hidden={!flipped}
          className="flex flex-col rounded-[20px] bg-accent p-5 text-accent-ink [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)] lg:p-6"
        >
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-[1.3rem] font-semibold leading-tight tracking-[-0.02em]">{card.title}</span>
          </div>
          <div className="num mt-3 flex min-w-0 items-center gap-1.5 self-start rounded-lg bg-accent-ink/[0.08] px-2.5 py-1.5 text-[12px] font-medium">
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{card.url}</span>
          </div>
          <dl className="mt-5 space-y-4 text-[14px] leading-snug">
            <div>
              <dt className="text-[12px] font-medium text-accent-ink/65">Бачить будь-хто</dt>
              <dd className="mt-1">{card.sees}</dd>
            </div>
            <div>
              <dt className="text-[12px] font-medium text-accent-ink/65">Лишається приватним</dt>
              <dd className="mt-1">{card.hidden}</dd>
            </div>
          </dl>
          <div className="mt-auto flex items-center gap-1.5 pt-5 text-[12.5px] text-accent-ink/70">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Натисни, щоб повернути
          </div>
        </div>
      </motion.div>
    </button>
  );
}

function Url({ children }: { children: React.ReactNode }) {
  return (
    <div className="num flex items-center gap-1.5 rounded-lg bg-ink/[0.04] px-2.5 py-1.5 text-[11.5px] text-muted">
      <Lock className="h-3 w-3" aria-hidden />
      {children}
    </div>
  );
}

function Verified_({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/[0.12] px-2 py-0.5 text-[11px] font-medium text-accent">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      {children}
    </span>
  );
}

/* ---------- public profile ---------- */

const MONTHS = [2.1, 3.4, -1.2, 4.8, 1.6, 5.2, -0.8, 3.9, 2.7, 6.1, 1.9, 7.8];

function ProfileCard() {
  const max = Math.max(...MONTHS.map(Math.abs));
  return (
    <article className="window p-5">
      <Url>traderscare.io/u/range.hunter</Url>
      <div className="mt-4 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-3 text-[14px] font-semibold text-ink">RH</span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-ink">range.hunter</div>
          <Verified_>365 днів з брокера</Verified_>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-2">
        {[
          ["Приріст", "+38.4%", "text-profit"],
          ["Макс. просадка", "6.1%", "text-ink"],
          ["Win rate", "54%", "text-ink"],
          ["Profit factor", "1.71", "text-ink"],
        ].map(([k, v, c]) => (
          <div key={k} className="rounded-xl bg-surface-2/60 p-3 hairline">
            <dt className="text-[11.5px] text-muted">{k}</dt>
            <dd className={cn("num mt-0.5 text-[1.05rem] font-semibold", c)}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex h-16 items-end gap-1" aria-label="Дохідність за 12 місяців">
        {MONTHS.map((m, i) => (
          <span key={i} className="flex h-full flex-1 flex-col justify-end">
            <span
              className={cn("block w-full rounded-[3px]", m >= 0 ? "bg-profit/70" : "bg-loss/70")}
              style={{ height: `${(Math.abs(m) / max) * 100}%` }}
            />
          </span>
        ))}
      </div>
    </article>
  );
}

/* ---------- verified trade with broker candles ---------- */

function candles() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: { o: number; c: number; h: number; l: number }[] = [];
  let p = 1.1726;
  for (let i = 0; i < 34; i++) {
    const drift = i < 13 ? -0.00018 : i < 30 ? 0.00042 : -0.0001;
    const o = p;
    const c = o + drift + (rnd() - 0.5) * 0.0009;
    const h = Math.max(o, c) + rnd() * 0.00035;
    const l = Math.min(o, c) - rnd() * 0.00035;
    out.push({ o, c, h, l });
    p = c;
  }
  return out;
}
const CANDLES = candles();
const ENTRY = 13;
const EXIT = 29;

function TradeCard() {
  const W = 300;
  const H = 150;
  const lo = Math.min(...CANDLES.map((c) => c.l));
  const hi = Math.max(...CANDLES.map((c) => c.h));
  const y = (v: number) => 8 + (1 - (v - lo) / (hi - lo)) * (H - 16);
  const step = W / CANDLES.length;
  const entryY = y(CANDLES[ENTRY].c);
  const exitY = y(CANDLES[EXIT].c);
  return (
    <article className="window p-5">
      <Url>traderscare.io/verify/e4b1…9c</Url>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <div className="num text-[15px] font-medium text-ink">EURUSD · Long</div>
          <div className="num mt-0.5 text-[12px] text-muted">30 вер, Лондон</div>
        </div>
        <div className="text-right">
          <div className="num text-[1.05rem] font-semibold text-profit">+2.1R</div>
          <Verified_>підтверджено</Verified_>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 block h-auto w-full" aria-label="Графік угоди зі свічками від брокера">
        <rect x={ENTRY * step} y={Math.min(entryY, exitY)} width={(EXIT - ENTRY) * step} height={Math.abs(exitY - entryY)} fill="oklch(var(--profit) / 0.08)" />
        <line x1={ENTRY * step} x2={W} y1={entryY} y2={entryY} stroke="oklch(var(--ink) / 0.35)" strokeDasharray="3 4" />
        <line x1={EXIT * step} x2={W} y1={exitY} y2={exitY} stroke="oklch(var(--profit) / 0.6)" strokeDasharray="3 4" />
        {CANDLES.map((c, i) => {
          const up = c.c >= c.o;
          const x = i * step + step / 2;
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={up ? "oklch(var(--profit) / 0.8)" : "oklch(var(--loss) / 0.8)"} strokeWidth={1} />
              <rect
                x={x - step * 0.32}
                y={y(Math.max(c.o, c.c))}
                width={step * 0.64}
                height={Math.max(1.2, Math.abs(y(c.o) - y(c.c)))}
                rx={1}
                fill={up ? "oklch(var(--profit))" : "oklch(var(--loss))"}
              />
            </g>
          );
        })}
        <circle cx={ENTRY * step + step / 2} cy={entryY} r={4} fill="oklch(var(--ink))" stroke="oklch(var(--surface))" strokeWidth={2} />
        <circle cx={EXIT * step + step / 2} cy={exitY} r={4} fill="oklch(var(--accent))" stroke="oklch(var(--surface))" strokeWidth={2} />
      </svg>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Знімок заморожено. Свічки й ціни взяті від брокера, а не з журналу.</p>
    </article>
  );
}

/* ---------- verified recap ---------- */

function RecapCard() {
  return (
    <article className="window p-5">
      <Url>traderscare.io/v/7KQ2M9</Url>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[15px] font-medium text-ink">Розбір · тиждень 39</span>
        <Verified_>збігається</Verified_>
      </div>
      <ul className="mt-4 space-y-2.5 text-[13px]">
        {[
          ["P&L тижня", "+1.49%"],
          ["Угод", "10"],
          ["Win rate", "50%"],
          ["Care Score", "78"],
        ].map(([k, v]) => (
          <li key={k} className="flex justify-between border-b border-ink/[0.06] pb-2.5 last:border-0">
            <span className="text-muted">{k}</span>
            <span className="num text-ink">{v}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">Метрики зафіксовано 26 вер о 09:14. Після цього їх не змінити.</p>
    </article>
  );
}
