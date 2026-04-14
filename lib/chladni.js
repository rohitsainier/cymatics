const PLATE_SIZE = 500;
const HALF = PLATE_SIZE / 2;

export { PLATE_SIZE };

// ══════════════════════════════════════════════
// SQUARE PLATE — Chladni patterns
// ══════════════════════════════════════════════

export function chladniValue(x, y, n, m, sign = 1, scale = 1) {
  const sx = x * scale;
  const sy = y * scale;
  const nx = (n * Math.PI * sx) / PLATE_SIZE;
  const ny = (n * Math.PI * sy) / PLATE_SIZE;
  const mx = (m * Math.PI * sx) / PLATE_SIZE;
  const my = (m * Math.PI * sy) / PLATE_SIZE;
  return Math.cos(nx) * Math.cos(my) + sign * Math.cos(mx) * Math.cos(ny);
}

export function chladniGradient(x, y, n, m, sign = 1, scale = 1) {
  const sx = x * scale;
  const sy = y * scale;
  const nx = (n * Math.PI * sx) / PLATE_SIZE;
  const ny = (n * Math.PI * sy) / PLATE_SIZE;
  const mx = (m * Math.PI * sx) / PLATE_SIZE;
  const my = (m * Math.PI * sy) / PLATE_SIZE;
  const np = (n * Math.PI * scale) / PLATE_SIZE;
  const mp = (m * Math.PI * scale) / PLATE_SIZE;
  const dx =
    -np * Math.sin(nx) * Math.cos(my) -
    sign * mp * Math.sin(mx) * Math.cos(ny);
  const dy =
    -mp * Math.cos(nx) * Math.sin(my) -
    sign * np * Math.cos(mx) * Math.sin(ny);
  return [dx, dy];
}

// ══════════════════════════════════════════════
// CIRCULAR PLATE — Bessel function patterns
// ══════════════════════════════════════════════

// Bessel function J_n(x) — rational polynomial approximation (Abramowitz & Stegun)
function besselJ0(x) {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    return (57568490574.0 + y * (-13362590354.0 + y * (651619640.7 +
      y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))))) /
      (57568490411.0 + y * (1029532985.0 + y * (9494680.718 +
      y * (59272.64853 + y * (267.8532712 + y * 1.0)))));
  }
  const z = 8.0 / ax;
  const y = z * z;
  const xx = ax - 0.785398164;
  const p = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 +
    y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
  const q = -0.1562499995e-1 + y * (0.1430488765e-3 +
    y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
  return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p - z * Math.sin(xx) * q);
}

function besselJ1(x) {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const r = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 +
      y * (-2972611.439 + y * (15704.48260 + y * (-30.16036606)))))) /
      (144725228442.0 + y * (2300535178.0 + y * (18583304.74 +
      y * (99447.43394 + y * (376.9991397 + y * 1.0)))));
    return r;
  }
  const z = 8.0 / ax;
  const y = z * z;
  const xx = ax - 2.356194491;
  const p = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 +
    y * (0.2457520174e-5 + y * (-0.240337019e-6))));
  const q = 0.04687499995 + y * (-0.2002690873e-3 +
    y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * p - z * Math.sin(xx) * q);
  return x < 0 ? -ans : ans;
}

// J_n via upward recurrence from J0, J1
function besselJn(n, x) {
  if (n === 0) return besselJ0(x);
  if (n === 1) return besselJ1(x);
  if (x === 0) return 0;

  const ax = Math.abs(x);
  if (ax > n) {
    // Forward recurrence
    let jPrev = besselJ0(ax);
    let jCurr = besselJ1(ax);
    for (let k = 1; k < n; k++) {
      const jNext = (2 * k / ax) * jCurr - jPrev;
      jPrev = jCurr;
      jCurr = jNext;
    }
    return n % 2 !== 0 && x < 0 ? -jCurr : jCurr;
  }

  // Miller's backward recurrence for small x
  const IACC = 40;
  const BIGNO = 1e10;
  const BIGNI = 1e-10;
  let jsum = 0, ans = 0;
  let jp = 0, jm = 0;
  const m = 2 * Math.floor((n + Math.floor(Math.sqrt(IACC * n))) / 2);
  let jPrev = 0;
  let jCurr = 1;
  for (let k = m; k > 0; k--) {
    jm = (2 * k / ax) * jCurr - jPrev;
    jPrev = jCurr;
    jCurr = jm;
    if (Math.abs(jCurr) > BIGNO) {
      jCurr *= BIGNI;
      jPrev *= BIGNI;
      ans *= BIGNI;
      jsum *= BIGNI;
    }
    if (k % 2 !== 0) jsum += jCurr;
    if (k === n) ans = jPrev;
  }
  jsum = 2 * jsum - jCurr;
  ans /= jsum;
  return n % 2 !== 0 && x < 0 ? -ans : ans;
}

// Zeros of Bessel functions J_n — precomputed for n=0..8, first 8 zeros each
const BESSEL_ZEROS = [
  [2.4048, 5.5201, 8.6537, 11.7915, 14.9309, 18.0711, 21.2116, 24.3525], // J0
  [3.8317, 7.0156, 10.1735, 13.3237, 16.4706, 19.6159, 22.7601, 25.9037], // J1
  [5.1356, 8.4172, 11.6198, 14.7960, 17.9598, 21.1170, 24.2701, 27.4206], // J2
  [6.3802, 9.7610, 13.0152, 16.2235, 19.4094, 22.5828, 25.7482, 28.9084], // J3
  [7.5883, 11.0647, 14.3725, 17.6160, 20.8269, 24.0190, 27.1991, 30.3710], // J4
  [8.7715, 12.3386, 15.7002, 18.9801, 22.2178, 25.4303, 28.6266, 31.8117], // J5
  [9.9361, 13.5893, 17.0038, 20.3208, 23.5861, 26.8202, 30.0337, 33.2330], // J6
  [11.0864, 14.8213, 18.2876, 21.6415, 24.9349, 28.1912, 31.4228, 34.6371], // J7
  [12.2251, 16.0378, 19.5545, 22.9452, 26.2668, 29.5457, 32.7958, 36.0256], // J8
];

