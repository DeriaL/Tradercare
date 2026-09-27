"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  BookOpen,
  CalendarRange,
  ChartColumn,
  Gauge,
  Landmark,
  LayoutDashboard,
  NotebookPen,
  Plus,
  Sparkles,
  StickyNote,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/ui/Magnetic";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { links } from "@/lib/links";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const DOCK: { icon: LucideIcon; label: string; mobile?: boolean }[] = [
  { icon: Plus, label: "Нова угода", mobile: true },
  { icon: LayoutDashboard, label: "Дашборд", mobile: true },
  { icon: CalendarRange, label: "План" },
  { icon: NotebookPen, label: "Журнал", mobile: true },
  { icon: ChartColumn, label: "Статистика", mobile: true },
  { icon: Gauge, label: "Розбори" },
  { icon: TriangleAlert, label: "Помилки" },
  { icon: StickyNote, label: "Нотатки" },
  { icon: Wallet, label: "Рахунки", mobile: true },
  { icon: BookOpen, label: "Торгова система" },
  { icon: Landmark, label: "Проп-фірми" },
  { icon: Sparkles, label: "Асистент", mobile: true },
];

// The app ships 12 accents. Same OKLCH channels format as --accent in tokens.css.
// ink = text placed on the accent: dark when L >= 0.72, near white below that.
const ACCENTS = [
  { name: "Лайм", v: "0.915 0.2 124", ink: "0.2 0.035 124" },
  { name: "Care", v: "0.66 0.178 287", ink: "0.985 0.01 287" }, // CARE violet #8D7CF8, the product default
  { name: "М'ята", v: "0.83 0.14 165", ink: "0.2 0.035 165" },
  { name: "Бірюза", v: "0.82 0.12 195", ink: "0.2 0.035 195" },
  { name: "Небо", v: "0.78 0.12 235", ink: "0.2 0.035 235" },
  { name: "Синій", v: "0.7 0.15 262", ink: "0.985 0.01 262" },
  { name: "Орхідея", v: "0.74 0.17 318", ink: "0.2 0.035 318" },
  { name: "Рожевий", v: "0.77 0.15 355", ink: "0.2 0.035 355" },
  { name: "Корал", v: "0.74 0.16 28", ink: "0.2 0.035 28" },
  { name: "Помаранч", v: "0.78 0.16 55", ink: "0.2 0.035 55" },
  { name: "Бурштин", v: "0.86 0.15 82", ink: "0.2 0.035 82" },
  { name: "Пісок", v: "0.92 0.03 95", ink: "0.2 0.035 95" },
];

// The flood: a disc of accent that grows from the CTA row as the section scrolls in.
const ORIGIN_Y = 0.62; // share of section height
const MAX_R = 1.5; // circle(150%) covers every corner

const HEAD =
  "mx-auto pb-[0.12em] pt-[0.04em] text-[clamp(2.75rem,0.8rem+6vw,6rem)] font-semibold leading-[1.02] tracking-[-0.035em] [text-wrap:balance]";
const LEAD = "t-lead mx-auto mt-6 max-w-[34rem]";
const TOP = "container-page pt-28 text-center sm:pt-36";

const LIT_PRIMARY =
  "bg-accent-ink !text-accent shadow-[0_14px_34px_-16px_oklch(var(--accent-ink)/0.8)] hover:bg-accent-ink/90 focus-visible:outline-accent-ink";
const LIT_SECONDARY =
  "!text-accent-ink shadow-[inset_0_0_0_1.5px_oklch(var(--accent-ink)/0.5)] hover:bg-accent-ink/[0.08] focus-visible:outline-accent-ink";

type Section = RefObject<HTMLElement | null>;

/** True once the flood disc has reached the centre of `el`. Measured, so it holds on any viewport. */
function useFlooded(section: Section, el: RefObject<HTMLElement | null>, progress: MotionValue<number>) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const check = (v: number) => {
      const s = section.current;
      const e = el.current;
      if (!s || !e) return;
      const a = s.getBoundingClientRect();
      const b = e.getBoundingClientRect();
      const r = (v * MAX_R * Math.hypot(a.width, a.height)) / Math.SQRT2;
      const d = Math.hypot(b.left + b.width / 2 - (a.left + a.width / 2), b.top + b.height / 2 - (a.top + a.height * ORIGIN_Y));
      setOn(r >= d);
    };
    check(progress.get());
    return progress.on("change", check);
  }, [section, el, progress]);
  return on;
}

