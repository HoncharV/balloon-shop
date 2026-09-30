#!/usr/bin/env node
/**
 * Deterministic SVG artwork generator for the Balloon Magic landing page.
 * Plain ESM, zero dependencies.  Usage:  node scripts/generate-images.mjs
 *
 * Rules baked in here:
 *   - shapes only, never a <text> element (font-independent rendering)
 *   - every gradient id is unique inside its own file
 *   - a seeded PRNG (mulberry32) keeps the output byte-identical across runs
 *   - coordinates are rounded to 1 decimal so files stay small
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE_LIMIT = 6144; // ~6 KB per file

/* ------------------------------------------------------------------ *
 * deterministic random
 * ------------------------------------------------------------------ */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(name) {
  const r = mulberry32(hashSeed(name));
  return {
    next: r,
    range: (a, b) => a + r() * (b - a),
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    pick: (list) => list[Math.floor(r() * list.length)],
    jitter: (amount) => (r() * 2 - 1) * amount,
  };
}

const num = (value) => {
  const v = Math.round(value * 10) / 10;
  return Object.is(v, -0) ? '0' : String(v);
};

/* ------------------------------------------------------------------ *
 * palette + gradients
 * ------------------------------------------------------------------ */

const STRING = '#C7CDD8';
const INK = '#1F2937';

const GRADIENTS = {
  bg: { type: 'linear', stops: [['0', '#FFF7FB'], ['1', '#F1F9FF']] },
  panel: { type: 'linear', stops: [['0', '#FFFDFE'], ['1', '#EAF4FF']] },
  gp: { type: 'radial', stops: [['0.08', '#FFC4E0'], ['.55', '#FF69B4'], ['1', '#D9438C']] },
  gps: { type: 'radial', stops: [['0.08', '#FFE4F2'], ['.55', '#FFA6CF'], ['1', '#F07BB4']] },
  gb: { type: 'radial', stops: [['0.08', '#D9F0FC'], ['.55', '#87CEEB'], ['1', '#4FA8D8']] },
  gbs: { type: 'radial', stops: [['0.08', '#E8F7FF'], ['.55', '#A9DCF5'], ['1', '#7FC4E6']] },
  gg: { type: 'radial', stops: [['0.08', '#FFF3BE'], ['.55', '#FFD700'], ['1', '#D9A800']] },
  ggs: { type: 'radial', stops: [['0.08', '#FFF6D0'], ['.55', '#FFE064'], ['1', '#EFC200']] },
  gw: { type: 'radial', stops: [['0.08', '#FFFFFF'], ['.6', '#F2F6FB'], ['1', '#C9D2E0']] },
};

const GRAD_ORDER = ['bg', 'panel', 'gp', 'gps', 'gb', 'gbs', 'gg', 'ggs', 'gw'];

const KNOT = {
  gp: '#D9438C',
  gps: '#F07BB4',
  gb: '#4FA8D8',
  gbs: '#8ACBEA',
  gg: '#D9A800',
  ggs: '#F2C400',
  gw: '#B9C3D2',
};

function gradientMarkup(id) {
  const g = GRADIENTS[id];
  const stops = g.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  if (g.type === 'linear') {
    return `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">${stops}</linearGradient>`;
  }
  return `<radialGradient id="${id}" cx="34%" cy="28%" r="78%">${stops}</radialGradient>`;
}

function makeDefs() {
  const used = new Set();
  return {
    fill(id) {
      used.add(id);
      return `url(#${id})`;
    },
    render() {
      const parts = GRAD_ORDER.filter((id) => used.has(id)).map(gradientMarkup);
      return parts.length ? `<defs>${parts.join('')}</defs>` : '';
    },
  };
}

/** dominant colour -> ordered colour sequence (dominant stays the majority). */
function palette(dom) {
  const soft = { gp: 'gps', gb: 'gbs', gg: 'ggs' }[dom];
  const others = ['gp', 'gb', 'gg'].filter((c) => c !== dom);
  return [dom, others[0], soft, dom, others[1], dom, others[0], soft, dom, others[1], dom, soft, others[0], dom, others[1], soft, dom, others[0], dom, others[1]];
}

/* ------------------------------------------------------------------ *
 * primitives
 * ------------------------------------------------------------------ */

/** Glossy balloon: gradient body + specular highlight + triangular knot. */
function balloonMarkup(defs, o) {
  const x = o.x;
  const y = o.y;
  const rx = o.rx;
  const ry = o.ry;
  const g = o.g || 'gp';
  const parts = [
    `<ellipse cx="${num(x)}" cy="${num(y)}" rx="${num(rx)}" ry="${num(ry)}" fill="${defs.fill(g)}"/>`,
    `<ellipse cx="${num(x - rx * 0.33)}" cy="${num(y - ry * 0.36)}" rx="${num(rx * 0.17)}" ry="${num(ry * 0.13)}" fill="#fff" opacity=".5"/>`,
  ];
  if (o.knot !== 'none') {
    const up = o.knot === 'top';
    const by = up ? y - ry * 0.99 : y + ry * 0.99;
    const h = up ? -ry * 0.2 : ry * 0.2;
    parts.push(
      `<path d="M${num(x - rx * 0.14)} ${num(by)}h${num(rx * 0.28)}l${num(-rx * 0.14)} ${num(h)}z" fill="${KNOT[g] || '#D9438C'}"/>`,
    );
  }
  const body = parts.join('');
  return o.tilt ? `<g transform="rotate(${num(o.tilt)} ${num(x)} ${num(y)})">${body}</g>` : body;
}

