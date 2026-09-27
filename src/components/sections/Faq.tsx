"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";
import { links } from "@/lib/links";

const QA = [
  {
    q: "Traders Care дає торгові сигнали?",
    a: "Ні. Ми не брокер і не даємо інвестиційних порад. Сервіс рахує й показує твої власні дані: угоди, помилки, дотримання правил і стан проп-лімітів.",
  },
  {
    q: "Чи безпечно підключати рахунок?",
    a: "Для MetaTrader використовується пароль інвестора. Він дає доступ лише на читання: відкрити, закрити чи змінити угоду з ним неможливо.",
  },
  {
    q: "Які платформи підтримуються?",
    a: "MetaTrader 4 і 5 (хмарна синхронізація або локальний клієнт для Mac і Windows), cTrader через OAuth, Match-Trader і DXtrade через розширення для браузера. На безкоштовному тарифі угоди вносяться вручну.",
  },
  {
    q: "Можна вести кілька рахунків?",
    a: "Так, від 1 до 8 залежно від тарифу. Одна ідея, відкрита на кількох рахунках, показується в журналі як одна логічна угода.",
  },
  {
    q: "Чи можна редагувати синхронізовані угоди?",
    a: "Поля, які прийшли від брокера, закриті для редагування, а джерело даних завжди видно. Сетапи, теги, нотатки й скриншоти додаєш сам.",
  },
  {
    q: "Що бачить AI-асистент?",
    a: "Твій журнал, торгову систему й розбори. Він відповідає на питання про твої дані й не підказує, що купувати чи продавати.",
  },
  {
    q: "Чому оплата тільки криптою?",
    a: "Оплата в USDT або USDC без автоматичного продовження. Ти сам вирішуєш, коли й на який тариф продовжити підписку.",
  },
  {
    q: "Чи можна перенести журнал з Notion?",
    a: "Так, є імпорт з бази Notion. А видалені записи ще 30 днів лежать у кошику, якщо щось прибрав випадково.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  const uid = useId();

  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="container-page grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+3rem)]">
            <h2 className="t-h2">Часті питання</h2>
            <a href={links.faq} className="group mt-6 inline-flex items-center gap-1.5 text-[15px] text-ink-2 transition-colors hover:text-ink">
              Усі питання й відповіді
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden />
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-8">
          <ul className="space-y-2">
            {QA.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q} className={cn("rounded-2xl transition-colors duration-300", isOpen ? "bg-raised hairline" : "hover:bg-ink/[0.025]")}>
                  <h3>
                    <button
                      type="button"
                      id={`${uid}-q${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`${uid}-a${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left sm:px-6"
                    >
                      <span className="text-[1.0625rem] font-medium text-ink">{item.q}</span>
                      <motion.span
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors", isOpen ? "bg-accent text-accent-ink" : "bg-ink/[0.06] text-ink-2")}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </motion.span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`${uid}-a${i}`}
                        role="region"
                        aria-labelledby={`${uid}-q${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-[40rem] px-5 pb-6 text-[15.5px] leading-relaxed text-ink-2 sm:px-6">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
