"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSafeReducedMotion } from "@/lib/useSafeReducedMotion";
import { BadgeCheck, Check, ChevronDown, Link2, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Counter } from "@/components/ui/Counter";
import { cn } from "@/lib/cn";
import { ACCOUNT, MISTAKES, TRADES, computeStats, fmtUsd } from "@/lib/demo";

const EASE = [0.16, 1, 0.3, 1] as const;

function WindowHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex h-12 items-center justify-between border-b border-ink/[0.06] px-4">
      <span className="text-[13px] font-medium text-ink">{title}</span>
      {right}
    </div>
  );
}

/* ---------- 1. connect ---------- */

const tradesFmt = (v: number) => `${Math.round(v)} угод`;

const PLATFORMS = ["MT4", "MT5", "cTrader", "Match-Trader", "DXtrade"];

export function ConnectPreview({ active }: { active: boolean }) {
  const reduce = useSafeReducedMotion();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active) return setDone(false);
    if (reduce) return setDone(true);
    const t = window.setTimeout(() => setDone(true), 2300);
    return () => window.clearTimeout(t);
  }, [active, reduce]);

  return (
    <div className="window overflow-hidden">
      <WindowHead title="Новий рахунок" right={<span className="text-[12px] text-muted">Крок 1 з 2</span>} />
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <Label>Платформа</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[12.5px]",
                  p === "MT5" ? "bg-accent text-accent-ink" : "bg-surface-2 text-ink-2 hairline",
                )}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Сервер" value="Broker-Live 07" />
          <Field label="Логін" value="51 024 877" mono />
        </div>
        <div>
          <Label>Пароль інвестора</Label>
          <div className="mt-1.5 flex h-10 items-center justify-between rounded-lg bg-surface-2 px-3 hairline">
            <span className="tracking-[0.2em] text-ink-2">••••••••••</span>
            <Lock className="h-3.5 w-3.5 text-accent" aria-hidden />
          </div>
          <p className="mt-1.5 text-[12px] text-muted">Лише читання. Відкрити чи закрити угоду з цим паролем неможливо.</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2.5 hairline">
          <span className="text-[12.5px] text-ink-2">
            Проп-програма: <span className="text-ink">{ACCOUNT.name}, {ACCOUNT.phase}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden />
        </div>

        <div className="rounded-xl bg-ink/[0.03] p-3.5 hairline">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-ink-2">{done ? "Історію імпортовано" : "Імпортуємо історію"}</span>
            <span className="num text-muted">
              <Counter value={active ? 312 : 0} format={tradesFmt} inView={false} duration={2.2} />
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <motion.div
              className="h-full origin-left rounded-full bg-accent"
              initial={false}
              animate={{ scaleX: active ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 2.2, ease: [0.3, 0, 0.2, 1] }}
            />
          </div>
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 pt-3 text-[12.5px] text-ink">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-accent-ink">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  Правила програми застосовано: ліміти, просадка, консистентність
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] text-muted">{children}</div>;
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className={cn("mt-1.5 flex h-10 items-center rounded-lg bg-surface-2 px-3 text-[13.5px] text-ink hairline", mono && "num")}>
        {value}
      </div>
    </div>
  );
}

/* ---------- 2. journal ---------- */

const ROWS = TRADES.slice(-6).reverse();

