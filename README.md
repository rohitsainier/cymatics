# Cymatics Visualizer

Real-time cymatics simulator that transforms sound into sacred geometry. Watch 5,000 particles arrange themselves into Chladni patterns — the same geometric figures that form when sand is placed on a vibrating plate.

## Features

### Four Audio Input Modes

**Tone Generator**
- Pure oscillator with sine, square, triangle, and sawtooth waveforms
- Frequency slider (100–1000 Hz) with real-time pattern morphing
- 10 Solfeggio/healing frequency presets (174–963 Hz)
- Manual vibration mode controls (N, M) for fine pattern tuning

**Microphone**
- Live audio capture with real-time pitch detection
- Bass/mid/high frequency band visualization
- Sing, hum, or play an instrument — the pattern follows the dominant pitch

**Audio File**
- Drag-and-drop or click-to-upload (MP3, WAV, OGG, FLAC)
- Full playback controls (play/pause, seek, skip)
- Real-time FFT analysis drives pattern visualization as your music plays

**Sample Library**
- 8 sacred/famous sounds synthesized with rich harmonics:
  - Om (AUM) — 136.1 Hz
  - Crystal Bowl C — 256 Hz
  - Tibetan Singing Bowl — 333 Hz
  - 432 Hz Natural A (Verdi tuning)
  - 528 Hz Miracle Tone
  - 639 Hz Heart Frequency
  - 741 Hz Throat Frequency
  - 963 Hz Crown Frequency
- Each sample includes a **reference Chladni pattern image** for visual verification
- Tap any sample to hear the sound and watch particles form the expected pattern

### Pattern Zoom / Tiling
- **Repeat slider** (0.5x–5x) tiles the pattern across the canvas
- At 1x you see a single pattern; at 3x you get a 3x3 tiling with 9 copies creating intricate sacred geometry
- **Mouse wheel** zoom directly on the canvas
- **Pinch-to-zoom** on touch devices
- **+/- buttons** for precise control

### Visualization
- 5,000 particles simulating Chladni plate physics
- Particles drift toward nodal lines (zero-displacement zones)
- Frequency-dependent color shifting and glow effects
- 60fps Canvas 2D rendering

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Next.js 15** — App Router
- **Tailwind CSS v4** — styling
- **Web Audio API** — tone generation, microphone capture, FFT analysis
- **Canvas 2D** — particle rendering

No external audio or visualization libraries are used.

## Project Structure

```
cymatics-visualizer/
├── app/
│   ├── layout.js           # Root layout
│   ├── page.js             # Renders CymaticsApp
│   └── globals.css         # Tailwind + custom styles
├── components/
│   ├── CymaticsApp.jsx     # Top-level orchestrator
│   ├── CymaticsCanvas.jsx  # Particle simulation + canvas + zoom
│   ├── ToneGenerator.jsx   # Oscillator + presets
│   ├── MicrophoneInput.jsx # Live mic capture + pitch display
│   ├── FilePlayer.jsx      # Audio file upload + playback
│   ├── SampleLibrary.jsx   # Sacred sounds + reference images
│   └── ModeSelector.jsx    # Tab bar for 4 input modes
├── lib/
│   ├── chladni.js          # Chladni math (with scale/zoom)
│   └── audioAnalysis.js    # FFT analysis + pitch detection
└── public/
    └── samples/            # Reference pattern PNGs
```

## The Math

Chladni patterns on a square plate are described by:

```
f(x, y) = cos(nπsx/L) · cos(mπsy/L) ± cos(mπsx/L) · cos(nπsy/L)
```

where `s` is the zoom/scale factor. Particles are pushed toward the nodal lines where `f(x, y) = 0`. The gradient determines force direction, the value determines magnitude. Increasing `s` tiles the pattern — since the function is periodic, this creates seamless repetition.

## Deploy

```bash
npm run build
```

Deploys to any platform supporting Next.js (Vercel, Netlify, etc.).

## License

MIT

---

Built with Saini Labs