export function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const reduce = useSafeReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.1"] });
  const open = useMotionValue(1);
  // Reduced motion: flood fully open, no scrub.
  const progress = reduce ? open : scrollYProgress;
  const clipPath = useTransform(progress, (v) => `circle(${(v * MAX_R * 100).toFixed(2)}% at 50% ${ORIGIN_Y * 100}%)`);
  const ctaLit = useFlooded(ref, ctaRef, progress);

  return (
    <section ref={ref} className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent"
      />

      {/* dark copy of the headline, under the flood */}
      <div className={TOP}>
        <motion.h2 className={cn(HEAD, "text-ink")}>
          <span className="block">Твоя система вже є.</span>
          <span className="block text-muted">Час її дотримуватись.</span>
        </motion.h2>
        <p className={LEAD}>Почни з безкоштовного журналу. Синхронізацію й асистента додаси, коли знадобляться.</p>
      </div>

      {/* the flood carries its own accent-ink copy, clipped by the same disc, so text contrast is right at every pixel */}
      <motion.div
        aria-hidden
        style={{ clipPath }}
        className="pointer-events-none absolute inset-0 z-[1] select-none bg-accent"
      >
        <div className={TOP}>
          <motion.div className={cn(HEAD, "text-accent-ink")}>
            <span className="block">Твоя система вже є.</span>
            <span className="block text-accent-ink/65">Час її дотримуватись.</span>
          </motion.div>
          <p className={cn(LEAD, "text-accent-ink/80")}>
            Почни з безкоштовного журналу. Синхронізацію й асистента додаси, коли знадобляться.
          </p>
        </div>
      </motion.div>

      <div className="container-page relative z-[2] pb-20 text-center sm:pb-24">
        <div ref={ctaRef} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <Button
              href={links.register}
              size="lg"
              arrow
              variant={ctaLit ? "ghost" : "primary"}
              className={cn(ctaLit && LIT_PRIMARY)}
            >
              Почати безкоштовно
            </Button>
          </Magnetic>
          <Button
            href={links.login}
            size="lg"
            variant={ctaLit ? "ghost" : "secondary"}
            className={cn(ctaLit && LIT_SECONDARY)}
          >
            Увійти
          </Button>
        </div>

        <Reveal delay={0.1} className="mt-20 sm:mt-24">
          <Dock />
          <AccentPicker section={ref} progress={progress} />
        </Reveal>
      </div>
    </section>
  );
}

function Dock() {
  const mouseX = useMotionValue(Infinity);
  const reduce = useSafeReducedMotion();
  return (
    <div className="flex justify-center">
      <div
        onMouseMove={(e) => !reduce && mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="glass flex h-16 items-end gap-2 rounded-[22px] bg-bg/[0.86] px-2.5 pb-2.5"
        role="list"
        aria-label="Док Traders Care"
      >
        {DOCK.map((d, i) => (
          <DockIcon key={d.label} {...d} mouseX={mouseX} first={i === 0} divider={i === DOCK.length - 1} />
        ))}
      </div>
    </div>
  );
}

function DockIcon({
  icon: Icon,
  label,
  mouseX,
  first,
  divider,
  mobile,
}: {
  icon: LucideIcon;
  label: string;
  mouseX: MotionValue<number>;
  first: boolean;
  divider: boolean;
  mobile?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const distance = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? x - r.left - r.width / 2 : Infinity;
  });
  const size = useSpring(useTransform(distance, [-150, 0, 150], [44, 72, 44]), { mass: 0.1, stiffness: 170, damping: 14 });

  return (
    <motion.div
      ref={ref}
      role="listitem"
      style={{ width: size, height: size }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "relative aspect-square min-w-[36px] shrink-0 items-center justify-center rounded-[14px] md:flex",
        mobile ? "flex" : "hidden",
        first ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2 hairline",
        divider && "ml-2 before:absolute before:-left-[9px] before:bottom-2 before:h-7 before:w-px before:bg-ink/10",
      )}
    >
      <Icon className="h-[42%] w-[42%]" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{label}</span>
      <AnimatePresence>
        {hover && (
          <motion.span
            initial={{ opacity: 0, y: 6, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 4, x: "-50%" }}
            transition={{ duration: 0.15 }}
            className="glass pointer-events-none absolute -top-10 left-1/2 whitespace-nowrap rounded-lg bg-bg/90 px-2.5 py-1 text-[12px] text-ink"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AccentPicker({ section, progress }: { section: Section; progress: MotionValue<number> }) {
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const lit = useFlooded(section, box, progress);
  const pick = (i: number) => {
    setActive(i);
    const s = document.documentElement.style;
    s.setProperty("--accent", ACCENTS[i].v);
    s.setProperty("--accent-ink", ACCENTS[i].ink);
  };
  return (
    <div ref={box} className="mt-10 flex flex-col items-center gap-3">
      <p className={cn("text-[14px] transition-colors duration-300", lit ? "text-accent-ink/75" : "text-muted")}>
        Інтерфейс налаштовується: 8 тем і 12 акцентів. Приміряй колір тут:{" "}
        <span className={cn("transition-colors duration-300", lit ? "text-accent-ink" : "text-ink-2")}>
          {ACCENTS[active].name}
        </span>
      </p>
      <div
        role="radiogroup"
        aria-label="Акцентний колір"
        className="flex max-w-[284px] flex-wrap justify-center gap-1 sm:max-w-none"
      >
        {ACCENTS.map((a, i) => (
          <button
            key={a.name}
            type="button"
            role="radio"
            aria-checked={active === i}
            aria-label={a.name}
            onClick={() => pick(i)}
            className={cn("group grid h-11 w-11 place-items-center rounded-full", lit && "focus-visible:outline-accent-ink")}
          >
            <span
              className={cn(
                "block h-5 w-5 rounded-full shadow-[inset_0_0_0_1px_oklch(0_0_0/0.18)] transition-transform duration-200 group-hover:scale-110",
                active === i && "ring-2 ring-offset-2",
                active === i && (lit ? "ring-accent-ink ring-offset-accent" : "ring-ink ring-offset-bg"),
              )}
              style={{ background: `oklch(${a.v})` }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