/** Quadratic curve from (sx,sy) to (ex,ey); `bow` bends it sideways. */
function stringPath(sx, sy, ex, ey, bow = 0) {
  const mx = (sx + ex) / 2 + bow;
  const my = (sy + ey) / 2;
  return `M${num(sx)} ${num(sy)}Q${num(mx)} ${num(my)} ${num(ex)} ${num(ey)}`;
}

function makeSketch(seedName) {
  const rnd = makeRng(seedName);
  const defs = makeDefs();
  const back = [];
  const front = [];
  const strings = [];

  const stringsMarkup = () =>
    strings.length
      ? `<path d="${strings.join('')}" fill="none" stroke="${STRING}" stroke-width="1.5" opacity=".7"/>`
      : '';

  const api = {
    rnd,
    fill: (id) => defs.fill(id),
    behind: (markup) => back.push(markup),
    add: (markup) => front.push(markup),
    balloon(o) {
      front.push(balloonMarkup(defs, o));
    },
    balloons(list) {
      list.forEach((o) => api.balloon(o));
    },
    tie(sx, sy, ex, ey, bow = 0) {
      strings.push(stringPath(sx, sy, ex, ey, bow));
    },
    /** string from a balloon bottom down to an anchor */
    tieDown(o, ex, ey, bow = 0) {
      api.tie(o.x, o.y + o.ry * 1.2, ex, ey, bow);
    },
    /** string from the ceiling down to a hanging balloon top */
    tieUp(o, sy, bow = 0) {
      api.tie(o.x, sy, o.x, o.y - o.ry * 1.2, bow);
    },
    knotDot(x, y, r = 6, c = '#D9438C') {
      front.push(`<circle cx="${num(x)}" cy="${num(y)}" r="${num(r)}" fill="${c}"/>`);
    },
    ground(cx, cy, rx, ry = 22, opacity = 0.07) {
      back.push(`<ellipse cx="${num(cx)}" cy="${num(cy)}" rx="${num(rx)}" ry="${num(ry)}" fill="${INK}" opacity="${opacity}"/>`);
    },
    doc({ w, h, bg = true, slice = false, opacity = 1 }) {
      const bgRect = bg ? `<rect width="${w}" height="${h}" fill="${defs.fill('bg')}"/>` : '';
      const head = defs.render() + bgRect;
      const body = [...back, stringsMarkup(), ...front].join('');
      const group = opacity === 1 ? body : `<g opacity="${opacity}">${body}</g>`;
      const attrs =
        `xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"` +
        (slice ? ' preserveAspectRatio="xMidYMid slice"' : '');
      return `<svg ${attrs}>${head}${group}</svg>`;
    },
  };
  return api;
}

/** Keep a balloon fully inside the canvas (small breathing pad). */
function fit(b, w, h, pad = 10) {
  b.x = Math.min(Math.max(b.x, pad + b.rx), w - pad - b.rx);
  b.y = Math.min(Math.max(b.y, pad + b.ry), h - pad - b.ry);
  return b;
}

/** Points on a half/full arch; angles run clockwise from `fromDeg` to `toDeg`. */
function archPoints(count, cx, cy, a, b, fromDeg = 200, toDeg = -20) {
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const r = ((fromDeg + (toDeg - fromDeg) * t) * Math.PI) / 180;
    pts.push({ x: cx + Math.cos(r) * a, y: cy - Math.sin(r) * b, t });
  }
  return pts;
}

/** Points along a quadratic swag (garland drape). */
function swagPoints(count, x0, y0, cxp, cyp, x1, y1) {
  const pts = [];
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const u = 1 - t;
    pts.push({
      x: u * u * x0 + 2 * u * t * cxp + t * t * x1,
      y: u * u * y0 + 2 * u * t * cyp + t * t * y1,
      t,
    });
  }
  return pts;
}

/** Heart outline, resampled to `count` points spaced evenly by arc length. */
function heartPoints(count, cx, cy, scale) {
  const samples = 360;
  const trail = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = (i * 2 * Math.PI) / samples;
    const hx = 16 * Math.sin(t) ** 3;
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    trail.push({ x: cx + hx * scale, y: cy - hy * scale });
  }
  const spans = [];
  let total = 0;
  for (let i = 1; i < trail.length; i += 1) {
    const len = Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
    total += len;
    spans.push({ from: trail[i - 1], to: trail[i], len, at: total });
  }
  const pts = [];
  for (let k = 0; k < count; k += 1) {
    const target = (total * k) / count;
    let i = 0;
    while (i < spans.length - 1 && spans[i].at < target) i += 1;
    const span = spans[i];
    const f = span.len === 0 ? 0 : (target - (span.at - span.len)) / span.len;
    pts.push({
      x: span.from.x + (span.to.x - span.from.x) * f,
      y: span.from.y + (span.to.y - span.from.y) * f,
      t: k / count,
    });
  }
  return pts;
}

