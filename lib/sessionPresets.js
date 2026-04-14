export const SESSION_PRESETS = [
  {
    id: "solfeggio",
    name: "Solfeggio Journey",
    desc: "Ascend through all 10 healing frequencies",
    steps: [
      { freq: 174, n: 2, m: 1, duration: 180, label: "174 Hz · Pain Relief" },
      { freq: 285, n: 3, m: 1, duration: 180, label: "285 Hz · Tissue Heal" },
      { freq: 396, n: 3, m: 2, duration: 180, label: "396 Hz · Release Fear" },
      { freq: 417, n: 4, m: 1, duration: 180, label: "417 Hz · Clear Trauma" },
      { freq: 432, n: 4, m: 3, duration: 180, label: "432 Hz · Natural Calm" },
      { freq: 528, n: 5, m: 2, duration: 180, label: "528 Hz · DNA Repair" },
      { freq: 639, n: 5, m: 3, duration: 180, label: "639 Hz · Heart Heal" },
      { freq: 741, n: 6, m: 2, duration: 180, label: "741 Hz · Detox" },
      { freq: 852, n: 7, m: 3, duration: 180, label: "852 Hz · Intuition" },
      { freq: 963, n: 7, m: 4, duration: 180, label: "963 Hz · Crown" },
    ],
  },
  {
    id: "deep-meditation",
    name: "Deep Meditation",
    desc: "432 Hz for 20 minutes of deep calm",
    steps: [
      { freq: 432, n: 4, m: 3, duration: 1200, label: "432 Hz · Deep Calm" },
    ],
  },
  {
    id: "focus-flow",
    name: "Focus Flow",
    desc: "528 Hz for a 25-minute Pomodoro session",
    steps: [
      { freq: 528, n: 5, m: 2, duration: 1500, label: "528 Hz · Focus" },
    ],
  },
  {
    id: "quick-calm",
    name: "Quick Calm",
    desc: "10-minute wind-down: DNA Repair → Natural Calm",
    steps: [
      { freq: 528, n: 5, m: 2, duration: 300, label: "528 Hz · DNA Repair" },
      { freq: 432, n: 4, m: 3, duration: 300, label: "432 Hz · Natural Calm" },
    ],
  },
  {
    id: "sleep-prep",
    name: "Sleep Preparation",
    desc: "15-minute descent to deep relaxation",
    steps: [
      { freq: 528, n: 5, m: 2, duration: 300, label: "528 Hz · Calm Mind" },
      { freq: 396, n: 3, m: 2, duration: 300, label: "396 Hz · Release" },
      { freq: 174, n: 2, m: 1, duration: 300, label: "174 Hz · Deep Rest" },
    ],
  },
];

export function getTotalDuration(preset) {
  return preset.steps.reduce((sum, s) => sum + s.duration, 0);
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
