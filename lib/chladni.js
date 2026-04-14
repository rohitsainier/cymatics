const PLATE_SIZE = 500;

export { PLATE_SIZE };

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

export function frequencyToModes(freq) {
  const ratio = freq / 100;
  const n = Math.max(1, Math.round(ratio * 0.8));
  const m = Math.max(1, Math.round(ratio * 0.3));
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
