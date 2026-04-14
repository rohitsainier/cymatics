"use client";
import { useState, useCallback, useRef } from "react";
import CymaticsCanvas from "./CymaticsCanvas";
import ToneGenerator from "./ToneGenerator";
import MicrophoneInput from "./MicrophoneInput";
import FilePlayer from "./FilePlayer";
import SampleLibrary from "./SampleLibrary";
import ModeSelector from "./ModeSelector";
import { PLATE_SIZE } from "@/lib/chladni";

export default function CymaticsApp() {
  const [mode, setMode] = useState("tone");
  const [frequency, setFrequency] = useState(528);
  const [n, setN] = useState(5);
  const [m, setM] = useState(2);
  const [isActive, setIsActive] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef(null);

  const handleFreqChange = useCallback((f) => setFrequency(f), []);
  const handleModesChange = useCallback((newN, newM) => { setN(newN); setM(newM); }, []);
  const handleActiveChange = useCallback((active) => setIsActive(active), []);
  const handleAnalyserReady = useCallback((a) => setAnalyser(a), []);
  const handleZoomChange = useCallback((z) => setZoom(z), []);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setIsActive(false);
    setAnalyser(null);
  }, []);

  const hueBase = (frequency / 10) % 360;
  const accentColor = `hsl(${hueBase}, 75%, 60%)`;
  const accentGlow = `hsl(${hueBase}, 80%, 50%)`;
  const accentDim = `hsl(${hueBase}, 50%, 25%)`;

  const modeControls = (
    <>
      {mode === "tone" && (
        <ToneGenerator
          onFrequencyChange={handleFreqChange}
          onModesChange={handleModesChange}
          onActiveChange={handleActiveChange}
          onAnalyserReady={handleAnalyserReady}
        />
      )}
      {mode === "mic" && (
        <MicrophoneInput
          onFrequencyChange={handleFreqChange}
          onModesChange={handleModesChange}
          onActiveChange={handleActiveChange}
          onAnalyserReady={handleAnalyserReady}
        />
      )}
      {mode === "file" && (
        <FilePlayer
          onFrequencyChange={handleFreqChange}
          onModesChange={handleModesChange}
          onActiveChange={handleActiveChange}
          onAnalyserReady={handleAnalyserReady}
        />
      )}
      {mode === "samples" && (
        <SampleLibrary
          onFrequencyChange={handleFreqChange}
          onModesChange={handleModesChange}
          onActiveChange={handleActiveChange}
          onAnalyserReady={handleAnalyserReady}
        />
      )}
    </>
  );

  return (
    <div className="h-screen bg-[#08060e] text-[#d4d0e0] font-mono overflow-hidden flex flex-col md:flex-row">

      {/* ─── LEFT: Canvas panel ─── */}
      <div className="flex flex-col items-center justify-center shrink-0 px-4 py-3 md:py-4 md:px-6 md:h-full">
        {/* Header */}
        <header className="text-center mb-3 md:mb-4">
          <h1
            className="text-lg md:text-xl font-light tracking-[6px] uppercase"
            style={{ color: accentColor, textShadow: `0 0 30px ${accentGlow}44` }}
          >
            Cymatics
          </h1>
          <p className="text-[9px] tracking-[3px] text-[#665f80] mt-0.5 uppercase">
            Sound into Sacred Geometry
          </p>
        </header>

        {/* Canvas — scales to fill available height on desktop */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            width: "min(calc(100vh - 180px), 500px)",
            height: "min(calc(100vh - 180px), 500px)",
            border: `1px solid ${accentDim}`,
            boxShadow: `0 0 60px ${accentGlow}12, inset 0 0 60px rgba(0,0,0,0.5)`,
          }}
        >
          <CymaticsCanvas
            ref={canvasRef}
            frequency={frequency}
            n={n}
            m={m}
            isActive={isActive}
            analyser={analyser}
            zoom={zoom}
            onZoomChange={handleZoomChange}
          />
          {/* Overlays */}
          <div className="absolute bottom-1.5 right-2.5 text-[10px] tabular-nums opacity-60" style={{ color: accentColor }}>
            {frequency} Hz
          </div>
          <div className="absolute bottom-1.5 left-2.5 text-[9px] text-[#665f80] opacity-50">
            n={n} m={m}
          </div>
          <div className="absolute top-1.5 right-2.5 text-[8px] uppercase tracking-wider opacity-40" style={{ color: accentColor }}>
            {mode === "tone" ? "Tone" : mode === "mic" ? "Live Mic" : mode === "samples" ? "Sample" : "Audio File"}
          </div>
          {isActive && (
            <div className="absolute top-1.5 left-2.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ff4444" }} />
              <span className="text-[7px] text-[#ff4444] uppercase tracking-wider">Active</span>
            </div>
          )}
        </div>

        {/* Zoom + Scatter — compact row under canvas */}
        <div className="flex items-center gap-2 mt-2 w-full" style={{ maxWidth: "min(calc(100vh - 180px), 500px)" }}>
          <button
            onClick={() => setZoom(Math.max(0.5, Math.round((zoom - 0.5) * 10) / 10))}
            className="w-6 h-6 rounded flex items-center justify-center text-xs shrink-0"
            style={{ border: `1px solid ${accentDim}`, color: accentColor }}
          >
            -
          </button>
          <div className="flex-1">
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ accentColor }}
            />
          </div>
          <button
            onClick={() => setZoom(Math.min(5, Math.round((zoom + 0.5) * 10) / 10))}
            className="w-6 h-6 rounded flex items-center justify-center text-xs shrink-0"
            style={{ border: `1px solid ${accentDim}`, color: accentColor }}
          >
            +
          </button>
          <span className="text-[8px] text-[#665f80] tabular-nums w-8 text-center shrink-0">
            {zoom}x
          </span>
          <button
            onClick={() => {
              const canvas = document.querySelector("canvas");
              if (canvas?.__scatter) canvas.__scatter();
            }}
            className="px-2.5 py-1 rounded-full text-[9px] text-[#665f80] border border-[#2a2540] tracking-wider hover:border-[#4a4560] transition-colors shrink-0"
          >
            Scatter
          </button>
        </div>
      </div>

      {/* ─── RIGHT: Controls panel ─── */}
      <div className="flex-1 flex flex-col min-h-0 md:h-full md:border-l border-[#1a1728]">
        {/* Mode tabs — sticky at top of panel */}
        <div className="shrink-0 px-4 pt-3 pb-2 md:pt-4">
          <ModeSelector activeMode={mode} onModeChange={handleModeChange} accentColor={accentColor} />
        </div>

        {/* Scrollable controls area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
          <div className="max-w-md mx-auto">
            {modeControls}
          </div>

          {/* How it works — collapsed by default */}
          <div className="max-w-md mx-auto mt-5">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="w-full px-4 py-1.5 rounded-lg text-[9px] text-[#665f80] border border-[#1a1728] tracking-wider hover:border-[#2a2540] transition-colors text-center"
            >
              {showInfo ? "Hide" : "How it works"}
            </button>

            {showInfo && (
              <div className="mt-3 text-[10px] leading-relaxed text-[#8880a0] p-4 rounded-xl bg-white/[0.02] border border-[#1a1728]">
                <p className="mb-2">
                  <strong style={{ color: accentColor }}>Chladni patterns</strong> — geometric
                  figures that form when particles on a vibrating plate migrate to nodal lines.
                </p>
                <p className="mb-2">
                  <strong style={{ color: accentColor }}>Tone:</strong> Pure frequency mapped to vibration modes (N, M).{" "}
                  <strong style={{ color: accentColor }}>Mic:</strong> Detects dominant pitch from live audio.
                </p>
                <p>
                  <strong style={{ color: accentColor }}>File:</strong> FFT analysis of music.{" "}
                  <strong style={{ color: accentColor }}>Samples:</strong> Sacred sounds with reference patterns.
                </p>
              </div>
            )}

            <p className="mt-4 text-[7px] text-[#332e48] tracking-[2px] uppercase text-center">
              Built with Saini Labs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