function confetti(rnd, count, x, y, w, h) {
  const colours = ['#FFD700', '#FF69B4', '#87CEEB', '#FFA6CF', '#B9E3F7'];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const px = x + rnd.next() * w;
    const py = y + rnd.next() * h;
    const c = rnd.pick(colours);
    if (rnd.next() < 0.45) {
      out.push(`<circle cx="${num(px)}" cy="${num(py)}" r="${num(rnd.range(3, 6.5))}" fill="${c}" opacity=".7"/>`);
    } else {
      const cx2 = num(px);
      const cy2 = num(py);
      out.push(
        `<rect x="${cx2}" y="${cy2}" width="${num(rnd.range(6, 10))}" height="${num(rnd.range(3, 5))}" rx="1.5" fill="${c}" opacity=".7" transform="rotate(${rnd.int(0, 90)} ${cx2} ${cy2})"/>`,
      );
    }
  }
  return out.join('');
}

/* ------------------------------------------------------------------ *
 * 1200x900 hero layer — transparent, balloons pushed to the corners
 * ------------------------------------------------------------------ */

function heroSvg() {
  const W = 1200;
  const H = 900;
  const s = makeSketch('hero');
  const rnd = s.rnd;

  // y stays inside 120..780 so a 16:9 object-cover crop cannot clip a balloon
  const groups = [
    { cx: 150, cy: 186, r: 104, n: 4, dom: 'gp' },
    { cx: 1055, cy: 164, r: 96, n: 3, dom: 'gb' },
    { cx: 140, cy: 726, r: 96, n: 3, dom: 'gg' },
    { cx: 1062, cy: 736, r: 104, n: 4, dom: 'gp' },
  ];

  for (const g of groups) {
    const pal = palette(g.dom);
    for (let i = 0; i < g.n; i += 1) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / g.n + rnd.jitter(0.16);
      const b = fit(
        {
          x: g.cx + Math.cos(a) * g.r * 0.86,
          y: g.cy + Math.sin(a) * g.r * 0.7,
          rx: 46 + rnd.range(-4, 6),
          ry: 52 + rnd.range(-4, 6),
          g: pal[i % pal.length],
        },
        W,
        H,
        24,
      );
      s.balloon(b);
      s.tieDown(b, b.x + rnd.jitter(26), b.y + b.ry + rnd.range(64, 116), rnd.jitter(20));
    }
  }

  // two small accents that stay clear of the centred headline
  const accents = [
    { x: 336, y: 126, rx: 28, ry: 32, g: 'gps' },
    { x: 902, y: 800, rx: 26, ry: 30, g: 'ggs' },
  ];
  for (const a of accents) {
    s.balloon(a);
    s.tieDown(a, a.x + rnd.jitter(14), Math.min(a.y + a.ry + 58, 856), rnd.jitter(12));
  }

  s.behind(confetti(rnd, 3, 20, 124, 240, 650));
  s.behind(confetti(rnd, 3, 950, 124, 230, 650));

  return s.doc({ w: W, h: H, bg: false, opacity: 0.7 });
}

/* ------------------------------------------------------------------ *
 * 256x256 mark (logo.svg + icon.svg)
 * ------------------------------------------------------------------ */

function logoSvg() {
  const W = 256;
  const H = 256;
  const s = makeSketch('logo-mark');
  const balloons = [
    { x: 92, y: 118, rx: 40, ry: 46, g: 'gb' },
    { x: 166, y: 112, rx: 42, ry: 48, g: 'gg' },
    { x: 128, y: 82, rx: 46, ry: 53, g: 'gp' },
  ];
  s.balloons(balloons);
  const tieX = 128;
  const tieY = 226;
  s.tie(92, 173, tieX - 4, tieY, -6);
  s.tie(166, 169, tieX + 4, tieY, 6);
  s.tie(128, 146, tieX, tieY, 3);
  s.knotDot(tieX, tieY + 2, 6.5);
  return s.doc({ w: W, h: H, bg: false });
}

/* ------------------------------------------------------------------ *
 * package cards (800x600)
 * ------------------------------------------------------------------ */

