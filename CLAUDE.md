@AGENTS.md

# Cymatics Visualizer

## Project Overview
Real-time cymatics simulator built with Next.js 15 (App Router) + Tailwind CSS v4 + Web Audio API.
Generates Chladni plate patterns driven by sound — particles migrate to nodal lines like sand on a vibrating plate.

## Architecture

### Audio Modes
Three input modes all feed into a shared cymatics renderer:
- **Tone Generator** — built-in oscillator (sine/square/triangle/sawtooth) with healing frequency presets
- **Microphone** — live audio capture via `getUserMedia`, autocorrelation pitch detection
- **Audio File** — drag-and-drop upload, `MediaElementSource` playback with FFT analysis

### Key Directories
- `lib/` — pure math and audio utilities (no React)
  - `chladni.js` — Chladni value/gradient functions, frequency-to-mode mapping, preset data
  - `audioAnalysis.js` — dominant frequency extraction (autocorrelation + FFT fallback), amplitude, frequency bands
- `components/` — React components
  - `CymaticsCanvas.jsx` — 5000-particle simulation on HTML5 Canvas at 60fps
  - `ToneGenerator.jsx` — oscillator + frequency slider + presets + mode buttons
  - `MicrophoneInput.jsx` — mic permission handling + real-time pitch display
  - `FilePlayer.jsx` — audio file upload/drop + playback controls + frequency analysis
  - `ModeSelector.jsx` — tab bar switching between input modes
  - `CymaticsApp.jsx` — top-level orchestrator, manages shared state
- `app/` — Next.js App Router shell

### Data Flow
`AudioSource (Tone|Mic|File)` -> `AnalyserNode` -> `CymaticsCanvas`
Each mode provides frequency + n/m modes + analyser ref up to `CymaticsApp`, which passes them down to the canvas.

## Commands
- `npm run dev` — start dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint

## Conventions
- All components are client components (`"use client"`)
- Inline styles used for dynamic color theming (hue shifts with frequency)
- Tailwind used for layout and static styles
- No external audio/visualization libraries — pure Web Audio API + Canvas 2D
