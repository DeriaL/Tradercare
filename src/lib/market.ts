/**
 * A small market simulator for the demo visuals: seeded random walk with momentum,
 * volatility clusters and an optional pull toward a target price (to script a trade).
 * All prices here are sample data, never quotes.
 */

export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(r: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = r();
  while (v === 0) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type Candle = { o: number; h: number; l: number; c: number; v: number };

type SimOptions = {
  seed: number;
  price: number;
  /** price step, e.g. 0.1 for an index CFD */
  tick: number;
  /** typical move per tick, in price units */
  vol: number;
  ticksPerCandle: number;
  /** candles to pre-build so the chart opens full */
  history: number;
};

export class MarketSim {
  readonly o: SimOptions;
  private r: () => number;
  price: number;
  candles: Candle[] = [];
  /** candles ever opened: the absolute index of the forming candle is count - 1 */
  count = 0;
  lastMove = 0;
  /** ticks already in the forming candle */
  inCandle = 0;
  private momentum = 0;
  private volNow: number;
  /** drift added to every tick, in price units: the scenario steers the market with it */
  bias = 0;
  floor = -Infinity;
  ceil = Infinity;

  constructor(o: SimOptions) {
    this.o = o;
    this.r = mulberry32(o.seed);
    this.price = o.price;
    this.volNow = o.vol;
    this.open();
    // history: trends and ranges of random length, loosely held around the start price
    let regime = 0;
    for (let i = 0; i < o.history * o.ticksPerCandle; i++) {
      if (i % (o.ticksPerCandle * 12) === 0) regime = (this.r() - 0.5) * o.vol * 0.34;
      this.bias = regime + (o.price - this.price) * 0.0015;
      this.step();
    }
    this.bias = 0;
  }

  private open() {
    const p = this.price;
    this.candles.push({ o: p, h: p, l: p, c: p, v: 0 });
    this.count += 1;
    this.inCandle = 0;
    if (this.candles.length > 420) this.candles.shift();
  }

  /** A uniform random number from the market's own seed (for tick timing and the like). */
  rand() {
    return this.r();
  }

  /** One tick. Returns true when it closed a candle. */
  step(): boolean {
    const { vol, tick, ticksPerCandle } = this.o;
    // volatility wanders around its base and now and then jumps, like real sessions
    this.volNow += (vol - this.volNow) * 0.025 + (this.r() < 0.008 ? vol * (0.8 + this.r() * 1.2) : 0);
    this.momentum = this.momentum * 0.93 + gauss(this.r) * vol * 0.07;
    const noise = Math.max(-4 * vol, Math.min(4 * vol, this.momentum + gauss(this.r) * this.volNow));
    const dp = noise + this.bias;
    const next = Math.round(Math.max(this.floor, Math.min(this.ceil, this.price + dp)) / tick) * tick;
    this.lastMove = next - this.price || this.lastMove;
    this.price = next;
    const c = this.candles[this.candles.length - 1];
    c.c = next;
    if (next > c.h) c.h = next;
    if (next < c.l) c.l = next;
    c.v += 1 + (Math.abs(dp) / vol) * (0.4 + this.r());
    this.inCandle += 1;
    if (this.inCandle >= ticksPerCandle) {
      this.open();
      return true;
    }
    return false;
  }
}

/** A "nice" grid step (1, 2, 2.5, 5 × 10^n) for about `count` lines across `span`. */
export function niceStep(span: number, count = 5) {
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

/** OKLCH (the token format) to 8-bit sRGB, for canvas. */
export function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const enc = (x: number) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  };
  return [enc(lin[0]), enc(lin[1]), enc(lin[2])];
}

/** Reads a colour token from :root and returns an rgba() builder. */
export function tokenColor(name: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  const [L, C, H] = raw.split(/\s+/).map(Number);
  const [r, g, b] = oklchToRgb(L || 0, C || 0, H || 0);
  return (alpha = 1) => `rgba(${r},${g},${b},${alpha})`;
}

/* ---------- trading sessions, from the real clock ---------- */

export const SESSIONS = [
  { id: "asia", name: "Азія", tz: "Asia/Tokyo", open: 9, close: 18 },
  { id: "london", name: "Лондон", tz: "Europe/London", open: 8, close: 17 },
  { id: "ny", name: "Нью-Йорк", tz: "America/New_York", open: 8, close: 17 },
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const clocks = new Map<string, Intl.DateTimeFormat>();

function localClock(tz: string, d: Date) {
  let f = clocks.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    clocks.set(tz, f);
  }
  const parts = f.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { day: get("weekday"), min: Number(get("hour")) * 60 + Number(get("minute")) };
}

type Session = (typeof SESSIONS)[number];

function isOpen(s: Session, d: Date) {
  const { day, min } = localClock(s.tz, d);
  return WEEKDAYS.includes(day) && min >= s.open * 60 && min < s.close * 60;
}

/** Open or closed at `now`, and whole minutes until that changes. Time zones handle DST. */
export function sessionStatus(s: Session, now: Date) {
  const open = isOpen(s, now);
  const at = (m: number) => new Date(now.getTime() + m * 60_000);
  // coarse 15-minute steps, then walk back minute by minute
  let m = 15;
  while (m <= 4 * 24 * 60 && isOpen(s, at(m)) === open) m += 15;
  let exact = m;
  for (let k = m - 14; k <= m; k++) {
    if (isOpen(s, at(k)) !== open) {
      exact = k;
      break;
    }
  }
  return { open, minutes: exact };
}

/** "3 год 12 хв", "1 д 4 год", "40 хв" */
export function fmtDuration(m: number) {
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const min = m % 60;
  if (d > 0) return `${d} д ${h} год`;
  if (h > 0) return `${h} год ${min} хв`;
  return `${min} хв`;
}