function startSvg() {
  const W = 800;
  const H = 600;
  const s = makeSketch('package-start');
  const rnd = s.rnd;
  const pal = palette('gp');
  s.ground(400, 512, 250, 24, 0.06);

  const anchor = { x: 400, y: 498 };
  const cluster = [
    { x: 400, y: 268, rx: 58, ry: 66, g: pal[0] },
    { x: 336, y: 322, rx: 48, ry: 55, g: pal[1] },
    { x: 464, y: 318, rx: 48, ry: 55, g: pal[2] },
    { x: 296, y: 240, rx: 42, ry: 48, g: pal[3] },
    { x: 504, y: 236, rx: 42, ry: 48, g: pal[4] },
  ];
  for (const b of cluster) {
    s.balloon(b);
    s.tieDown(b, anchor.x + (b.x - anchor.x) * 0.25 + rnd.jitter(4), anchor.y, rnd.jitter(10));
  }

  const floaters = [
    { x: 172, y: 262, rx: 38, ry: 44, g: 'gps' },
    { x: 632, y: 284, rx: 38, ry: 44, g: 'ggs' },
  ];
  for (const b of floaters) {
    s.balloon(b);
    s.tieDown(b, b.x - 22 + rnd.jitter(8), 486, rnd.jitter(18));
  }

  s.knotDot(anchor.x, anchor.y + 4, 7);
  return s.doc({ w: W, h: H, slice: true });
}

/** Foil-look digit "1", drawn as shapes (never as <text>). */
function foilOne(s) {
  s.add(`<rect x="650" y="240" width="56" height="190" rx="14" fill="${s.fill('gg')}"/>`);
  s.add('<path d="M650 268 596 306 596 262 650 226z" fill="#FFE479"/>');
  s.add('<rect x="622" y="412" width="112" height="32" rx="12" fill="#FFD700"/>');
  s.add('<path d="M666 252h16v166h-16z" fill="#FFFAE2" opacity=".55"/>');
  s.add('<path d="M604 292 648 264v14l-44 28z" fill="#FFF3BE" opacity=".7"/>');
  s.add('<path d="M650 306h56M650 356h56" stroke="#D9A800" stroke-width="2" opacity=".4" fill="none"/>');
  s.ground(668, 452, 96, 13, 0.06);
}

function standardSvg() {
  const W = 800;
  const H = 600;
  const s = makeSketch('package-standard');
  const rnd = s.rnd;
  const pal = palette('gb');
  s.ground(380, 528, 320, 26, 0.06);

  const anchor = { x: 250, y: 508 };
  const bouquet = [
    { x: 250, y: 236, rx: 50, ry: 58, g: pal[0] },
    { x: 182, y: 292, rx: 46, ry: 52, g: pal[1] },
    { x: 320, y: 288, rx: 46, ry: 52, g: pal[2] },
    { x: 236, y: 372, rx: 50, ry: 56, g: pal[3] },
    { x: 148, y: 368, rx: 44, ry: 50, g: pal[4] },
    { x: 336, y: 372, rx: 44, ry: 50, g: pal[5] },
    { x: 106, y: 268, rx: 38, ry: 43, g: pal[7] },
    { x: 386, y: 256, rx: 38, ry: 43, g: pal[8] },
    { x: 88, y: 412, rx: 36, ry: 41, g: pal[9] },
    { x: 400, y: 414, rx: 36, ry: 41, g: pal[10] },
    { x: 250, y: 174, rx: 40, ry: 45, g: pal[12] },
  ];
  for (const b of bouquet) {
    s.balloon(b);
    s.tieDown(b, anchor.x + (b.x - anchor.x) * 0.2 + rnd.jitter(4), anchor.y, rnd.jitter(12));
  }

  const small = [
    { x: 528, y: 330, rx: 46, ry: 52, g: 'gb' },
    { x: 486, y: 378, rx: 40, ry: 45, g: 'gps' },
    { x: 578, y: 372, rx: 40, ry: 45, g: 'ggs' },
  ];
  for (const b of small) {
    s.balloon(b);
    s.tieDown(b, 528 + (b.x - 528) * 0.3 + rnd.jitter(4), 500, rnd.jitter(12));
  }
  s.knotDot(anchor.x, anchor.y + 4, 7);
  s.knotDot(528, 504, 7);

  foilOne(s);
  return s.doc({ w: W, h: H, slice: true });
}

