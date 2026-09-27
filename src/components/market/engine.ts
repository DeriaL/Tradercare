import { MarketSim, niceStep, tokenColor, type Candle } from "@/lib/market";

/*
  Canvas engine for the hero chart: a replayed 1-minute NAS100 market (sample data) and a trade
  played over it the way a terminal shows it: order lines, position zones, axis tags.
  Two scenarios alternate: the trader drags the stop and loses more than planned, then a trade that
  follows the plan and reaches its 2R target.
*/

export const USD_PER_PT = 20;
export const RISK_PTS = 25;
export const MOVED_PTS = 38;
export const TARGET_PTS = 50;

const TICKS_PER_CANDLE = 25; // ~80 ms ticks: a 1-minute candle every 2 s, replay x30
const SIM_SECONDS_PER_TICK = 60 / TICKS_PER_CANDLE;
const BASE = 24850;
const HISTORY = 280;
const ZONE_BARS = 14;
const GRAB_AT = 650; // ms from the cursor appearing to the drag starting
const DRAG_MS = 750;

export type TradeKind = "moved" | "plan";
export type TradePhase = "open" | "moved" | "closed";
export type TradeEvent = { kind: TradeKind; phase: TradePhase; pnl: number };
export type LegendData = { candle: Candle; prev: number; time: string };
export type CursorState = { x: number; y: number; mode: "hidden" | "point" | "grab" };

export type ChartLayout = {
  /** plot top inset and bottom inset (time axis included) in CSS px */
  top: number;
  bottom: number;
  axisW: number;
  /** distance between candle centres */
  step: number;
  /** empty candles to the right of the live one */
  rightPad: number;
  /** soft linear fade at the left edge, px */
  edge: number;
  /** elliptical hole the chart dissolves into, e.g. under a headline */
  hole?: (w: number, h: number) => { x: number; y: number; rx: number; ry: number };
  /** autoscale only reads candles right of this fraction of the width */
  scaleFrom: number;
};

type Trade = {
  kind: TradeKind;
  phase: TradePhase;
  openIdx: number;
  entry: number;
  slPlan: number;
  sl: number;
  tp: number;
  closeIdx: number | null;
  exit: number | null;
  /** 0..1 fade of the whole drawing */
  shown: number;
  fadingOut: boolean;
  leg: number;
  legTicks: number;
  holdTicks: number;
  /** when the hand reached for the stop (ms) */
  grabAt: number | null;
};

type Tag = { y: number; text: string; bg: string; fg: string; sub?: string; prio: number };

type Handlers = {
  trade?: (e: TradeEvent) => void;
  pnl?: (pnl: number, open: boolean) => void;
  legend?: (d: LegendData) => void;
  cursor?: (c: CursorState) => void;
};