function getBesselZero(n, m) {
  const ni = Math.min(n, BESSEL_ZEROS.length - 1);
  const mi = Math.min(m - 1, BESSEL_ZEROS[0].length - 1);
  return BESSEL_ZEROS[ni][Math.max(0, mi)];
}

// Circular plate: f(r,θ) = J_n(k_nm * r/R) * cos(n*θ)
export function besselValue(x, y, n, m, scale = 1) {
  const cx = (x - HALF) * scale;
  const cy = (y - HALF) * scale;
  const r = Math.sqrt(cx * cx + cy * cy);
  const theta = Math.atan2(cy, cx);
  const R = HALF;
  const knm = getBesselZero(n, m);
  return besselJn(n, knm * r / R) * Math.cos(n * theta);
}

// Numerical gradient for Bessel (analytical is complex, numerical is fine at this scale)
const EPSILON = 0.5;
export function besselGradient(x, y, n, m, scale = 1) {
  const dx = (besselValue(x + EPSILON, y, n, m, scale) - besselValue(x - EPSILON, y, n, m, scale)) / (2 * EPSILON);
  const dy = (besselValue(x, y + EPSILON, n, m, scale) - besselValue(x, y - EPSILON, n, m, scale)) / (2 * EPSILON);
  return [dx, dy];
}

// ══════════════════════════════════════════════
// MULTI-FREQUENCY LAYERING
// ══════════════════════════════════════════════

// layers: [{n, m, weight}]
export function multiValue(x, y, layers, plateShape, scale = 1) {
  let sum = 0;
  const fn = plateShape === "circular" ? besselValue : chladniValue;
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (plateShape === "circular") {
      sum += fn(x, y, l.n, l.m, scale) * (l.weight || 1);
    } else {
      sum += fn(x, y, l.n, l.m, 1, scale) * (l.weight || 1);
    }
  }
  return sum;
}

export function multiGradient(x, y, layers, plateShape, scale = 1) {
  let dx = 0, dy = 0;
  const fn = plateShape === "circular" ? besselGradient : chladniGradient;
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    const w = l.weight || 1;
    let gx, gy;
    if (plateShape === "circular") {
      [gx, gy] = fn(x, y, l.n, l.m, scale);
    } else {
      [gx, gy] = fn(x, y, l.n, l.m, 1, scale);
    }
    dx += gx * w;
    dy += gy * w;
  }
  return [dx, dy];
}

// ══════════════════════════════════════════════
// FREQUENCY MAPPING & PRESETS
// ══════════════════════════════════════════════

export function frequencyToModes(freq) {
  const logFreq = Math.log2(Math.max(40, freq) / 40);
  const logMax = Math.log2(6000 / 40);
  const t = logFreq / logMax;
  const n = Math.max(1, Math.round(1 + t * 14));
  const m = Math.max(1, Math.round(1 + t * 7));
  return n !== m ? { n, m } : { n, m: Math.max(1, m - 1) };
}

export const PRESETS = [
  { label: "174 Hz", desc: "Pain Relief", freq: 174, n: 2, m: 1 },
  { label: "285 Hz", desc: "Tissue Heal", freq: 285, n: 3, m: 1 },
  { label: "396 Hz", desc: "Release Fear", freq: 396, n: 3, m: 2 },
  { label: "417 Hz", desc: "Clear Trauma", freq: 417, n: 4, m: 1 },
  { label: "432 Hz", desc: "Natural Calm", freq: 432, n: 4, m: 3 },
  { label: "528 Hz", desc: "DNA Repair", freq: 528, n: 5, m: 2 },
  { label: "639 Hz", desc: "Heart Heal", freq: 639, n: 5, m: 3 },
  { label: "741 Hz", desc: "Detox", freq: 741, n: 6, m: 2 },
  { label: "852 Hz", desc: "Intuition", freq: 852, n: 7, m: 3 },
  { label: "963 Hz", desc: "Crown", freq: 963, n: 7, m: 4 },
];

export const LAYER_PRESETS = [
  { label: "Harmony", desc: "528 + 432 Hz", layers: [{ freq: 528, n: 5, m: 2, weight: 0.6 }, { freq: 432, n: 4, m: 3, weight: 0.4 }] },
  { label: "Tension", desc: "396 + 741 Hz", layers: [{ freq: 396, n: 3, m: 2, weight: 0.5 }, { freq: 741, n: 6, m: 2, weight: 0.5 }] },
  { label: "Full Spectrum", desc: "174 + 528 + 963", layers: [{ freq: 174, n: 2, m: 1, weight: 0.33 }, { freq: 528, n: 5, m: 2, weight: 0.34 }, { freq: 963, n: 7, m: 4, weight: 0.33 }] },
  { label: "Heart + Crown", desc: "639 + 963 Hz", layers: [{ freq: 639, n: 5, m: 3, weight: 0.5 }, { freq: 963, n: 7, m: 4, weight: 0.5 }] },
];