function premiumSvg() {
  const W = 800;
  const H = 600;
  const s = makeSketch('package-premium');
  const rnd = s.rnd;
  const pal = palette('gp');

  // photo-zone backdrop panel
  s.behind(`<rect x="250" y="200" width="300" height="320" rx="20" fill="${s.fill('panel')}" stroke="#FFD9EE" stroke-width="3"/>`);
  s.behind('<rect x="264" y="214" width="272" height="292" rx="14" fill="none" stroke="#FFEAF5" stroke-width="2"/>');
  s.behind('<path d="M264 246v-22a10 10 0 0 1 10-10h22" fill="none" stroke="#FFD700" stroke-width="4" opacity=".85"/>');
  s.behind('<path d="M536 246v-22a10 10 0 0 0-10-10h-22" fill="none" stroke="#FFD700" stroke-width="4" opacity=".85"/>');
  s.behind('<path d="M264 474v22a10 10 0 0 0 10 10h22" fill="none" stroke="#FFD700" stroke-width="4" opacity=".85"/>');
  s.behind('<path d="M536 474v22a10 10 0 0 1-10 10h-22" fill="none" stroke="#FFD700" stroke-width="4" opacity=".85"/>');
  s.ground(400, 556, 300, 22, 0.06);

  const arch = archPoints(13, 400, 470, 310, 250, 202, -22);
  arch.forEach((p, i) => {
    const k = 0.86 + 0.2 * Math.sin(Math.PI * p.t);
    const b = fit(
      { x: p.x, y: p.y, rx: 44 * k + rnd.range(-1.5, 1.5), ry: 50 * k + rnd.range(-1.5, 1.5), g: pal[i % pal.length] },
      W,
      H,
      14,
    );
    s.balloon(b);
  });

  // short tie strings at the two arch legs
  s.tie(96, 556, 96, 580, 2);
  s.tie(704, 556, 704, 580, -2);
  s.knotDot(96, 583, 5, '#4FA8D8');
  s.knotDot(704, 583, 5, '#4FA8D8');

  s.add(confetti(rnd, 6, 110, 120, 580, 120));
  s.add(confetti(rnd, 4, 300, 240, 200, 240));
  return s.doc({ w: W, h: H, slice: true });
}

/* ------------------------------------------------------------------ *
 * gallery (800x600) — twelve genuinely different compositions
 * ------------------------------------------------------------------ */

/** 01 — one dense bouquet (dominant pink). */
function galleryCluster() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-01');
  const rnd = s.rnd;
  const pal = palette('gp');
  s.ground(400, 524, 296, 26, 0.06);
  const anchor = { x: 400, y: 506 };

  const pts = [{ x: 400, y: 206, sc: 1.06 }];
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + rnd.jitter(0.1);
    pts.push({ x: 400 + Math.cos(a) * 108, y: 318 + Math.sin(a) * 80, sc: 0.96 });
  }
  for (let i = 0; i < 7; i += 1) {
    const a = -Math.PI / 2 + Math.PI / 7 + (i * 2 * Math.PI) / 7 + rnd.jitter(0.08);
    pts.push({ x: 400 + Math.cos(a) * 190, y: 342 + Math.sin(a) * 120, sc: 0.86 });
  }

  pts.forEach((p, i) => {
    const b = fit({ x: p.x, y: p.y, rx: 56 * p.sc, ry: 63 * p.sc, g: pal[i % pal.length] }, W, H, 16);
    s.balloon(b);
    s.tieDown(b, anchor.x + (b.x - anchor.x) * 0.22 + rnd.jitter(5), anchor.y, rnd.jitter(12));
  });
  s.knotDot(anchor.x, anchor.y + 4, 8);
  return s.doc({ w: W, h: H, slice: true });
}

/** 02 — balloon arch on two poles (dominant blue). */
function galleryArch() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-02');
  const rnd = s.rnd;
  const pal = palette('gb');
  s.ground(400, 556, 320, 22, 0.06);

  archPoints(15, 400, 466, 298, 238, 196, -16).forEach((p, i) => {
    const k = 0.86 + 0.2 * Math.sin(Math.PI * p.t);
    const b = fit({ x: p.x, y: p.y, rx: 44 * k + rnd.jitter(2), ry: 50 * k + rnd.jitter(2), g: pal[i % pal.length] }, W, H, 14);
    s.balloon(b);
  });

  const drop = { x: 400, y: 344, rx: 34, ry: 38, g: 'gps', knot: 'top' };
  s.balloon(drop);
  s.tieUp(drop, 244, 6);
  return s.doc({ w: W, h: H, slice: true });
}

/** 03 — flat balloon wall / 4x4 grid (dominant gold). */
function galleryWall() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-03');
  const rnd = s.rnd;
  const pal = palette('gg');
  s.ground(400, 566, 320, 20, 0.05);
  const cols = [168, 320, 472, 624];
  const rows = [100, 224, 348, 470];
  let i = 0;
  for (const y of rows) {
    for (const x of cols) {
      const b = fit({ x: x + rnd.jitter(4), y: y + rnd.jitter(4), rx: 68 + rnd.jitter(3), ry: 76 + rnd.jitter(3), g: pal[i % pal.length] }, W, H, 12);
      i += 1;
      s.balloon(b);
    }
  }
  s.add(confetti(rnd, 5, 60, 40, 680, 40));
  return s.doc({ w: W, h: H, slice: true });
}

/** 04 — balloons hung from the ceiling (dominant pink). */
function galleryCeiling() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-04');
  const rnd = s.rnd;
  const pal = palette('gp');
  s.ground(400, 560, 300, 18, 0.05);

  const xs = [116, 200, 288, 400, 512, 600, 684];
  const ys = [470, 386, 302, 246, 302, 386, 470];
  xs.forEach((x, i) => {
    const b = fit({ x, y: ys[i], rx: 42, ry: 48, g: pal[i % pal.length], knot: 'top' }, W, H, 14);
    s.balloon(b);
    s.tieUp(b, 0, rnd.jitter(16));
  });

  const high = [
    { x: 250, y: 150, rx: 32, ry: 36, g: 'gps' },
    { x: 552, y: 166, rx: 32, ry: 36, g: 'ggs' },
  ];
  for (const b of high) {
    s.balloon({ ...b, knot: 'top' });
    s.tieUp(b, 0, rnd.jitter(12));
  }
  return s.doc({ w: W, h: H, slice: true });
}

