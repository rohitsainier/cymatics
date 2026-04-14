/**
 * Binaural beat audio graph — two oscillators at slightly different frequencies
 * panned to opposite ears. The brain perceives the difference as a "beat".
 *
 * Graph:
 *   Osc1 (baseFreq)      → PanL (-1) → MasterGain → Analyser → Destination
 *   Osc2 (baseFreq+beat)  → PanR (+1) → MasterGain
 */

export function createBinauralGraph(audioCtx, baseFreq, beatFreq, volume, waveType = "sine") {
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const panL = audioCtx.createStereoPanner();
  const panR = audioCtx.createStereoPanner();
  const gain = audioCtx.createGain();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  osc1.type = waveType;
  osc2.type = waveType;
  osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
  osc2.frequency.setValueAtTime(baseFreq + beatFreq, audioCtx.currentTime);

  panL.pan.setValueAtTime(-1, audioCtx.currentTime);
  panR.pan.setValueAtTime(1, audioCtx.currentTime);

  gain.gain.setValueAtTime(volume, audioCtx.currentTime);

  // Wire: osc1 → left pan → gain, osc2 → right pan → gain
  osc1.connect(panL);
  osc2.connect(panR);
  panL.connect(gain);
  panR.connect(gain);
  gain.connect(analyser);
  analyser.connect(audioCtx.destination);

  osc1.start();
  osc2.start();

  return { osc1, osc2, panL, panR, gain, analyser };
}

export const BINAURAL_PRESETS = [
  { label: "Delta", desc: "Deep Sleep", beatFreq: 2, range: "1-4 Hz" },
  { label: "Theta", desc: "Meditation", beatFreq: 6, range: "4-8 Hz" },
  { label: "Alpha", desc: "Relaxation", beatFreq: 10, range: "8-13 Hz" },
  { label: "Beta", desc: "Focus", beatFreq: 20, range: "13-30 Hz" },
  { label: "Gamma", desc: "Awareness", beatFreq: 35, range: "30-40 Hz" },
];