export function JournalPreview({ active }: { active: boolean }) {
  const reduce = useSafeReducedMotion();
  const [tagged, setTagged] = useState(false);
  useEffect(() => {
    if (!active) return setTagged(false);
    if (reduce) return setTagged(true);
    const t = window.setTimeout(() => setTagged(true), 1500);
    return () => window.clearTimeout(t);
  }, [active, reduce]);

  return (
    <div className="window overflow-hidden">
      <WindowHead
        title="Журнал"
        right={
          <div className="flex gap-1.5 text-[11.5px]">
            {["Усі рахунки", "Вересень", "Сесія"].map((c) => (
              <span key={c} className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-2 hairline">
                {c}
              </span>
            ))}
          </div>
        }
      />
      <div className="px-2 pb-3 pt-1 sm:px-3">
        <div className="num grid grid-cols-[3.2rem_1fr_4rem_5.2rem] gap-2 px-2 py-2.5 text-[11px] text-faint sm:grid-cols-[3.6rem_1fr_1fr_4rem_5.5rem]">
          <span>Дата</span>
          <span>Інструмент</span>
          <span className="hidden sm:block">Сетап</span>
          <span className="text-right">R</span>
          <span className="text-right">P&L</span>
        </div>
        <ul>
          {ROWS.map((t, i) => {
            const r = t.pnl / ACCOUNT.riskPerTrade;
            const isNew = i < 2;
            const mark = t.mistake === "stop";
            return (
              <motion.li
                key={`${t.day}-${t.symbol}-${i}`}
                initial={false}
                animate={active ? { opacity: 1, y: 0 } : { opacity: reduce ? 1 : 0, y: reduce ? 0 : -10 }}
                transition={{ duration: 0.6, delay: reduce ? 0 : 0.1 + i * 0.09, ease: EASE }}
                className={cn(
                  "rounded-lg px-2 py-2.5 transition-colors duration-700",
                  isNew && active && !tagged ? "bg-accent/[0.07]" : "",
                  mark && tagged ? "bg-loss/[0.06]" : "",
                )}
              >
                <div className="num grid grid-cols-[3.2rem_1fr_4rem_5.2rem] items-center gap-2 text-[12.5px] sm:grid-cols-[3.6rem_1fr_1fr_4rem_5.5rem]">
                  <span className="text-muted">{t.day} вер</span>
                  <span className="truncate text-ink">
                    {t.symbol} <span className={t.side === "Long" ? "text-ink-2" : "text-ink-2"}>· {t.side}</span>
                  </span>
                  <span className="hidden truncate font-sans text-ink-2 sm:block">{t.setup}</span>
                  <span className={cn("text-right", r >= 0 ? "text-ink" : "text-ink-2")}>
                    {r >= 0 ? "+" : "−"}
                    {Math.abs(r).toFixed(1)}R
                  </span>
                  <span className={cn("text-right", t.pnl >= 0 ? "text-profit" : "text-loss")}>{fmtUsd(t.pnl, { sign: true, cents: false })}</span>
                </div>
                {mark && (
                  <AnimatePresence>
                    {tagged && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          <Tag tone="setup">{t.setup}</Tag>
                          <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25, type: "spring", stiffness: 500, damping: 26 }}>
                            <Tag tone="loss">{MISTAKES.stop.label}</Tag>
                          </motion.span>
                          <span className="num ml-auto self-center text-[11.5px] text-loss">
                            ціна {fmtUsd(-((t.rulePnl ?? 0) - t.pnl))}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                {isNew && (
                  <span className="sr-only">нова угода з синхронізації</span>
                )}
              </motion.li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-center justify-between rounded-lg bg-ink/[0.03] px-3 py-2.5 text-[12px] hairline">
          <span className="text-ink-2">
            Логічна угода: <span className="text-ink">EURUSD Long на 3 рахунках</span>
          </span>
          <span className="rounded-full bg-accent/[0.14] px-2 py-0.5 text-[11px] text-accent">1 рядок</span>
        </div>
      </div>
    </div>
  );
}

function Tag({ tone, children }: { tone: "setup" | "loss"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-[11.5px]",
        tone === "loss" ? "bg-loss/[0.14] text-loss" : "bg-ink/[0.07] text-ink-2",
      )}
    >
      {children}
    </span>
  );
}

/* ---------- 3. review ---------- */

const WEEK = TRADES.filter((t) => t.day >= 21 && t.day <= 25);
const weekStats = computeStats(WEEK);
const weekCost = WEEK.reduce((s, t) => s + (t.mistake ? (t.rulePnl ?? 0) - t.pnl : 0), 0);

export function ReviewPreview({ active }: { active: boolean }) {
  const reduce = useSafeReducedMotion();
  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    if (!active) return setFrozen(false);
    if (reduce) return setFrozen(true);
    const t = window.setTimeout(() => setFrozen(true), 2000);
    return () => window.clearTimeout(t);
  }, [active, reduce]);

  return (
    <div className="window overflow-hidden">
      <WindowHead
        title="Розбір · тиждень 39"
        right={<span className="num text-[12px] text-muted">21-25 вер</span>}
      />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2.5">
          <Mini label="P&L тижня" value={fmtUsd(weekStats.net, { sign: true, cents: false })} tone="profit" />
          <Mini label="Win rate" value={`${weekStats.winRate.toFixed(0)}%`} />
          <Mini label="Care Score" value="78" sub="+6" />
        </div>

        <div className="rounded-xl bg-surface-2/60 p-3.5 hairline">
          <div className="text-[12px] text-muted">Головне за тиждень</div>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-ink-2">
            <li>
              Найкраща угода: <span className="text-ink">GBPUSD Long, +2.25R</span> у Лондонську сесію
            </li>
            <li>
              Помилки коштували <span className="num text-loss">{fmtUsd(-weekCost, { cents: false })}</span>: ризик понад план і
              вхід поза сетапом
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-surface-2/60 p-3.5 hairline">
          <div className="text-[12px] text-muted">Висновки</div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink">
            US30 без сетапу більше не торгую. Після двох збитків поспіль закриваю термінал до завтра.
          </p>
        </div>

        <div className="relative h-11">
          <AnimatePresence mode="popLayout" initial={false}>
            {!frozen ? (
              <motion.div
                key="cta"
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="flex h-11 items-center justify-center rounded-full bg-accent text-[14px] font-medium text-accent-ink"
              >
                Зафіксувати й поділитися
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="flex h-11 items-center justify-between gap-3 rounded-full bg-ink/[0.05] pl-4 pr-1.5 hairline"
              >
                <span className="flex items-center gap-2 text-[13px] text-ink">
                  <BadgeCheck className="h-4 w-4 text-accent" aria-hidden />
                  Метрики зафіксовано
                </span>
                <span className="num flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1.5 text-[12px] text-ink-2">
                  <Link2 className="h-3.5 w-3.5" aria-hidden />
                  traderscare.io/v/7KQ2M9
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "profit" }) {
  return (
    <div className="rounded-xl bg-surface-2/60 p-3 hairline">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className={cn("num mt-1 text-[1.1rem] font-semibold tracking-[-0.02em]", tone === "profit" ? "text-profit" : "text-ink")}>
        {value}
        {sub && <span className="ml-1 text-[11.5px] font-medium text-accent">{sub}</span>}
      </div>
    </div>
  );
}