/** 05 — gift box with balloons popping out (dominant blue). */
function galleryBox() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-05');
  const rnd = s.rnd;
  const pal = palette('gb');
  s.ground(400, 548, 280, 22, 0.06);

  s.behind(`<rect x="235" y="380" width="330" height="150" rx="10" fill="${s.fill('gbs')}" stroke="#4FA8D8" stroke-width="3"/>`);
  s.behind('<rect x="235" y="372" width="330" height="28" rx="14" fill="#4FA8D8" opacity=".3"/>');
  s.behind('<rect x="382" y="380" width="36" height="150" fill="#FFD700" opacity=".85"/>');
  s.behind('<rect x="235" y="450" width="330" height="28" fill="#FFD700" opacity=".85"/>');

  const boxed = [
    { x: 300, y: 332, rx: 46, ry: 52 },
    { x: 400, y: 302, rx: 50, ry: 56 },
    { x: 500, y: 332, rx: 46, ry: 52 },
    { x: 258, y: 264, rx: 40, ry: 45 },
    { x: 400, y: 216, rx: 44, ry: 50 },
    { x: 544, y: 264, rx: 40, ry: 45 },
    { x: 352, y: 352, rx: 42, ry: 47 },
    { x: 452, y: 352, rx: 42, ry: 47 },
  ];
  boxed.forEach((b, i) => {
    s.balloon({ ...b, g: pal[i % pal.length] });
    s.tieDown(b, b.x + rnd.jitter(14), 392 + rnd.jitter(6), rnd.jitter(8));
  });

  const floating = [
    { x: 160, y: 186, rx: 36, ry: 41, g: 'gps' },
    { x: 646, y: 208, rx: 34, ry: 39, g: 'ggs' },
  ];
  for (const b of floating) {
    s.balloon(b);
    s.tieDown(b, b.x + (b.x < 400 ? 30 : -30), 424, rnd.jitter(14));
  }
  return s.doc({ w: W, h: H, slice: true });
}

/** 06 — big translucent balloon bubble with confetti (dominant gold). */
function galleryBubble() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-06');
  const rnd = s.rnd;
  const pal = palette('gg');
  s.ground(400, 562, 280, 18, 0.05);

  s.behind(`<ellipse cx="400" cy="298" rx="236" ry="204" fill="${s.fill('gw')}" opacity=".42"/>`);
  s.behind('<ellipse cx="400" cy="298" rx="236" ry="204" fill="none" stroke="#A9DCF5" stroke-width="3" opacity=".9"/>');
  s.behind('<ellipse cx="298" cy="186" rx="76" ry="40" fill="#fff" opacity=".6" transform="rotate(-28 298 186)"/>');

  const inside = [
    { x: 330, y: 302, rx: 54, ry: 61, g: 'gg' },
    { x: 456, y: 256, rx: 46, ry: 52, g: 'gp' },
    { x: 414, y: 378, rx: 48, ry: 54, g: 'gb' },
  ];
  for (const b of inside) {
    s.balloon(b);
    s.tieDown(b, b.x + rnd.jitter(16), b.y + b.ry + 94, rnd.jitter(16));
  }

  const outside = [
    { x: 146, y: 476, rx: 34, ry: 39, g: 'gps' },
    { x: 654, y: 462, rx: 34, ry: 39, g: 'gbs' },
  ];
  for (const b of outside) {
    s.balloon(b);
    s.tieDown(b, b.x + rnd.jitter(14), 556, rnd.jitter(16));
  }

  s.add(confetti(rnd, 7, 180, 150, 440, 300));
  s.add(confetti(rnd, 5, 40, 60, 720, 90));
  return s.doc({ w: W, h: H, slice: true });
}

/** 07 — table centrepiece (dominant pink). */
function galleryTable() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-07');
  const rnd = s.rnd;
  const pal = palette('gp');
  s.ground(400, 566, 300, 18, 0.06);

  s.behind(`<rect x="118" y="430" width="564" height="18" rx="9" fill="${s.fill('ggs')}"/>`);
  s.behind('<rect x="186" y="448" width="18" height="106" rx="6" fill="#D9A800" opacity=".4"/>');
  s.behind('<rect x="596" y="448" width="18" height="106" rx="6" fill="#D9A800" opacity=".4"/>');
  s.behind('<path d="M374 400 350 432 450 432 426 400z" fill="#87CEEB" opacity=".5"/>');

  const centre = [
    { x: 400, y: 250, rx: 48, ry: 55, g: pal[0] },
    { x: 342, y: 300, rx: 42, ry: 48, g: pal[1] },
    { x: 458, y: 298, rx: 42, ry: 48, g: pal[2] },
    { x: 368, y: 350, rx: 40, ry: 45, g: pal[3] },
    { x: 434, y: 350, rx: 40, ry: 45, g: pal[4] },
  ];
  for (const b of centre) {
    s.balloon(b);
    s.tieDown(b, 400 + (b.x - 400) * 0.2 + rnd.jitter(4), 404, rnd.jitter(10));
  }

  const onTable = [
    { x: 214, y: 386, rx: 46, ry: 52, g: 'gps' },
    { x: 588, y: 386, rx: 46, ry: 52, g: 'ggs' },
  ];
  for (const b of onTable) {
    s.balloon(b);
    s.tieDown(b, b.x + (b.x < 400 ? 26 : -26), 434, rnd.jitter(12));
  }
  return s.doc({ w: W, h: H, slice: true });
}

