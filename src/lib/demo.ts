/**
 * Demo account used across every product preview on the landing.
 * One dataset keeps the numbers consistent: the hero P&L, the cost of
 * deviations, the prop meters and the statistics all derive from here.
 * It is sample data and is labelled as such where money figures appear.
 */

export type MistakeId = "stop" | "risk" | "setup" | "revenge";
export type Session = "Азія" | "Лондон" | "Нью-Йорк";
export type Side = "Long" | "Short";

export type Trade = {
  day: number; // day of September 2026
  symbol: string;
  side: Side;
  session: Session;
  setup: string;
  pnl: number; // dollars, actual result
  mistake?: MistakeId;
  rulePnl?: number; // result had the rule been followed (0 = trade would not exist)
};

export const ACCOUNT = {
  name: "Челендж 100K",
  phase: "Фаза 1",
  start: 100_000,
  riskPerTrade: 500, // 0.5% planned risk = 1R
  month: "вересень",
};

export const MISTAKES: Record<MistakeId, { rule: string; label: string }> = {
  stop: { rule: "Не рухати стоп-лос", label: "Зсунув стоп" },
  risk: { rule: "Ризик до 0.5% на угоду", label: "Ризик понад план" },
  setup: { rule: "Тільки сетапи з системи", label: "Вхід поза сетапом" },
  revenge: { rule: "Пауза після 2 збитків", label: "Реванш після мінуса" },
};

const S = {
  br: "Пробій діапазону",
  pb: "Відкат до рівня",
  lq: "Зняття ліквідності",
};

export const TRADES: Trade[] = [
  { day: 1, symbol: "EURUSD", side: "Long", session: "Лондон", setup: S.br, pnl: 1062.5 },
  { day: 1, symbol: "XAUUSD", side: "Short", session: "Нью-Йорк", setup: S.lq, pnl: -500 },
  { day: 2, symbol: "NAS100", side: "Long", session: "Нью-Йорк", setup: S.pb, pnl: 712.4 },
  { day: 2, symbol: "GBPUSD", side: "Short", session: "Лондон", setup: S.br, pnl: -214.6 },
  { day: 3, symbol: "EURUSD", side: "Long", session: "Лондон", setup: S.br, pnl: -500 },
  { day: 3, symbol: "EURUSD", side: "Short", session: "Лондон", setup: S.pb, pnl: -500 },
  { day: 3, symbol: "GBPJPY", side: "Long", session: "Лондон", setup: "Без сетапу", pnl: -610, mistake: "revenge", rulePnl: 0 },
  { day: 4, symbol: "XAUUSD", side: "Long", session: "Нью-Йорк", setup: S.lq, pnl: 1240.8 },
  { day: 7, symbol: "NAS100", side: "Long", session: "Нью-Йорк", setup: S.pb, pnl: 860 },
  { day: 7, symbol: "EURUSD", side: "Short", session: "Лондон", setup: S.br, pnl: -815, mistake: "stop", rulePnl: -500 },
  { day: 8, symbol: "GBPUSD", side: "Long", session: "Лондон", setup: S.br, pnl: 540.2 },
  { day: 8, symbol: "XAUUSD", side: "Short", session: "Азія", setup: S.lq, pnl: -500 },
  { day: 9, symbol: "US30", side: "Short", session: "Нью-Йорк", setup: "Без сетапу", pnl: -640, mistake: "setup", rulePnl: 0 },
  { day: 9, symbol: "EURUSD", side: "Long", session: "Лондон", setup: S.pb, pnl: 980.6 },
  { day: 10, symbol: "NAS100", side: "Long", session: "Нью-Йорк", setup: S.br, pnl: 1420 },
  { day: 11, symbol: "XAUUSD", side: "Long", session: "Нью-Йорк", setup: S.lq, pnl: -1000, mistake: "risk", rulePnl: -500 },
  { day: 11, symbol: "GBPUSD", side: "Short", session: "Лондон", setup: S.pb, pnl: 495.3 },
  { day: 14, symbol: "EURUSD", side: "Long", session: "Лондон", setup: S.br, pnl: 1050 },
  { day: 14, symbol: "NAS100", side: "Short", session: "Нью-Йорк", setup: S.pb, pnl: 38.2 },
  { day: 15, symbol: "XAUUSD", side: "Long", session: "Лондон", setup: S.lq, pnl: 2010.4 },
  { day: 16, symbol: "GBPJPY", side: "Short", session: "Лондон", setup: S.br, pnl: -500 },
  { day: 16, symbol: "GBPJPY", side: "Long", session: "Лондон", setup: S.pb, pnl: -500 },
  { day: 16, symbol: "XAUUSD", side: "Short", session: "Нью-Йорк", setup: "Без сетапу", pnl: -540, mistake: "revenge", rulePnl: 0 },
  { day: 17, symbol: "EURUSD", side: "Long", session: "Лондон", setup: S.pb, pnl: 730.1 },
  { day: 17, symbol: "US30", side: "Long", session: "Нью-Йорк", setup: "Без сетапу", pnl: 310.5, mistake: "setup", rulePnl: 0 },
  { day: 18, symbol: "NAS100", side: "Long", session: "Нью-Йорк", setup: S.br, pnl: 1160 },
  { day: 18, symbol: "EURUSD", side: "Short", session: "Лондон", setup: S.pb, pnl: -905, mistake: "stop", rulePnl: -500 },
  { day: 21, symbol: "XAUUSD", side: "Long", session: "Нью-Йорк", setup: S.lq, pnl: 870 },
  { day: 21, symbol: "GBPUSD", side: "Long", session: "Лондон", setup: S.br, pnl: -500 },
  { day: 22, symbol: "EURUSD", side: "Short", session: "Лондон", setup: S.lq, pnl: 640.8 },
  { day: 22, symbol: "NAS100", side: "Long", session: "Нью-Йорк", setup: S.pb, pnl: 905.5 },
  { day: 23, symbol: "XAUUSD", side: "Short", session: "Азія", setup: S.lq, pnl: -500 },
  { day: 23, symbol: "US30", side: "Short", session: "Нью-Йорк", setup: "Без сетапу", pnl: -380, mistake: "setup", rulePnl: 0 },
  { day: 24, symbol: "GBPUSD", side: "Long", session: "Лондон", setup: S.br, pnl: 1125 },
  { day: 24, symbol: "EURUSD", side: "Short", session: "Нью-Йорк", setup: S.pb, pnl: -126.9 },
  { day: 25, symbol: "NAS100", side: "Short", session: "Нью-Йорк", setup: S.lq, pnl: -1150, mistake: "risk", rulePnl: -500 },
  { day: 25, symbol: "XAUUSD", side: "Long", session: "Лондон", setup: S.pb, pnl: 610 },
  { day: 28, symbol: "EURUSD", side: "Long", session: "Лондон", setup: S.br, pnl: 1380.2 },
  { day: 28, symbol: "GBPJPY", side: "Short", session: "Лондон", setup: S.lq, pnl: -500 },
  { day: 29, symbol: "XAUUSD", side: "Long", session: "Нью-Йорк", setup: S.pb, pnl: 765 },
  { day: 29, symbol: "NAS100", side: "Long", session: "Нью-Йорк", setup: S.br, pnl: -760, mistake: "stop", rulePnl: -500 },
  { day: 30, symbol: "EURUSD", side: "Long", session: "Лондон", setup: S.br, pnl: 1034.6 },
  { day: 30, symbol: "GBPUSD", side: "Short", session: "Лондон", setup: S.pb, pnl: -500 },
];

