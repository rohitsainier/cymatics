# Cymatics Visualizer

Real-time cymatics simulator that transforms sound into sacred geometry. Watch particles arrange into Chladni patterns, Bessel patterns on circular plates, or view a lit 3D water surface — all driven by your sound. Zero external visualization dependencies.

## Features

### Four Audio Input Modes

**Tone Generator**
- Oscillator with sine, square, triangle, and sawtooth waveforms
- Frequency slider (20–4000 Hz)
- 10 Solfeggio/healing frequency presets (174–963 Hz)
- Vibration mode controls (N, M) up to 15
- Binaural beats: dual-oscillator stereo panning with 5 brainwave presets (Delta, Theta, Alpha, Beta, Gamma)

**Microphone**
- Live audio capture with YIN pitch detection and median smoothing
- Confidence indicator + bass/mid/high band visualization
- Sing, hum, or play an instrument — the pattern follows the dominant pitch

**Audio File**
- Drag-and-drop or click-to-upload (MP3, WAV, OGG, FLAC)
- Full playback controls (play/pause, seek, skip)
- Real-time FFT analysis drives pattern visualization

**Sample Library**
- 8 sacred sounds (Om, Crystal Bowl, Tibetan Bowl, Solfeggio tones)
- Each sample includes a reference Chladni pattern image for verification

### Two Plate Shapes

- **Square plate** — classic Chladni patterns with crossing nodal lines
- **Circular plate** — Bessel function patterns with concentric rings and angular nodes

### Two Render Modes

- **Particles** — 5,000 particles simulating sand migrating to nodal lines (Canvas 2D, 60fps)
- **Water** — 3D height-field surface with Blinn-Phong lighting, Fresnel darkening, ambient occlusion, caustic glow on nodal lines, and bilinear-interpolated 250x250 grid (Canvas 2D)

### Multi-frequency Layering

Stack 2-3 frequencies simultaneously. Their fields superpose, creating interference patterns far more complex than any single frequency. Includes 4 presets: Harmony, Tension, Full Spectrum, Heart+Crown.

### Export

- **PNG** — instant screenshot download
- **Video** — WebM recording via MediaRecorder (start/stop, shows elapsed time)

### Binaural Beats

Two oscillators panned left/right create a perceived beat frequency in the brain. 5 brainwave presets:
- Delta (2 Hz) — Deep Sleep
- Theta (6 Hz) — Meditation
- Alpha (10 Hz) — Relaxation
- Beta (20 Hz) — Focus
- Gamma (35 Hz) — Awareness

### Guided Sessions

5 preset meditation journeys with circular countdown timer:
- Solfeggio Journey (30 min) — all 10 healing frequencies
- Deep Meditation (20 min) — 432 Hz
- Focus Flow (25 min) — 528 Hz Pomodoro
- Quick Calm (10 min) — 528 Hz then 432 Hz
- Sleep Preparation (15 min) — descending frequencies

Auto-crossfade between steps, synthesized bell on completion.

### Pattern Zoom / Tiling

Repeat slider (0.5x–5x) tiles the pattern. Mouse wheel + pinch-to-zoom supported.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Next.js 15** — App Router
- **Tailwind CSS v4** — styling
- **Web Audio API** — tone generation, binaural beats, mic capture, FFT
- **Canvas 2D** — particle rendering + water height-field rendering

Zero external audio or visualization libraries. Bessel functions use Abramowitz & Stegun polynomial approximation. Water surface uses per-pixel Blinn-Phong lighting with Fresnel and caustics.

## Project Structure

```
cymatics-visualizer/
├── app/
│   ├── layout.js              # Root layout
│   ├── page.js                # Renders CymaticsApp
│   └── globals.css            # Tailwind + custom styles
├── components/
│   ├── CymaticsApp.jsx        # Orchestrator (3-column layout, all state)
│   ├── CymaticsCanvas.jsx     # Particle renderer (square + circular plates)
│   ├── WaterCanvas.jsx        # Water surface (height-field + Blinn-Phong)
│   ├── ToneGenerator.jsx      # Oscillator + binaural beats
│   ├── MicrophoneInput.jsx    # YIN pitch detection + smoothing
│   ├── FilePlayer.jsx         # Audio file upload + playback
│   ├── SampleLibrary.jsx      # Sacred sounds + reference images
│   ├── FrequencyLayers.jsx    # Multi-frequency layer UI
│   ├── SessionTimer.jsx       # Guided session countdown
│   └── ModeSelector.jsx       # Sidebar icons + mobile tabs
├── lib/
│   ├── chladni.js             # Chladni + Bessel math, multi-freq, presets
│   ├── audioAnalysis.js       # YIN pitch detection + FFT
│   ├── binauralAudio.js       # Dual-oscillator stereo graph
│   ├── exportUtils.js         # PNG + WebM recording
│   └── sessionPresets.js      # Guided session journeys
└── public/
    └── samples/               # Reference pattern PNGs
```

## The Math

**Square plate (Chladni):**
```
f(x, y) = cos(nπsx/L) · cos(mπsy/L) ± cos(mπsx/L) · cos(nπsy/L)
```

**Circular plate (Bessel):**
```
f(r, θ) = J_n(k_nm · r/R) · cos(nθ)
```
where `J_n` is the Bessel function of the first kind, `k_nm` is the mth zero of `J_n`.

**Multi-frequency superposition:**
```
F(x, y) = Σ w_i · f_i(x, y)
```

Particles are pushed toward nodal lines where `F = 0`. The water renderer maps the field to a 250x250 height map with bilinear interpolation, per-pixel Blinn-Phong specular, Fresnel edge darkening, and caustic glow on nodal lines.

## Deploy

```bash
npm run build
```

Deploys to any platform supporting Next.js (Vercel, Netlify, etc.).

## License

MIT

---

Built with Saini Labs
