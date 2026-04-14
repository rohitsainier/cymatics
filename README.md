# Cymatics Visualizer

Real-time cymatics simulator that transforms sound into sacred geometry. Watch 5,000 particles arrange themselves into Chladni patterns — the same geometric figures that form when sand is placed on a vibrating plate.

## Features

### Three Audio Input Modes

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
│   ├── layout.js          # Root layout
│   ├── page.js            # Renders CymaticsApp
│   └── globals.css        # Tailwind + custom slider/scrollbar styles
├── components/
│   ├── CymaticsApp.jsx    # Top-level orchestrator
│   ├── CymaticsCanvas.jsx # Particle simulation + canvas rendering
│   ├── ToneGenerator.jsx  # Oscillator + presets
│   ├── MicrophoneInput.jsx# Live mic capture + pitch display
│   ├── FilePlayer.jsx     # Audio file upload + playback
│   └── ModeSelector.jsx   # Tab bar for input modes
└── lib/
    ├── chladni.js         # Chladni math functions + presets
    └── audioAnalysis.js   # FFT analysis + pitch detection
```

## The Math

Chladni patterns on a square plate are described by:

```
f(x, y) = cos(nπx/L) · cos(mπy/L) ± cos(mπx/L) · cos(nπy/L)
```

Particles are pushed toward the nodal lines where `f(x, y) = 0` — the same locations where physical sand accumulates on a vibrating Chladni plate. The gradient of this function determines the force direction, and the value determines the force magnitude.

## Deploy

```bash
npm run build
```

Deploys to any platform supporting Next.js (Vercel, Netlify, etc.).

## License

MIT

---

Built with Saini Labs