/** Cumulative equity after each trade, starting at the account balance. */
export function equitySeries(fixed: ReadonlySet<MistakeId> = new Set()) {
  let eq = ACCOUNT.start;
  const out = [eq];
  for (const t of TRADES) {
    eq += t.mistake && fixed.has(t.mistake) ? (t.rulePnl ?? 0) : t.pnl;
    out.push(eq);
  }
  return out;
}

export function mistakeCost(id: MistakeId) {
  let cost = 0;
  let count = 0;
  for (const t of TRADES) {
    if (t.mistake !== id) continue;
    cost += (t.rulePnl ?? 0) - t.pnl;
    count += 1;
  }
  return { cost, count };
}

export function computeStats(trades: Trade[] = TRADES) {
  let net = 0;
  let wins = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let peak = ACCOUNT.start;
  let eq = ACCOUNT.start;
  let maxDd = 0;
  const byDay = new Map<number, number>();
  for (const t of trades) {
    net += t.pnl;
    eq += t.pnl;
    peak = Math.max(peak, eq);
    maxDd = Math.max(maxDd, peak - eq);
    byDay.set(t.day, (byDay.get(t.day) ?? 0) + t.pnl);
    if (t.pnl > 0) {
      wins += 1;
      grossWin += t.pnl;
    } else grossLoss += -t.pnl;
  }
  const bestDay = Math.max(...byDay.values());
  return {
    trades: trades.length,
    net,
    wins,
    winRate: (wins / trades.length) * 100,
    profitFactor: grossWin / grossLoss,
    avgR: net / ACCOUNT.riskPerTrade / trades.length,
    maxDd,
    tradingDays: byDay.size,
    consistency: (bestDay / net) * 100,
  };
}

export const STATS = computeStats();

export const fmtUsd = (v: number, opts: { sign?: boolean; cents?: boolean } = {}) => {
  const { sign = false, cents = true } = opts;
  const abs = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  const s = v < 0 ? "−" : sign ? "+" : "";
  return `${s}$${abs}`;
};

export const fmtPct = (v: number, digits = 1) => `${v.toFixed(digits)}%`;