type Palette = Record<"up" | "down" | "warn" | "ink" | "muted" | "bg" | "s3", (a?: number) => string>;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const fmtPrice = (p: number) =>
  p.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtMoney = (v: number, digits = 2) => {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${v < 0 ? "−" : "+"}$${s}`;
};

export class ChartEngine {
  readonly sim: MarketSim;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private layout: ChartLayout;
  private c!: Palette;
  private font = "monospace";

  private lo = 0;
  private hi = 0;
  private scaled = false;
  private hover: { x: number; y: number } | null = null;
  private trade: Trade | null = null;
  private next: TradeKind = "moved";
  private idle = 0;
  private pendingOpen = false;
  private acc = 0;
  private gap = 80;
  private last = 0;
  private raf = 0;
  private dirty = true;
  private introT0 = 0;
  private intro = 1;
  private running = false;
  private lastCursor = "";
  private h$: Handlers = {};

  constructor(canvas: HTMLCanvasElement, layout: ChartLayout) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.layout = layout;
    this.sim = new MarketSim({ seed: 20250927, price: BASE, tick: 0.1, vol: 1.2, ticksPerCandle: TICKS_PER_CANDLE, history: HISTORY });
    this.readTheme();
  }

  on(h: Handlers) {
    this.h$ = h;
  }

  readTheme() {
    this.c = {
      up: tokenColor("profit"),
      down: tokenColor("loss"),
      warn: tokenColor("warn"),
      ink: tokenColor("ink"),
      muted: tokenColor("muted"),
      bg: tokenColor("bg"),
      s3: tokenColor("surface-3"),
    };
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
    this.font = mono || "ui-monospace, monospace";
    this.redraw();
  }

  setLayout(l: ChartLayout) {
    this.layout = l;
    this.scaled = false;
    this.redraw();
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.scaled = false;
    this.redraw();
  }

  setHover(p: { x: number; y: number } | null) {
    if (!p && !this.hover) return;
    this.hover = p;
    if (!p) this.emitLegend();
    this.redraw();
  }

  /** Live mode: history streams in once, then the market ticks and the trades play out. */
  start(withIntro: boolean) {
    if (this.running) return;
    this.running = true;
    if (!this.trade && this.idle === 0) this.open(this.next);
    if (withIntro && this.introT0 === 0) {
      this.introT0 = performance.now();
      this.intro = 0;
    }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Reduced motion: one still frame of the finished "moved stop" trade. */
  still() {
    this.stop();
    this.intro = 1;
    this.open("moved");
    const t = this.trade!;
    for (let i = 0; i < 5000 && t.phase !== "closed"; i++) {
      if (t.phase === "open" && this.sim.price <= t.slPlan + 4) this.moveStop(t);
      this.tick(true);
    }
    for (let i = 0; i < TICKS_PER_CANDLE * 3; i++) this.tick(true);
    t.shown = 1;
    this.emitLegend();
    this.redraw();
  }

  private redraw() {
    this.dirty = true;
    if (!this.running) this.draw(performance.now());
  }

  /* ---------------- market + scenario ---------------- */

  private open(kind: TradeKind) {
    const e = this.sim.price;
    this.pendingOpen = false;
    this.trade = {
      kind,
      phase: "open",
      openIdx: this.sim.count - 1,
      entry: e,
      slPlan: e - RISK_PTS,
      sl: e - RISK_PTS,
      tp: e + TARGET_PTS,
      closeIdx: null,
      exit: null,
      shown: 0,
      fadingOut: false,
      leg: 0,
      legTicks: 0,
      holdTicks: TICKS_PER_CANDLE * 4,
      grabAt: null,
    };
    this.next = kind === "moved" ? "plan" : "moved";
    this.h$.trade?.({ kind, phase: "open", pnl: 0 });
  }

  private moveStop(t: Trade) {
    t.sl = t.entry - MOVED_PTS;
    t.phase = "moved";
    t.leg = 0;
    t.legTicks = 0;
    this.h$.trade?.({ kind: t.kind, phase: "moved", pnl: this.pnl(t) });
  }

  private close(t: Trade, at: number) {
    t.phase = "closed";
    t.exit = at;
    t.closeIdx = this.sim.count - 1;
    const pnl = this.pnl(t);
    this.h$.trade?.({ kind: t.kind, phase: "closed", pnl });
    this.h$.pnl?.(pnl, false);
  }

  private pnl(t: Trade) {
    return Math.round(((t.exit ?? this.sim.price) - t.entry) * USD_PER_PT * 100) / 100;
  }

  /** Lean the market toward a price, never faster than `speed` points a tick. */
  private toward(target: number, speed: number) {
    const s = this.sim;
    s.bias = clamp((target - s.price) * 0.08, -speed, speed);
  }

  private steer() {
    const s = this.sim;
    const t = this.trade;
    s.floor = -Infinity;
    s.ceil = Infinity;
    if (!t || t.phase === "closed") {
      // flat: drift back toward the base so the loop never wanders off the map
      s.bias = (BASE - s.price) * 0.002;
      return;
    }
    t.legTicks += 1;
    if (t.kind === "moved") {
      if (t.phase === "open") {
        // price walks down onto the stop; the planned stop is never hit, the hand gets there first
        s.ceil = t.tp - 6;
        s.floor = t.slPlan + 1.5;
        if (t.grabAt !== null) s.bias = 0;
        else this.toward(t.slPlan + 1, 0.4);
      } else if (t.leg === 0) {
        // after the drag the market bounces a little, as if to justify it
        this.toward(t.slPlan + 9, 0.3);
        if (t.legTicks > 22) (t.leg = 1), (t.legTicks = 0);
      } else {
        this.toward(t.sl - 4, 0.4);
      }
    } else {
      // a trade by the plan: a scare toward the stop, then the target
      s.floor = t.slPlan + 5;
      if (t.leg === 0) {
        this.toward(t.entry - 13, 0.3);
        if (t.legTicks > 45 || s.price <= t.entry - 11) (t.leg = 1), (t.legTicks = 0);
      } else {
        this.toward(t.tp + 4, 0.48);
      }
    }
  }

  private check(now: number, instant: boolean) {
    const t = this.trade;
    if (!t || t.phase === "closed") return;
    const p = this.sim.price;
    if (!instant && t.phase === "open" && t.kind === "moved" && t.grabAt === null && p <= t.slPlan + 4) t.grabAt = now;
    if (p <= t.sl) this.close(t, t.sl);
    else if (p >= t.tp) this.close(t, t.tp);
    else this.h$.pnl?.(this.pnl(t), true);
  }

  private tick(instant = false) {
    this.steer();
    const closedCandle = this.sim.step();
    this.check(performance.now(), instant);
    const t = this.trade;
    if (!instant) {
      if (t?.phase === "closed" && --t.holdTicks <= 0) t.fadingOut = true;
      if (!t && this.idle > 0 && --this.idle === 0) this.pendingOpen = true;
      if (closedCandle && this.pendingOpen) this.open(this.next);
      if (!this.hover) this.emitLegend();
    }
    this.dirty = true;
  }

  /* ---------------- frame loop ---------------- */

  private frame = (now: number) => {
    const dt = Math.min(250, now - this.last);
    this.last = now;
    this.acc += dt;
    while (this.acc >= this.gap) {
      this.acc -= this.gap;
      // ticks do not arrive on a metronome
      this.gap = 45 + this.sim.rand() * 75;
      this.tick();
    }
    let animating = false;
    if (this.intro < 1) {
      this.intro = Math.min(1, (now - this.introT0) / 1300);
      animating = true;
    }
    const t = this.trade;
    if (t) {
      if (t.fadingOut) {
        t.shown = Math.max(0, t.shown - dt / 500);
        if (t.shown === 0) {
          this.trade = null;
          this.idle = TICKS_PER_CANDLE;
        }
        animating = true;
      } else if (t.shown < 1 && this.intro >= 1) {
        t.shown = Math.min(1, t.shown + dt / 450);
        animating = true;
      }
      if (t.grabAt !== null) {
        const g = now - t.grabAt;
        if (g >= GRAB_AT && t.phase === "open") this.moveStop(t);
        if (g < 2000) animating = true;
        else t.grabAt = null;
      }
    }
    if (this.dirty || animating) this.draw(now, dt);
    this.raf = requestAnimationFrame(this.frame);
  };

  /* ---------------- drawing ---------------- */

  private emitLegend(idx?: number) {
    const cs = this.sim.candles;
    const first = this.sim.count - cs.length;
    const i = clamp(idx ?? this.sim.count - 1, first, this.sim.count - 1);
    const candle = cs[i - first];
    const prev = i - first > 0 ? cs[i - first - 1].c : candle.o;
    this.h$.legend?.({ candle, prev, time: this.timeOf(i) });
  }

  /** Chart clock: the live candle at load reads 10:14. */
  private timeOf(i: number) {
    const m = (((10 * 60 + 14 - HISTORY + i) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  private stopShown(t: Trade, now: number) {
    if (t.grabAt === null) return t.sl;
    const g = (now - t.grabAt - GRAB_AT) / DRAG_MS;
    if (g <= 0) return t.slPlan;
    return t.slPlan + (t.entry - MOVED_PTS - t.slPlan) * easeInOut(Math.min(1, g));
  }

  private draw(now: number, dt = 16) {
    const { ctx, w, h, dpr, c } = this;
    if (!w || !h) return;
    this.dirty = false;
    const L = this.layout;
    const sim = this.sim;
    const cs = sim.candles;
    const first = sim.count - cs.length;
    const plotR = w - L.axisW;
    const liveX = plotR - L.rightPad * L.step - L.step / 2;
    const xOf = (i: number) => liveX - (sim.count - 1 - i) * L.step;
    const axisBottom = h - L.bottom;
    const volH = Math.max(26, (axisBottom - L.top) * 0.13);
    const pTop = L.top + 8;
    const pBot = axisBottom - volH - 12;
    const iFrom = Math.max(first, sim.count - 2 - Math.ceil(liveX / L.step));
    const t = this.trade;
    // device-pixel snapping keeps 1px lines and candle bodies crisp
    const D = (v: number) => Math.round(v * dpr);
    const px = (v: number) => D(v) / dpr;

    // autoscale over the readable part, eased so the axis glides instead of jumping
    let lo = Infinity;
    let hi = -Infinity;
    let vMax = 1;
    for (let i = iFrom; i < sim.count; i++) {
      const k = cs[i - first];
      if (k.v > vMax) vMax = k.v;
      if (xOf(i) < w * L.scaleFrom) continue;
      if (k.l < lo) lo = k.l;
      if (k.h > hi) hi = k.h;
    }
    if (t && !t.fadingOut) {
      lo = Math.min(lo, t.kind === "moved" ? t.entry - MOVED_PTS : t.sl);
      hi = Math.max(hi, t.tp);
    }
    const span = Math.max(40, hi - lo);
    const tlo = lo - span * 0.08;
    const thi = hi + span * 0.08;
    if (!this.scaled) {
      this.lo = tlo;
      this.hi = thi;
      this.scaled = true;
    } else {
      // glide while the gap is visible, then snap: an idle chart only redraws on ticks
      const k = 1 - Math.exp(-dt / 140);
      const eps = (thi - tlo) * 0.0015;
      this.lo += (tlo - this.lo) * k;
      this.hi += (thi - this.hi) * k;
      if (Math.abs(tlo - this.lo) > eps || Math.abs(thi - this.hi) > eps) this.dirty = true;
      else (this.lo = tlo), (this.hi = thi);
    }
    const yOf = (p: number) => pTop + ((this.hi - p) / (this.hi - this.lo)) * (pBot - pTop);
    const pOf = (y: number) => this.hi - ((y - pTop) / (pBot - pTop)) * (this.hi - this.lo);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = `500 11px ${this.font}`;
    ctx.textBaseline = "middle";
    const hair = 1 / dpr;

    // everything market-side stays inside the plot, under the legend and the nav
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, L.top, plotR, h - L.top);
    ctx.clip();

    // grid
    const stepP = niceStep(this.hi - this.lo, Math.max(3, Math.round((pBot - pTop) / 62)));
    ctx.fillStyle = c.ink(0.045);
    const gridYs: { y: number; p: number }[] = [];
    for (let p = Math.ceil(this.lo / stepP) * stepP; p <= this.hi; p += stepP) {
      const y = px(yOf(p));
      if (y < pTop - 4 || y > pBot + 4) continue;
      ctx.fillRect(0, y, plotR, hair);
      gridYs.push({ y, p });
    }
    const timeLabels: { x: number; s: string }[] = [];
    for (let i = iFrom; i < sim.count + L.rightPad; i++) {
      if (i % 15 !== 0) continue;
      const x = px(xOf(i));
      if (x < 0 || x > plotR) continue;
      ctx.fillRect(x, L.top, hair, axisBottom - L.top);
      timeLabels.push({ x, s: this.timeOf(i) });
    }

    // candles and volume; on first load they stream in from the left
    const revealX = this.intro >= 1 ? Infinity : easeOut(this.intro) * (liveX + L.step);
    const wickD = Math.max(1, Math.round(dpr));
    let bodyD = Math.max(wickD, Math.round(L.step * 0.62 * dpr));
    if ((bodyD - wickD) % 2) bodyD += 1;
    for (const up of [true, false]) {
      const body = new Path2D();
      const vol = new Path2D();
      for (let i = iFrom; i < sim.count; i++) {
        const k = cs[i - first];
        if (k.c >= k.o !== up) continue;
        const x = xOf(i);
        if (x > revealX) break;
        const X = D(x);
        const yH = D(yOf(k.h));
        const yL = D(yOf(k.l));
        const yA = D(yOf(Math.max(k.o, k.c)));
        const yB = D(yOf(Math.min(k.o, k.c)));
        body.rect((X - (wickD >> 1)) / dpr, yH / dpr, wickD / dpr, Math.max(1, yL - yH) / dpr);
        body.rect((X - (bodyD >> 1)) / dpr, yA / dpr, bodyD / dpr, Math.max(1, yB - yA) / dpr);
        const vh = D((k.v / vMax) * volH);
        vol.rect((X - (bodyD >> 1)) / dpr, (D(axisBottom) - vh) / dpr, bodyD / dpr, vh / dpr);
      }
      ctx.fillStyle = up ? c.up(1) : c.down(1);
      ctx.fill(body);
      ctx.fillStyle = up ? c.up(0.2) : c.down(0.2);
      ctx.fill(vol);
    }

    // the position
    const tags: Tag[] = [];
    const cursor: CursorState = { x: 0, y: 0, mode: "hidden" };
    if (t && t.shown > 0 && this.intro >= 1) {
      ctx.globalAlpha = t.shown;
      const closed = t.phase === "closed";
      const x0 = px(xOf(t.openIdx) - L.step / 2);
      const zoneEnd = closed ? xOf(t.closeIdx!) + L.step / 2 : Math.max(xOf(t.openIdx + ZONE_BARS), liveX + L.step * 1.5);
      const x1 = px(Math.min(plotR, zoneEnd));
      const lineEnd = closed ? x1 : plotR;
      const slNow = this.stopShown(t, now);
      const yE = px(yOf(t.entry));
      const yS = px(yOf(slNow));
      const yT = px(yOf(t.tp));
      const yPlan = px(yOf(t.slPlan));

      ctx.fillStyle = c.up(0.09);
      ctx.fillRect(x0, yT, x1 - x0, yE - yT);
      ctx.fillStyle = c.down(0.1);
      ctx.fillRect(x0, yE, x1 - x0, yS - yE);
      // running result, shaded from the entry to the price
      const at = closed ? t.exit! : sim.price;
      const xr = closed ? x1 : Math.min(x1, px(liveX + L.step / 2));
      const yR = px(yOf(at));
      ctx.fillStyle = at >= t.entry ? c.up(0.16) : c.down(0.2);
      ctx.fillRect(x0, Math.min(yE, yR), xr - x0, Math.abs(yR - yE));

      ctx.fillStyle = c.ink(0.6);
      ctx.fillRect(x0, yE, lineEnd - x0, hair);
      if (!closed) {
        ctx.fillStyle = c.down(0.9);
        ctx.fillRect(x0, yS, plotR - x0, hair);
        ctx.fillStyle = c.up(0.9);
        ctx.fillRect(x0, yT, plotR - x0, hair);
      }

      // the planned stop stays behind as a ghost once the hand moves it
      if (slNow < t.slPlan - 0.05) {
        ctx.strokeStyle = c.warn(0.95);
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x0, yPlan + 0.5);
        ctx.lineTo(lineEnd, yPlan + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        // bracket left of the zone: the risk the drag added
        const bx = x0 - 7;
        ctx.fillStyle = c.warn(0.95);
        ctx.fillRect(bx, yPlan, 1, yS - yPlan);
        ctx.fillRect(bx, yPlan, 5, 1);
        ctx.fillRect(bx, yS - 1, 5, 1);
        if (yS - yPlan > 12) {
          const extra = (t.slPlan - slNow) * USD_PER_PT;
          const text = closed ? `ціна відхилення ${fmtMoney(-extra)}` : `+${fmtMoney(extra, 0).slice(1)} ризику`;
          this.pill(bx - 6, (yPlan + yS) / 2, text, c.warn(1), c.bg(0.94), c.warn(0.55), "right", closed);
        }
      }

      if (!closed) {
        // order labels at the right end of each line, like a trading panel
        // entry marker first, so the order label can sit over it on narrow charts
        ctx.fillStyle = c.ink(1);
        ctx.beginPath();
        ctx.arc(px(xOf(t.openIdx)), yE, 3, 0, Math.PI * 2);
        ctx.fill();
        const narrow = plotR < 520;
        const cents = narrow ? 0 : 2;
        const pnl = this.pnl(t);
        const lx = plotR - 10;
        this.label(lx, yE, narrow ? "LONG" : "LONG 20", fmtMoney(pnl, cents), c.ink(0.9), pnl >= 0 ? c.up(1) : c.down(1), c.ink(0.3));
        this.label(lx, yT, "TP", fmtMoney(TARGET_PTS * USD_PER_PT, cents), c.up(1), c.up(1), c.up(0.5));
        const slW = this.label(lx, yS, "SL", fmtMoney((slNow - t.entry) * USD_PER_PT, cents), c.down(1), c.down(1), c.down(0.55), t.grabAt !== null);
        tags.push({ y: yT, text: fmtPrice(t.tp), bg: c.up(1), fg: c.bg(1), prio: 1 });
        tags.push({ y: yS, text: fmtPrice(slNow), bg: c.down(1), fg: c.bg(1), prio: 1 });
        tags.push({ y: yE, text: fmtPrice(t.entry), bg: c.s3(1), fg: c.ink(1), prio: 0 });

        // the hand: reaches for the stop label, drags it down, lets go
        if (t.grabAt !== null) {
          const g = now - t.grabAt;
          const hx = lx - slW * 0.5;
          if (g < GRAB_AT) {
            const k = easeOut(Math.min(1, g / 520));
            cursor.x = hx + (1 - k) * 56;
            cursor.y = yS + (1 - k) * 44;
            cursor.mode = g > 520 ? "grab" : "point";
          } else if (g < GRAB_AT + DRAG_MS + 150) {
            cursor.x = hx;
            cursor.y = yS;
            cursor.mode = "grab";
          } else if (g < 1950) {
            const k = easeOut((g - GRAB_AT - DRAG_MS - 150) / 400);
            cursor.x = hx + k * 34;
            cursor.y = yS + k * 30;
            cursor.mode = "point";
          }
        }
      } else {
        const xe = px(xOf(t.closeIdx!));
        const ye = px(yOf(t.exit!));
        const res = this.pnl(t);
        const col = res >= 0 ? c.up : c.down;
        ctx.fillStyle = c.bg(1);
        ctx.beginPath();
        ctx.arc(xe, ye, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = col(1);
        ctx.lineWidth = 2;
        ctx.stroke();
        this.pill(xe + 11, ye + (res >= 0 ? -15 : 15), fmtMoney(res), col(1), c.bg(0.94), col(0.6), "left", true, plotR - 4);
        ctx.fillStyle = c.ink(1);
        ctx.beginPath();
        ctx.arc(px(xOf(t.openIdx)), yE, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const cursorKey = cursor.mode === "hidden" ? "h" : `${cursor.mode}${Math.round(cursor.x)},${Math.round(cursor.y)}`;
    if (cursorKey !== this.lastCursor) {
      this.lastCursor = cursorKey;
      this.h$.cursor?.(cursor);
    }

    ctx.fillStyle = c.muted(1);
    ctx.textAlign = "center";
    for (const l of timeLabels) ctx.fillText(l.s, l.x, axisBottom + 13);
    ctx.textAlign = "left";

    // history dissolves at the top and left edges and under the headline
    ctx.globalCompositeOperation = "destination-out";
    const tf = ctx.createLinearGradient(0, L.top, 0, L.top + 40);
    tf.addColorStop(0, "rgba(0,0,0,1)");
    tf.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = tf;
    ctx.fillRect(0, L.top, plotR, 40);
    if (L.edge > 0) {
      const g = ctx.createLinearGradient(0, 0, L.edge, 0);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, L.edge, h);
    }
    const hole = L.hole?.(w, h);
    if (hole) {
      ctx.save();
      ctx.translate(hole.x, hole.y);
      ctx.scale(1, hole.ry / hole.rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, hole.rx);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.58, "rgba(0,0,0,0.97)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-hole.rx, -hole.rx, hole.rx * 2, hole.rx * 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // live price line and its tag with the candle countdown
    const live = cs[cs.length - 1];
    const upNow = live.c >= live.o;
    if (this.intro >= 1) {
      const yP = px(yOf(sim.price));
      ctx.strokeStyle = upNow ? c.up(0.6) : c.down(0.6);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(0, yP + 0.5);
      ctx.lineTo(plotR, yP + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      const secs = Math.max(0, Math.round(60 - sim.inCandle * SIM_SECONDS_PER_TICK));
      tags.push({ y: yP, text: fmtPrice(sim.price), sub: `0:${String(secs).padStart(2, "0")}`, bg: upNow ? c.up(1) : c.down(1), fg: c.bg(1), prio: 2 });
    }

    // crosshair
    const hv = this.hover;
    let hoverIdx: number | null = null;
    if (hv && hv.x >= 0 && hv.x < plotR && hv.y > L.top && hv.y < axisBottom) {
      hoverIdx = clamp(Math.round((hv.x - liveX) / L.step) + sim.count - 1, first, sim.count - 1);
      const x = px(xOf(hoverIdx)) + 0.5;
      ctx.strokeStyle = c.ink(0.38);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, L.top);
      ctx.lineTo(x, axisBottom);
      if (hv.y <= pBot) {
        ctx.moveTo(0, px(hv.y) + 0.5);
        ctx.lineTo(plotR, px(hv.y) + 0.5);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      if (hv.y <= pBot) tags.push({ y: hv.y, text: fmtPrice(Math.round(pOf(hv.y) * 10) / 10), bg: c.s3(1), fg: c.ink(1), prio: 3 });
    }

    // price axis
    ctx.fillStyle = c.bg(1);
    ctx.fillRect(plotR, 0, L.axisW, h);
    ctx.fillStyle = c.ink(0.08);
    ctx.fillRect(plotR, L.top, hair, axisBottom - L.top);
    const placed = this.place(tags, L.top + 9, axisBottom);
    ctx.fillStyle = c.muted(1);
    ctx.textAlign = "left";
    for (const g of gridYs) {
      if (placed.some((p) => g.y > p.y - 18 && g.y < p.y + (p.sub ? 30 : 18))) continue;
      ctx.fillText(fmtPrice(g.p), plotR + 8, g.y);
    }
    for (const p of placed) {
      ctx.fillStyle = p.bg;
      this.round(plotR + 3, p.y - 9, L.axisW - 6, p.sub ? 31 : 18, 3);
      ctx.fill();
      ctx.fillStyle = p.fg;
      ctx.fillText(p.text, plotR + 8, p.y + 0.5);
      if (p.sub) {
        ctx.globalAlpha = 0.7;
        ctx.fillText(p.sub, plotR + 8, p.y + 13);
        ctx.globalAlpha = 1;
      }
    }

    // time axis
    const ty = axisBottom + 13;
    ctx.textAlign = "center";
    if (hoverIdx !== null) {
      const x = px(xOf(hoverIdx));
      ctx.fillStyle = c.s3(1);
      this.round(x - 24, ty - 9, 48, 18, 3);
      ctx.fill();
      ctx.fillStyle = c.ink(1);
      ctx.fillText(this.timeOf(hoverIdx), x, ty + 0.5);
    }
    ctx.textAlign = "left";

    if (hv) this.emitLegend(hoverIdx ?? undefined);
  }

  /** Order-line label [NAME value], right-aligned at xr. Returns its width. */
  private label(xr: number, y: number, name: string, value: string, nameC: string, valueC: string, border: string, active = false) {
    const { ctx, c } = this;
    const nW = ctx.measureText(name).width;
    const vW = ctx.measureText(value).width;
    const wd = Math.round(7 + nW + 9 + vW + 7);
    const x = Math.round(xr - wd) + 0.5;
    ctx.fillStyle = c.bg(1);
    this.round(x, Math.round(y) - 9.5, wd, 19, 4);
    ctx.fill();
    ctx.strokeStyle = active ? c.ink(0.85) : border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = nameC;
    ctx.fillText(name, x + 7, y + 0.5);
    ctx.fillStyle = valueC;
    ctx.fillText(value, x + 7 + nW + 9, y + 0.5);
    return wd;
  }

  /** Rounded tag. A left-aligned pill that would cross maxX flips to the other side of x. */
  private pill(x: number, y: number, text: string, fg: string, bg: string, border: string, align: "left" | "right", bold = false, maxX = Infinity) {
    const { ctx } = this;
    if (bold) ctx.font = `600 11px ${this.font}`;
    const wd = Math.round(ctx.measureText(text).width + 16);
    const flip = align === "left" && x + wd > maxX;
    const x0 = Math.round(align === "left" && !flip ? x : x - wd - (flip ? 22 : 0)) + 0.5;
    ctx.fillStyle = bg;
    this.round(x0, Math.round(y) - 9.5, wd, 19, 9.5);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.fillText(text, x0 + 8, y + 0.5);
    if (bold) ctx.font = `500 11px ${this.font}`;
  }

  private round(x: number, y: number, w: number, h: number, r: number) {
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, w, h, r);
  }

  /** Axis tags: the most important keep their level, the rest step aside. */
  private place(tags: Tag[], top: number, bottom: number) {
    const hOf = (t: Tag) => (t.sub ? 31 : 18);
    const placed: Tag[] = [];
    for (const t of [...tags].sort((a, b) => b.prio - a.prio)) {
      let y = clamp(t.y, top, bottom - hOf(t) + 9);
      for (let n = 0; n < 6; n++) {
        const hit = placed.find((p) => y - 9 < p.y - 9 + hOf(p) + 2 && p.y - 9 < y - 9 + hOf(t) + 2);
        if (!hit) break;
        const above = hit.y - hOf(t) - 2;
        const below = hit.y + hOf(hit) + 2;
        y = Math.abs(above - t.y) <= Math.abs(below - t.y) && above >= top ? above : below;
      }
      placed.push({ ...t, y });
    }
    return placed;
  }
}
