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

  return (
    <div className="min-h-screen bg-[#08060e] text-[#d4d0e0] flex flex-col items-center px-4 py-6 font-mono">
      {/* Header */}
      <header className="text-center mb-6">
        <h1
          className="text-2xl font-light tracking-[6px] uppercase"
          style={{ color: accentColor, textShadow: `0 0 30px ${accentGlow}44` }}
        >
          Cymatics
        </h1>
        <p className="text-[10px] tracking-[3px] text-[#665f80] mt-1 uppercase">
          Sound into Sacred Geometry
        </p>
      </header>

      {/* Canvas + frequency overlay */}
      <div
        className="relative rounded-xl overflow-hidden mb-5"
        style={{
          width: PLATE_SIZE,
          height: PLATE_SIZE,
          border: `1px solid hsl(${hueBase}, 50%, 25%)`,
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
        {/* Overlay info */}
        <div className="absolute bottom-2 right-3 text-[11px] tabular-nums opacity-60" style={{ color: accentColor }}>
          {frequency} Hz
        </div>
        <div className="absolute bottom-2 left-3 text-[10px] text-[#665f80] opacity-50">
          n={n} m={m}
        </div>
        <div className="absolute top-2 right-3 text-[9px] uppercase tracking-wider opacity-40" style={{ color: accentColor }}>
          {mode === "tone" ? "Tone" : mode === "mic" ? "Live Mic" : mode === "samples" ? "Sample" : "Audio File"}
        </div>
        {isActive && (
          <div className="absolute top-2 left-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ff4444" }} />
            <span className="text-[8px] text-[#ff4444] uppercase tracking-wider">Active</span>
          </div>
        )}
      </div>

      {/* Zoom + Scatter controls */}
      <div className="flex items-center gap-3 mb-4" style={{ width: PLATE_SIZE }}>
        {/* Zoom control */}
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => setZoom(Math.max(0.5, Math.round((zoom - 0.5) * 10) / 10))}
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-colors"
            style={{
              border: `1px solid hsl(${hueBase}, 50%, 25%)`,
              color: accentColor,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            -
          </button>
          <div className="flex-1">
            <div className="flex justify-between text-[8px] text-[#665f80] mb-0.5 tracking-wider">
              <span>1x</span>
              <span style={{ color: zoom > 1 ? accentColor : "#665f80" }}>
                Pattern Repeat: {zoom}x
              </span>
              <span>5x</span>
            </div>
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
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm transition-colors"
            style={{
              border: `1px solid hsl(${hueBase}, 50%, 25%)`,
              color: accentColor,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            +
          </button>
        </div>

        {/* Scatter */}
        <button
          onClick={() => {
            const canvas = document.querySelector("canvas");
            if (canvas?.__scatter) canvas.__scatter();
          }}
          className="px-3 py-1.5 rounded-full text-[10px] text-[#665f80] border border-[#2a2540] tracking-wider hover:border-[#4a4560] transition-colors shrink-0"
        >
          Scatter
        </button>
      </div>

      {/* Mode selector */}
      <div className="w-full max-w-md mb-5">
        <ModeSelector activeMode={mode} onModeChange={handleModeChange} accentColor={accentColor} />
      </div>

      {/* Active mode controls */}
      <div className="w-full max-w-md">
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
      </div>

      {/* Info section */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="mt-8 px-5 py-1.5 rounded-full text-[10px] text-[#665f80] border border-[#1a1728] tracking-wider hover:border-[#2a2540] transition-colors"
      >
        {showInfo ? "Hide" : "How it works"}
      </button>

      {showInfo && (
        <div className="mt-4 max-w-md text-[11px] leading-relaxed text-[#8880a0] p-5 rounded-xl bg-white/[0.02] border border-[#1a1728]">
          <p className="mb-3">
            This simulates <strong style={{ color: accentColor }}>Chladni patterns</strong> — geometric
            figures that form when a vibrating plate causes particles to migrate to nodal lines
            (points of zero displacement).
          </p>
          <p className="mb-3">
            <strong style={{ color: accentColor }}>Tone mode:</strong> Generates a pure frequency and maps
            it to vibration modes (N, M). Higher frequencies create more complex geometry.
          </p>
          <p className="mb-3">
            <strong style={{ color: accentColor }}>Microphone mode:</strong> Captures live audio, detects
            the dominant pitch, and drives the pattern in real-time. Sing, hum, or play an instrument!
          </p>
          <p>
            <strong style={{ color: accentColor }}>Audio File mode:</strong> Upload any music file — the
            app analyzes the frequency content and visualizes it as evolving Chladni patterns.
          </p>
        </div>
      )}

      <p className="mt-6 text-[8px] text-[#332e48] tracking-[2px] uppercase text-center">
        Built with Saini Labs
      </p>
    </div>
  );
}
