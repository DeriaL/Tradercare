export type Pt = { x: number; y: number };

type Box = { w: number; h: number; padTop?: number; padBottom?: number; min?: number; max?: number };

/** Map a numeric series into SVG coordinates inside a w*h box. */
export function project(values: number[], box: Box): Pt[] {
  const { w, h, padTop = 8, padBottom = 8 } = box;
  const min = box.min ?? Math.min(...values);
  const max = box.max ?? Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: i * step,
    y: padTop + (1 - (v - min) / span) * (h - padTop - padBottom),
  }));
}

/**
 * Monotone cubic (Fritsch-Carlson) path. Smooth without overshooting,
 * which matters for equity curves: a spline must never invent a new high.
 * Always emits one "C" per segment so paths with equal point counts morph cleanly.
 */
export function smoothPath(pts: Pt[]): string {
  const n = pts.length;
  if (n < 2) return "";
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1].x - pts[i].x);
    m.push((pts[i + 1].y - pts[i].y) / (dx[i] || 1));
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t.push(0);
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t.push((w1 + w2) / (w1 / m[i - 1] + w2 / m[i]));
    }
  }
  t.push(m[n - 2]);
  let d = `M${r(pts[0].x)},${r(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${r(pts[i].x + h)},${r(pts[i].y + t[i] * h)},${r(pts[i + 1].x - h)},${r(pts[i + 1].y - t[i + 1] * h)},${r(pts[i + 1].x)},${r(pts[i + 1].y)}`;
  }
  return d;
}

/** Closed area under a line path, down to the baseline y. */
export function areaPath(line: string, pts: Pt[], baseline: number): string {
  if (!pts.length) return "";
  const last = pts[pts.length - 1];
  return `${line}L${r(last.x)},${r(baseline)}L${r(pts[0].x)},${r(baseline)}Z`;
}

/** Straight polyline, used for sparklines where smoothing would lie. */
export function linePath(pts: Pt[]): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${r(p.x)},${r(p.y)}`).join("");
}

const r = (v: number) => Math.round(v * 10) / 10;
