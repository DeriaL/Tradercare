"use client";

import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef, useState } from "react";
import { ConnectPreview, JournalPreview, ReviewPreview } from "@/components/previews/Steps";
import { scrollToY } from "@/components/site/SmoothScroll";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    short: "Підключи",
    title: "Підключи рахунок",
    text: "MetaTrader підключається паролем інвестора, cTrader через OAuth, Match-Trader і DXtrade через розширення для браузера. Доступ лише на читання: ми бачимо угоди, але не можемо їх відкривати.",
    Preview: ConnectPreview,
  },
  {
    short: "Торгуй",
    title: "Торгуй як завжди",
    text: "Угоди підтягуються самі, до кожних 5 хвилин. Ти позначаєш сетап і помилку у два кліки. Одна ідея на кількох рахунках стає одним рядком.",
    Preview: JournalPreview,
  },
  {
    short: "Розбирай",
    title: "Розбирай тиждень",
    text: "Розбір збирається автоматично: KPI, найкращі угоди, ціна помилок. Додаєш висновки, фіксуєш метрики й ділишся перевіреним посиланням.",
    Preview: ReviewPreview,
  },
];
const LAST = STEPS.length - 1;

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="relative">
      <Track />
      <Swipe />
    </section>
  );
}

/**
 * Desktop: vertical scroll drives a horizontal track. Three exhibits slide past like a coverflow:
 * the one in the middle faces you, the neighbours turn away and dim.
 */
function Track() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(-1);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // continuous position on the track: 0 = first step centred, 2 = last
  const q = useTransform(scrollYProgress, [0.1, 0.9], [0, LAST], { clamp: true });
  const x = useTransform(q, (v) => `calc(${-v} * (var(--pw) + var(--gap)))`);
  const fill = useTransform(q, [0, LAST], [0, 1]);

  useMotionValueEvent(q, "change", (v) => {
    const i = Math.round(v);
    setStep((s) => (s === i ? s : i));
    setSeen((s) => (i > s ? i : s));
  });

  const jump = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    scrollToY(top + travel * (0.1 + (0.8 * i) / LAST));
  };

  return (
    <div ref={ref} className="relative hidden h-[340vh] lg:block motion-reduce:lg:!hidden">
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden pb-8 pt-[calc(var(--nav-h)+2.5rem)] [--gap:56px] [--pw:min(860px,60vw)]">
        <div className="container-page flex items-end justify-between gap-10">
          <h2 id="how-title" className="t-h2 max-w-[34rem] text-[clamp(2rem,1.2rem+2vw,3rem)]">
            Від угоди до висновку за три кроки
          </h2>
          <Rail step={step} fill={fill} onJump={jump} />
        </div>

        <div className="relative mt-8 min-h-0 flex-1 [perspective:1600px]">
          <motion.ol
            style={{ x }}
            className="flex h-full gap-[var(--gap)] pl-[calc((100%-var(--pw))/2)] will-change-transform"
          >
            {STEPS.map((s, i) => (
              <Exhibit key={s.title} i={i} q={q} active={seen >= i} {...s} />
            ))}
          </motion.ol>
        </div>
      </div>
    </div>
  );
}

function Rail({ step, fill, onJump }: { step: number; fill: MotionValue<number>; onJump: (i: number) => void }) {
  return (
    <div className="w-[360px] shrink-0 pb-2">
      <div className="relative h-px bg-ink/[0.1]">
        <motion.span style={{ scaleX: fill }} className="absolute inset-0 origin-left bg-accent" />
      </div>
      <ol className="mt-3 flex justify-between">
        {STEPS.map((s, i) => (
          <li key={s.short}>
            <button
              type="button"
              onClick={() => onJump(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full py-1.5 text-[14px] transition-colors duration-300",
                i === step ? "text-ink" : "text-faint hover:text-muted",
              )}
            >
              <span className={cn("num text-[12px] transition-colors", i <= step ? "text-accent" : "text-faint")}>0{i + 1}</span>
              {s.short}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Exhibit({
  i,
  q,
  active,
  title,
  text,
  Preview,
}: (typeof STEPS)[number] & { i: number; q: MotionValue<number>; active: boolean }) {
  // distance from the centre of the viewport, in exhibits
  const d = useTransform(q, (v) => i - v);
  const rotateY = useTransform(d, [-1, 0, 1], [14, 0, -14]);
  const scale = useTransform(d, [-1, 0, 1], [0.93, 1, 0.93]);
  const opacity = useTransform(d, [-1.2, 0, 1.2], [0.38, 1, 0.38]);

  return (
    <motion.li
      style={{ rotateY, scale, opacity }}
      className="flex h-full w-[var(--pw)] shrink-0 flex-col will-change-transform"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-raised hairline">
        {/* the step number as a large outline behind the exhibit, drifting against the track */}
        <span
          aria-hidden
          style={{ WebkitTextStroke: "1.5px oklch(var(--ink) / 0.12)" }}
          className="num pointer-events-none absolute -bottom-12 right-2 select-none text-[14rem] font-semibold leading-none tracking-[-0.06em] text-transparent"
        >
          0{i + 1}
        </span>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_45%_at_50%_100%,oklch(var(--accent)/0.07),transparent_75%)]" />
        <div className="relative flex h-full items-center justify-center p-8">
          <div className="w-full max-w-[540px] origin-center [@media(max-height:820px)]:scale-[0.88]">
            <Preview active={active} />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-baseline gap-5">
        <span className="num text-[14px] text-accent">0{i + 1}</span>
        <div>
          <h3 className="t-h3 text-[1.5rem]">{title}</h3>
          <p className="mt-2 max-w-[40rem] text-[15px] leading-relaxed text-ink-2">{text}</p>
        </div>
      </div>
    </motion.li>
  );
}

/** Phones, tablets and reduced motion: a native swipe row, each step playing when it comes into view. */
function Swipe() {
  return (
    <div className="py-24 sm:py-28 lg:hidden motion-reduce:lg:!block">
      <Reveal className="container-page">
        <h2 className="t-h2">Від угоди до висновку за три кроки</h2>
      </Reveal>
      <ol
        data-lenis-prevent-horizontal
        className="mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingInline: "16px" }}
      >
        {STEPS.map((s, i) => (
          <SwipeStep key={s.title} i={i} {...s} />
        ))}
      </ol>
    </div>
  );
}

function SwipeStep({ i, title, text, Preview }: (typeof STEPS)[number] & { i: number }) {
  const [active, setActive] = useState(false);
  return (
    <motion.li
      onViewportEnter={() => setActive(true)}
      viewport={{ once: true, amount: 0.55 }}
      className="w-[86vw] max-w-[560px] shrink-0 snap-start"
    >
      <div className="rounded-2xl bg-raised p-3 hairline sm:p-4">
        <Preview active={active} />
      </div>
      <div className="mt-5 flex items-baseline gap-4 pr-2">
        <span className="num text-[13px] text-accent">0{i + 1}</span>
        <div>
          <h3 className="t-h3 text-[1.25rem]">{title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{text}</p>
        </div>
      </div>
    </motion.li>
  );
}
