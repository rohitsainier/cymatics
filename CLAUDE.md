@AGENTS.md

# Cymatics Visualizer

## Project Overview
Real-time cymatics simulator built with Next.js 15 (App Router) + Tailwind CSS v4 + Web Audio API.
Generates Chladni plate patterns driven by sound — particles migrate to nodal lines like sand on a vibrating plate.

## Architecture

### Audio Modes
Four input modes all feed into a shared cymatics renderer:
- **Tone Generator** — built-in oscillator (sine/square/triangle/sawtooth) with healing frequency presets
- **Microphone** — live audio capture via `getUserMedia`, autocorrelation pitch detection
- **Audio File** — drag-and-drop upload, `MediaElementSource` playback with FFT analysis
- **Sample Library** — 8 sacred/famous sounds (Om, Crystal Bowl, Tibetan Bowl, Solfeggio tones) synthesized with harmonics, each paired with a reference Chladni pattern image for visual verification

### Pattern Zoom / Tiling
The Chladni function accepts a `scale` parameter that tiles the pattern within the canvas:
- scale=1 → single pattern, scale=3 → 3x3 tiling (9 copies)
- Controlled via slider (0.5x–5x), +/- buttons, mouse wheel, or pinch-to-zoom
- Math: coordinates are multiplied by scale before being fed to the Chladni function; since it's periodic, this naturally creates seamless tiling

### Key Directories
- `lib/` — pure math and audio utilities (no React)
  - `chladni.js` — Chladni value/gradient functions with scale param, frequency-to-mode mapping, preset data
  - `audioAnalysis.js` — dominant frequency extraction (autocorrelation + FFT fallback), amplitude, frequency bands
- `components/` — React components
  - `CymaticsCanvas.jsx` — 5000-particle simulation on HTML5 Canvas at 60fps, wheel/pinch zoom
  - `ToneGenerator.jsx` — oscillator + frequency slider + presets + mode buttons
  - `MicrophoneInput.jsx` — mic permission handling + real-time pitch display
  - `FilePlayer.jsx` — audio file upload/drop + playback controls + frequency analysis
  - `SampleLibrary.jsx` — 8 sacred sounds with multi-oscillator synthesis + reference pattern images
  - `ModeSelector.jsx` — tab bar switching between 4 input modes
  - `CymaticsApp.jsx` — top-level orchestrator, manages shared state (frequency, n/m, zoom, analyser)
- `app/` — Next.js App Router shell
- `public/samples/` — reference Chladni pattern PNGs for each sample sound (generated via mathviz)

### Data Flow
`AudioSource (Tone|Mic|File|Samples)` -> `AnalyserNode` -> `CymaticsCanvas`
Each mode provides frequency + n/m modes + analyser ref up to `CymaticsApp`, which passes them + zoom down to the canvas.

## Commands
- `npm run dev` — start dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint

## Conventions
- All components are client components (`"use client"`)
- Inline styles used for dynamic color theming (hue shifts with frequency)
- Tailwind used for layout and static styles
- No external audio/visualization libraries — pure Web Audio API + Canvas 2D
