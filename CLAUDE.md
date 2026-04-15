@AGENTS.md

# Cymatics Visualizer

## Project Overview
Real-time cymatics simulator built with Next.js 15 (App Router) + Tailwind CSS v4 + Web Audio API.
Generates Chladni/Bessel plate patterns driven by sound — particles or 3D water surface visualization.
Zero external visualization dependencies — pure Canvas 2D + Web Audio API.

## Architecture

### Audio Modes
Four input modes all feed into a shared renderer:
- **Tone Generator** — oscillator (sine/square/triangle/sawtooth) + binaural beats (dual-oscillator stereo panning, 5 brainwave presets)
- **Microphone** — live audio capture via `getUserMedia`, YIN pitch detection with median smoothing
- **Audio File** — drag-and-drop upload, `MediaElementSource` playback with FFT analysis
- **Sample Library** — 8 sacred sounds with multi-oscillator synthesis + reference pattern images

### Visualization Modes
- **Particles** — 5000 particles migrate to nodal lines (Canvas 2D, 60fps)
- **Water** — 3D height-field renderer with bilinear-interpolated height map (250x250 grid), Blinn-Phong specular, Fresnel darkening, ambient occlusion, caustic glow on nodal lines, per-pixel rendering via `putImageData` (no DPR scaling — CSS handles upscale)

### Plate Shapes
- **Square** — Chladni patterns: `cos(nπx/L)·cos(mπy/L) ± cos(mπx/L)·cos(nπy/L)`
- **Circular** — Bessel patterns: `J_n(k_nm·r/R)·cos(nθ)` with precomputed zeros table (Abramowitz & Stegun rational polynomial approximation)

### Multi-frequency Layering
Stack 2-3 frequencies — their Chladni/Bessel fields superpose: `Σ weight_i · field_i(x,y)`.
Creates complex interference patterns. 4 presets (Harmony, Tension, Full Spectrum, Heart+Crown).

### Export
- **PNG** — `canvas.toDataURL()` instant download
- **Video** — `MediaRecorder` + `captureStream()` for WebM recording

### Guided Sessions
5 preset meditation journeys with circular SVG countdown, auto-crossfade between frequencies, synthesized bell on completion.

### Key Directories
- `lib/` — pure math and audio utilities (no React)
  - `chladni.js` — Chladni value/gradient, Bessel J0/J1/Jn + zeros table, `besselValue/Gradient`, `multiValue/Gradient`, `frequencyToModes`, presets, layer presets
  - `audioAnalysis.js` — YIN-inspired pitch detection, amplitude, frequency bands
  - `binauralAudio.js` — dual-oscillator stereo panning factory + brainwave presets
  - `exportUtils.js` — PNG download + MediaRecorder WebM recording
  - `sessionPresets.js` — guided session step arrays + formatTime utility
- `components/` — React components
  - `CymaticsCanvas.jsx` — particle renderer with square/circular plate, multi-freq support, forwardRef, auto-kick on pattern change
  - `WaterCanvas.jsx` — Canvas 2D height-field water renderer (Blinn-Phong + Fresnel + caustics + AO), no DPR scaling
  - `ToneGenerator.jsx` — oscillator + binaural beats + forwardRef for session timer control
  - `MicrophoneInput.jsx` — YIN pitch detection + confidence bar + frequency smoothing
  - `FilePlayer.jsx` — audio file upload/drop + playback + frequency analysis (key-based remount for MediaElementSource reuse fix)
  - `SampleLibrary.jsx` — 8 sacred sounds with reference pattern images
  - `FrequencyLayers.jsx` — multi-frequency layer UI (add/remove, weight sliders, presets)
  - `SessionTimer.jsx` — guided session with circular countdown, step indicators, bell
  - `ModeSelector.jsx` — vertical icon sidebar (desktop) + horizontal tabs (mobile)
  - `CymaticsApp.jsx` — top-level orchestrator, 3-column layout, all state management
- `app/` — Next.js App Router shell
- `public/samples/` — reference Chladni pattern PNGs

### Data Flow
```
AudioSource (Tone|Mic|File|Samples)
  → AnalyserNode
  → CymaticsApp (frequency, n, m, zoom, plateShape, layers, renderMode)
  → CymaticsCanvas (particles) OR WaterCanvas (water surface)
```

### Layout
Desktop: 3-column (icon sidebar 48px | controls panel 340px collapsible | canvas fills rest).
Mobile: stacked vertical.

## Commands
- `npm run dev` — start dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint

## Conventions
- All components are client components (`"use client"`)
- Inline styles for dynamic color theming (hue shifts with frequency)
- Tailwind for layout and static styles
- Zero external visualization libraries — pure Canvas 2D rendering
- Bessel function uses Abramowitz & Stegun rational polynomial approximation
- Water renderer uses `putImageData` at 500x500 without DPR scaling (CSS handles upscale)
- `canRecord()` checked client-side only (`useEffect`) to avoid hydration mismatch
- FilePlayer uses `fileKey` state to force new `<audio>` DOM element on file change (prevents `createMediaElementSource` reuse error)