/** 08 — heart-shaped cluster (dominant blue). */
function galleryHeart() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-08');
  const rnd = s.rnd;
  const pal = palette('gb');
  s.ground(400, 566, 250, 18, 0.05);

  heartPoints(14, 400, 292, 13.4).forEach((p, i) => {
    const b = fit({ x: p.x, y: p.y, rx: 34, ry: 38, g: pal[i % pal.length] }, W, H, 16);
    s.balloon(b);
    if (p.y > 468) s.tieDown(b, b.x + rnd.jitter(12), b.y + b.ry + rnd.range(38, 66), rnd.jitter(10));
  });
  return s.doc({ w: W, h: H, slice: true });
}

/** 09 — rainbow row of seven balloons (dominant gold). */
function galleryRainbow() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-09');
  const rnd = s.rnd;
  s.ground(400, 556, 300, 18, 0.05);
  const row = ['gp', 'gps', 'gg', 'ggs', 'gw', 'gbs', 'gb'];

  row.forEach((g, i) => {
    const x = 120 + i * 93.3;
    const y = 300 - 36 * Math.cos(((i / 6) - 0.5) * Math.PI);
    const b = { x, y, rx: 50, ry: 56, g };
    s.balloon(b);
    s.tieDown(b, x + rnd.jitter(16), 486, rnd.jitter(12));
  });

  const mini = [
    { x: 198, y: 470, rx: 30, ry: 34 },
    { x: 400, y: 500, rx: 32, ry: 36 },
    { x: 604, y: 470, rx: 30, ry: 34 },
  ];
  mini.forEach((b, i) => {
    const m = { ...b, g: row[i + 2] };
    s.balloon(m);
    s.tieDown(m, b.x + rnd.jitter(12), 566, rnd.jitter(10));
  });
  return s.doc({ w: W, h: H, slice: true });
}

/** 10 — tall column / tower (dominant pink). */
function galleryColumn() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-10');
  const rnd = s.rnd;
  const pal = palette('gp');
  s.ground(400, 566, 210, 18, 0.06);

  for (let i = 0; i < 7; i += 1) {
    const rx = 46 + i * 2.6;
    const b = {
      x: 400 + (i % 2 === 0 ? 15 : -15) + rnd.jitter(4),
      y: 144 + i * 58,
      rx,
      ry: rx * 1.12,
      g: pal[i % pal.length],
      tilt: (i % 2 === 0 ? 1 : -1) * rnd.range(3, 9),
    };
    s.balloon(b);
  }
  s.tie(400, 556, 400, 588, 4);
  s.knotDot(400, 590, 6, '#D9438C');

  const sides = [
    { x: 236, y: 468, rx: 40, ry: 45, g: 'gbs' },
    { x: 566, y: 468, rx: 40, ry: 45, g: 'ggs' },
  ];
  for (const b of sides) {
    s.balloon(b);
    s.tieDown(b, b.x + (b.x < 400 ? -18 : 18), 562, rnd.jitter(14));
  }
  return s.doc({ w: W, h: H, slice: true });
}

/** 11 — garland swag with hanging balloons (dominant blue). */
function galleryGarland() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-11');
  const rnd = s.rnd;
  const pal = palette('gb');
  s.ground(400, 568, 290, 16, 0.05);
  s.behind(`<path d="M28 84Q400 272 772 84" fill="none" stroke="${STRING}" stroke-width="1.5" opacity=".7"/>`);

  swagPoints(11, 28, 84, 400, 272, 772, 84).forEach((p, i) => {
    const k = 0.82 + 0.22 * Math.sin(Math.PI * p.t);
    const b = fit({ x: p.x, y: p.y, rx: 50 * k + rnd.jitter(2), ry: 56 * k + rnd.jitter(2), g: pal[i % pal.length] }, W, H, 14);
    s.balloon(b);
  });

  const hanging = [
    { x: 172, y: 372, rx: 34, ry: 38, g: 'gps' },
    { x: 330, y: 430, rx: 36, ry: 40, g: 'ggs' },
    { x: 470, y: 430, rx: 36, ry: 40, g: 'gps' },
    { x: 630, y: 372, rx: 34, ry: 38, g: 'ggs' },
  ];
  for (const b of hanging) {
    s.balloon({ ...b, knot: 'top' });
    s.tieUp(b, 160 + rnd.range(-40, 40), rnd.jitter(10));
  }
  return s.doc({ w: W, h: H, slice: true });
}

