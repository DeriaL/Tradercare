"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { links } from "@/lib/links";
import { useMedia } from "@/lib/useMedia";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";

const PLANS = [
  {
    name: "Free",
    price: 0,
    note: "Ручний журнал для старту",
    cta: "Почати безкоштовно",
    features: ["1 торговий рахунок", "Угоди вносиш вручну", "Журнал, статистика й розбори", "Безкоштовні інструменти"],
  },
  {
    name: "Solo",
    price: 17,
    note: "Один рахунок на автопілоті",
    cta: "Обрати Solo",
    features: ["1 торговий рахунок", "Синхронізація кожні 30 хв", "Асистент на Haiku", "150K токенів на місяць"],
  },
  {
    name: "Trader",
    price: 29,
    note: "Челендж і фондований рахунок",
    cta: "Обрати Trader",
    featured: true,
    features: ["3 торгові рахунки", "Синхронізація кожні 15 хв", "Асистент на Sonnet", "3M токенів на місяць"],
  },
  {
    name: "Pro",
    price: 59,
    note: "Кілька проп-рахунків одночасно",
    cta: "Обрати Pro",
    features: ["8 торгових рахунків", "Синхронізація кожні 5 хв", "Асистент на Opus", "6M токенів на місяць"],
  },
];

const FEATURED = PLANS.findIndex((p) => p.featured);

// Hairlines between the columns: stacked on mobile, 2x2 on md, one row on lg.
const DIVIDERS = [
  "",
  "border-t md:border-l md:border-t-0",
  "border-t lg:border-l lg:border-t-0",
  "border-t md:border-l lg:border-t-0",
];

const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;

export function Pricing() {
  // One panel, four settings: the highlight follows the pointer or focus, then settles back on Trader.
  const wide = useMedia("(min-width: 768px)");
  const reduce = useSafeReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const active = wide && hover !== null ? hover : FEATURED;

  return (
    <section id="plans" className="relative py-24 sm:py-32">
      <div className="container-page">
        <Reveal className="max-w-[56rem]">
          <h2 className="t-h2">Почни безкоштовно. Плати, коли потрібна синхронізація</h2>
          <p className="t-lead mt-5 max-w-[38rem]">
            Оплата в USDT або USDC і без автосписань: продовжуєш тоді, коли сам вирішиш.
          </p>
        </Reveal>

        <Reveal amount={0.15} className="mt-12 sm:mt-14">
          <div
            onPointerLeave={() => setHover(null)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(null);
            }}
            className="panel grid overflow-hidden rounded-2xl md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[auto_auto]"
          >
            {PLANS.map((p, i) => (
              <Plan key={p.name} {...p} index={i} active={active === i} reduce={reduce} onEnter={() => setHover(i)} />
            ))}
          </div>
        </Reveal>
        <p className="mt-6 text-[14px] text-muted">У всіх тарифах: журнал, статистика й розбори.</p>
      </div>
    </section>
  );
}

function Plan({
  name,
  price,
  note,
  cta,
  features,
  featured,
  index,
  active,
  reduce,
  onEnter,
}: (typeof PLANS)[number] & { index: number; active: boolean; reduce: boolean; onEnter: () => void }) {
  const id = `plan-${name.toLowerCase()}`;
  return (
    <article
      aria-labelledby={id}
      onPointerEnter={(e) => e.pointerType === "mouse" && onEnter()}
      onFocus={onEnter}
      className={cn(
        "relative flex flex-col border-ink/[0.07] p-6 sm:p-8 lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:gap-0",
        DIVIDERS[index],
      )}
    >
      {active && (
        <motion.span
          layoutId="plan-highlight"
          aria-hidden
          transition={reduce ? { duration: 0 } : SPRING}
          className="pointer-events-none absolute inset-2 rounded-xl bg-accent/[0.06] shadow-[inset_0_0_0_1px_oklch(var(--accent)/0.35)] sm:inset-3"
        />
      )}

      <div className="relative flex flex-col">
        <div className="flex min-h-7 items-center justify-between gap-3">
          <h3 id={id} className="text-[1.125rem] font-semibold tracking-[-0.01em] text-ink">
            {name}
          </h3>
          {featured && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[12px] font-medium text-accent-ink">Рекомендуємо</span>
          )}
        </div>
        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="num text-[3rem] font-semibold leading-none tracking-[-0.035em] text-ink">${price}</span>
          <span className="text-[14px] text-muted">{price ? "на місяць" : "назавжди"}</span>
        </div>
        <p className="mt-3 text-[14px] text-muted">{note}</p>
        <div className="mt-auto pt-7">
          <Button href={links.register} variant={featured ? "primary" : "secondary"} className="w-full">
            {cta}
          </Button>
        </div>
      </div>

      {/* fixed row heights so the four lists line up into a comparison table on lg */}
      <ul className="relative mt-7">
        {features.map((f) => (
          <li
            key={f}
            className="flex h-[3.25rem] items-center gap-3 border-t border-ink/[0.07] text-[14.5px] leading-snug text-ink-2"
          >
            <Check
              className={cn(
                "h-4 w-4 shrink-0 transition-colors duration-300",
                active ? "text-accent" : "text-faint",
              )}
              strokeWidth={2.25}
              aria-hidden
            />
            {f}
          </li>
        ))}
      </ul>
    </article>
  );
}