/** 12 — photo-zone backdrop panel framed with balloons (dominant gold). */
function galleryPhotoZone() {
  const W = 800;
  const H = 600;
  const s = makeSketch('gallery-12');
  const rnd = s.rnd;
  const pal = palette('gg');
  s.ground(400, 548, 300, 20, 0.06);

  s.behind(`<rect x="236" y="150" width="328" height="352" rx="18" fill="${s.fill('panel')}" stroke="#FFE7B8" stroke-width="3"/>`);
  s.behind('<rect x="250" y="164" width="300" height="324" rx="12" fill="none" stroke="#FFF3BE" stroke-width="2"/>');
  s.behind('<path d="M250 196v-22a10 10 0 0 1 10-10h22" fill="none" stroke="#FFD700" stroke-width="4" opacity=".85"/>');
  s.behind('<path d="M550 196v-22a10 10 0 0 0-10-10h-22" fill="none" stroke="#FFD700" stroke-width="4" opacity=".85"/>');

  const frame = [
    { x: 204, y: 232, rx: 44, ry: 50 },
    { x: 194, y: 332, rx: 46, ry: 52 },
    { x: 208, y: 430, rx: 42, ry: 48 },
    { x: 596, y: 232, rx: 44, ry: 50 },
    { x: 606, y: 332, rx: 46, ry: 52 },
    { x: 592, y: 430, rx: 42, ry: 48 },
    { x: 300, y: 158, rx: 40, ry: 45 },
    { x: 400, y: 126, rx: 46, ry: 52 },
    { x: 500, y: 158, rx: 40, ry: 45 },
    { x: 138, y: 170, rx: 36, ry: 41 },
    { x: 662, y: 170, rx: 36, ry: 41 },
  ];
  frame.forEach((b, i) => {
    const m = fit({ ...b, g: pal[i % pal.length] }, W, H, 14);
    s.balloon(m);
  });

  s.add(confetti(rnd, 8, 60, 60, 680, 460));
  return s.doc({ w: W, h: H, slice: true });
}

/* ------------------------------------------------------------------ *
 * writer
 * ------------------------------------------------------------------ */

const JOBS = [
  ['public/images/hero.svg', heroSvg],
  ['public/images/logo.svg', logoSvg],
  ['src/app/icon.svg', logoSvg],
  ['public/images/packages/start.svg', startSvg],
  ['public/images/packages/standard.svg', standardSvg],
  ['public/images/packages/premium.svg', premiumSvg],
  ['public/images/gallery/gallery-01.svg', galleryCluster],
  ['public/images/gallery/gallery-02.svg', galleryArch],
  ['public/images/gallery/gallery-03.svg', galleryWall],
  ['public/images/gallery/gallery-04.svg', galleryCeiling],
  ['public/images/gallery/gallery-05.svg', galleryBox],
  ['public/images/gallery/gallery-06.svg', galleryBubble],
  ['public/images/gallery/gallery-07.svg', galleryTable],
  ['public/images/gallery/gallery-08.svg', galleryHeart],
  ['public/images/gallery/gallery-09.svg', galleryRainbow],
  ['public/images/gallery/gallery-10.svg', galleryColumn],
  ['public/images/gallery/gallery-11.svg', galleryGarland],
  ['public/images/gallery/gallery-12.svg', galleryPhotoZone],
];

async function main() {
  const built = JOBS.map(([relative, build]) => [relative, build()]);

  const problems = [];
  for (const [relative, svg] of built) {
    if (/<text[\s>]/.test(svg)) problems.push(`${relative}: contains a <text> element`);
    if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) problems.push(`${relative}: missing xmlns`);
    const bytes = Buffer.byteLength(svg, 'utf8');
    if (bytes > SIZE_LIMIT) problems.push(`${relative}: ${bytes} bytes > ${SIZE_LIMIT}`);
  }
  for (const path of ['public/images/gallery', 'public/images/packages']) {
    if (!built.some(([relative]) => relative.startsWith(path))) problems.push(`no files generated for ${path}`);
  }
  if (problems.length) throw new Error(`\n  - ${problems.join('\n  - ')}`);

  let total = 0;
  for (const [relative, svg] of built) {
    const absolute = join(ROOT, relative);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, svg, 'utf8');
    const bytes = Buffer.byteLength(svg, 'utf8');
    total += bytes;
    console.log(`${relative.padEnd(40)} ${String(bytes).padStart(6)} B`);
  }
  console.log(`\n${built.length} SVG files written - ${total} bytes total, largest budget ${SIZE_LIMIT} B.`);
}

main().catch((error) => {
  console.error(`generate-images failed: ${error.message}`);
  process.exitCode = 1;
});
