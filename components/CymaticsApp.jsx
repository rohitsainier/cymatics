"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import CymaticsCanvas from "./CymaticsCanvas";
import WaterCanvas from "./WaterCanvas";
import ThreeCanvas from "./ThreeCanvas";
import SandCanvas from "./SandCanvas";
import ToneGenerator from "./ToneGenerator";
import MicrophoneInput from "./MicrophoneInput";
import FilePlayer from "./FilePlayer";
import SampleLibrary from "./SampleLibrary";
import FrequencyLayers from "./FrequencyLayers";
import ModeSelector, { VerticalModeSelector } from "./ModeSelector";
import { exportPNG, startRecording, stopRecording, canRecord, isRecording, getRecordingDuration } from "@/lib/exportUtils";
import SessionTimer from "./SessionTimer";

export default function CymaticsApp() {
  const [mode, setMode] = useState("tone");
  const [showSession, setShowSession] = useState(false);
  const [frequency, setFrequency] = useState(528);
  const [n, setN] = useState(5);
  const [m, setM] = useState(2);
  const [isActive, setIsActive] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panelOpen, setPanelOpen] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0);
  const [supportsRecord, setSupportsRecord] = useState(false);
  const [plateShape, setPlateShape] = useState("rectangular");
  const [renderMode, setRenderMode] = useState("particles");
  const [layers, setLayers] = useState(null);

  const canvasRef = useRef(null);
  const toneRef = useRef(null);

  // Check MediaRecorder support client-side only
  useEffect(() => { setSupportsRecord(canRecord()); }, []);
  const recTimerRef = useRef(null);

  // Recording duration counter
  useEffect(() => {
    if (recording) {
      recTimerRef.current = setInterval(() => setRecDuration(getRecordingDuration()), 500);
    } else {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      setRecDuration(0);
    }
    return () => { if (recTimerRef.current) clearInterval(recTimerRef.current); };
  }, [recording]);

  const handleFreqChange = useCallback((f) => setFrequency(f), []);
  const handleModesChange = useCallback((newN, newM) => { setN(newN); setM(newM); }, []);
  const handleActiveChange = useCallback((active) => setIsActive(active), []);
  const handleAnalyserReady = useCallback((a) => setAnalyser(a), []);
  const handleZoomChange = useCallback((z) => setZoom(z), []);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setIsActive(false);
    setAnalyser(null);
    setPanelOpen(true);
  }, []);

  const hueBase = (frequency / 10) % 360;
  const accentColor = `hsl(${hueBase}, 75%, 60%)`;
  const accentGlow = `hsl(${hueBase}, 80%, 50%)`;
  const accentDim = `hsl(${hueBase}, 50%, 25%)`;

  const panelWidth = panelOpen ? 340 : 0;

  const modeControls = (
    <>
      {mode === "tone" && (
        <ToneGenerator
          ref={toneRef}
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

  const modeLabel = mode === "tone" ? "Tone" : mode === "mic" ? "Live Mic" : mode === "samples" ? "Samples" : "Audio File";

  return (
    <>
      {/* ═══ DESKTOP (md+): sidebar | controls | canvas ═══ */}
      <div className="hidden md:flex h-screen bg-[#08060e] text-[#d4d0e0] font-mono overflow-hidden">

        {/* ── Col 1: Icon sidebar ── */}
        <div className="shrink-0 w-12 border-r border-[#1a1728] flex flex-col items-center justify-between py-2 bg-[#0a0814]">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ color: accentColor, border: `1px solid ${accentDim}` }}>
            C
          </div>
          <VerticalModeSelector activeMode={mode} onModeChange={handleModeChange} accentColor={accentColor} />
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: panelOpen ? accentColor : "#554f70" }}
            title={panelOpen ? "Hide controls" : "Show controls"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {panelOpen
                ? <path d="M9 3h12v18H9M15 12H3M3 12l4-4M3 12l4 4" />
                : <path d="M3 3h12v18H3M9 12h12M21 12l-4-4M21 12l-4 4" />
              }
            </svg>
          </button>
        </div>

        {/* ── Col 2: Controls panel (LEFT side, collapsible) ── */}
        <div
          className="shrink-0 border-r border-[#1a1728] flex flex-col h-full bg-[#0a0814]/50 transition-all duration-300 overflow-hidden"
          style={{ width: panelOpen ? panelWidth : 0, opacity: panelOpen ? 1 : 0 }}
        >
          {/* Panel header */}
          <div className="shrink-0 px-4 pt-3 pb-2 border-b border-[#1a1728]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[2px] uppercase" style={{ color: showSession ? "#6bcb77" : accentColor }}>
                {showSession ? "Session" : modeLabel}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowSession(!showSession); if (!showSession) { setMode("tone"); } }}
                  className="text-[8px] tracking-wider transition-colors px-2 py-0.5 rounded"
                  style={{
                    color: showSession ? "#6bcb77" : "#554f70",
                    border: `1px solid ${showSession ? "#6bcb7740" : "transparent"}`,
                    background: showSession ? "#6bcb7710" : "transparent",
                  }}
                  title="Guided meditation sessions"
                >
                  {showSession ? "Controls" : "Timer"}
                </button>
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="text-[8px] text-[#554f70] hover:text-[#8880a0] tracking-wider transition-colors"
                >
                  {showInfo ? "Hide" : "Info"}
                </button>
              </div>
            </div>
            {showInfo && (
              <p className="text-[9px] text-[#665f80] leading-relaxed mt-2">
                {mode === "tone" && "Generate pure frequencies. Use presets or drag the slider."}
                {mode === "mic" && "Sing or hum near your mic. YIN pitch detection locks onto the fundamental."}
                {mode === "file" && "Drop an audio file. FFT analysis drives the pattern in real-time."}
                {mode === "samples" && "Sacred sounds with harmonics. Compare the live pattern to the reference image."}
              </p>
            )}

            {/* Visualization toggles */}
            <div className="flex gap-1.5 mt-2">
              {/* Plate shape */}
              {[
                { id: "rectangular", label: "Square" },
                { id: "circular", label: "Circle" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setPlateShape(id)}
                  className="flex-1 py-1 rounded text-[8px] tracking-wider text-center transition-all"
                  style={{
                    background: plateShape === id ? `${accentColor}18` : "transparent",
                    color: plateShape === id ? accentColor : "#554f70",
                    border: `1px solid ${plateShape === id ? accentColor + "50" : "#1a1728"}`,
                  }}
                >{label}</button>
              ))}
              {/* Render mode */}
              {[
                { id: "particles", label: "Particles" },
                { id: "water", label: "Water" },
                { id: "three", label: "3D" },
                { id: "sand", label: "Sand" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setRenderMode(id)}
                  className="flex-1 py-1 rounded text-[8px] tracking-wider text-center transition-all"
                  style={{
                    background: renderMode === id ? `${accentColor}18` : "transparent",
                    color: renderMode === id ? accentColor : "#554f70",
                    border: `1px solid ${renderMode === id ? accentColor + "50" : "#1a1728"}`,
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Scrollable mode controls or session timer */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            {showSession ? (
              <SessionTimer
                toneRef={toneRef}
                onFrequencyChange={handleFreqChange}
                onModesChange={handleModesChange}
                onClose={() => setShowSession(false)}
                accentColor={accentColor}
              />
            ) : (
              <>
                {modeControls}
                {/* Frequency layers */}
                <div className="mt-4">
                  <FrequencyLayers layers={layers} onLayersChange={setLayers} accentColor={accentColor} />
                </div>
              </>
            )}
          </div>

          {/* Zoom bar at bottom of panel */}
          <div className="shrink-0 px-3 py-2 border-t border-[#1a1728]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoom(Math.max(0.5, Math.round((zoom - 0.5) * 10) / 10))}
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0"
                style={{ border: `1px solid ${accentDim}`, color: accentColor }}
              >-</button>
              <input
                type="range" min={0.5} max={5} step={0.1} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-0.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor }}
              />
              <button
                onClick={() => setZoom(Math.min(5, Math.round((zoom + 0.5) * 10) / 10))}
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0"
                style={{ border: `1px solid ${accentDim}`, color: accentColor }}
              >+</button>
              <span className="text-[7px] tabular-nums w-6 text-center shrink-0" style={{ color: "#665f80" }}>{zoom}x</span>
            </div>
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={() => { const c = canvasRef.current; if (c?.__kick) c.__kick(); }}
                className="flex-1 py-1 rounded text-[8px] tracking-wider text-center"
                style={{ color: "#665f80", border: "1px solid #1a1728" }}
              >Shake</button>
              <button
                onClick={() => { const c = canvasRef.current; if (c?.__scatter) c.__scatter(); }}
                className="flex-1 py-1 rounded text-[8px] tracking-wider text-center"
                style={{ color: "#665f80", border: "1px solid #1a1728" }}
              >Reset</button>
            </div>
            {/* Export buttons */}
            <div className="flex gap-1.5 mt-1.5">
              <button
                onClick={() => exportPNG(canvasRef.current, frequency, n, m)}
                className="flex-1 py-1 rounded text-[8px] tracking-wider text-center"
                style={{ color: accentColor, border: `1px solid ${accentDim}` }}
              >PNG</button>
              {supportsRecord && (
                <button
                  onClick={async () => {
                    if (recording) {
                      await stopRecording(frequency, n, m);
                      setRecording(false);
                    } else {
                      startRecording(canvasRef.current, 30);
                      setRecording(true);
                    }
                  }}
                  className="flex-1 py-1 rounded text-[8px] tracking-wider text-center"
                  style={{
                    color: recording ? "#ff4444" : accentColor,
                    border: `1px solid ${recording ? "#ff444460" : accentDim}`,
                    background: recording ? "#ff444410" : "transparent",
                  }}
                >{recording ? `Stop ${recDuration}s` : "Record"}</button>
              )}
            </div>
          </div>
        </div>

        {/* ── Col 3: Canvas (fills ALL remaining space, clean) ── */}
        <div className="flex-1 flex items-center justify-center p-3 min-w-0">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              width: `min(calc(100vh - 30px), calc(100vw - ${panelWidth + 60}px))`,
              height: `min(calc(100vh - 30px), calc(100vw - ${panelWidth + 60}px))`,
              border: `1px solid ${accentDim}`,
              boxShadow: `0 0 80px ${accentGlow}10, inset 0 0 80px rgba(0,0,0,0.5)`,
              transition: "width 0.3s ease, height 0.3s ease",
            }}
          >
            {renderMode === "sand" ? (
              <SandCanvas
                ref={canvasRef}
                frequency={frequency} n={n} m={m}
                isActive={isActive} analyser={analyser}
                zoom={zoom} onZoomChange={handleZoomChange}
                plateShape={plateShape} layers={layers}
              />
            ) : renderMode === "three" ? (
              <ThreeCanvas
                ref={canvasRef}
                frequency={frequency} n={n} m={m}
                isActive={isActive} analyser={analyser}
                zoom={zoom} onZoomChange={handleZoomChange}
                plateShape={plateShape} layers={layers}
              />
            ) : renderMode === "water" ? (
              <WaterCanvas
                ref={canvasRef}
                frequency={frequency} n={n} m={m}
                isActive={isActive} analyser={analyser} zoom={zoom}
                plateShape={plateShape} layers={layers}
              />
            ) : (
              <CymaticsCanvas
                ref={canvasRef}
                frequency={frequency} n={n} m={m}
                isActive={isActive} analyser={analyser}
                zoom={zoom} onZoomChange={handleZoomChange}
                plateShape={plateShape} layers={layers}
              />
            )}
            {/* Minimal overlays */}
            <div className="absolute bottom-2 right-3 text-[10px] tabular-nums opacity-40" style={{ color: accentColor }}>
              {frequency} Hz
            </div>
            <div className="absolute bottom-2 left-3 text-[9px] text-[#665f80] opacity-30">
              n={n} m={m} {zoom !== 1 && `· ${zoom}x`}
            </div>
            {isActive && (
              <div className="absolute top-2.5 left-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ff4444" }} />
                <span className="text-[7px] text-[#ff4444] uppercase tracking-wider opacity-60">Live</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MOBILE (<md): stacked layout ═══ */}
      <div className="md:hidden min-h-screen bg-[#08060e] text-[#d4d0e0] font-mono flex flex-col">
        <header className="text-center py-3">
          <h1 className="text-lg font-light tracking-[6px] uppercase" style={{ color: accentColor }}>Cymatics</h1>
        </header>

        <div className="flex justify-center px-3">
          <div
            className="relative rounded-xl overflow-hidden w-full"
            style={{ maxWidth: 400, aspectRatio: "1", border: `1px solid ${accentDim}`, boxShadow: `0 0 40px ${accentGlow}10` }}
          >
            {renderMode === "sand" ? (
              <SandCanvas
                frequency={frequency} n={n} m={m}
                isActive={isActive} analyser={analyser}
                zoom={zoom} onZoomChange={handleZoomChange}
                plateShape={plateShape} layers={layers}
              />
            ) : renderMode === "three" ? (
              <ThreeCanvas
                frequency={frequency} n={n} m={m}
                isActive={isActive} analyser={analyser}
                zoom={zoom} onZoomChange={handleZoomChange}
                plateShape={plateShape} layers={layers}
              />
            ) : renderMode === "water" ? (
              <WaterCanvas
                frequency={frequency} n={n} m={m}
                isActive={isActive} analyser={analyser} zoom={zoom}
                plateShape={plateShape} layers={layers}
              />
            ) : (
              <CymaticsCanvas
                frequency={frequency} n={n} m={m}
                isActive={isActive} analyser={analyser}
                zoom={zoom} onZoomChange={handleZoomChange}
                plateShape={plateShape} layers={layers}
              />
            )}
            <div className="absolute bottom-1.5 right-2.5 text-[10px] tabular-nums opacity-50" style={{ color: accentColor }}>{frequency} Hz</div>
            <div className="absolute bottom-1.5 left-2.5 text-[9px] text-[#665f80] opacity-40">n={n} m={m}</div>
          </div>
        </div>

        <div className="flex gap-1 px-4 py-1.5 max-w-[400px] mx-auto w-full">
          {[
            { id: "rectangular", label: "Square" }, { id: "circular", label: "Circle" },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setPlateShape(id)}
              className="flex-1 py-1 rounded text-[8px] tracking-wider text-center transition-all"
              style={{
                background: plateShape === id ? `${accentColor}18` : "transparent",
                color: plateShape === id ? accentColor : "#554f70",
                border: `1px solid ${plateShape === id ? accentColor + "50" : "#1a1728"}`,
              }}>{label}</button>
          ))}
          {[
            { id: "particles", label: "Particles" }, { id: "water", label: "Water" }, { id: "three", label: "3D" }, { id: "sand", label: "Sand" },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setRenderMode(id)}
              className="flex-1 py-1 rounded text-[8px] tracking-wider text-center transition-all"
              style={{
                background: renderMode === id ? `${accentColor}18` : "transparent",
                color: renderMode === id ? accentColor : "#554f70",
                border: `1px solid ${renderMode === id ? accentColor + "50" : "#1a1728"}`,
              }}>{label}</button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-2 max-w-[400px] mx-auto w-full">
          <button onClick={() => setZoom(Math.max(0.5, Math.round((zoom - 0.5) * 10) / 10))}
            className="w-6 h-6 rounded flex items-center justify-center text-xs" style={{ border: `1px solid ${accentDim}`, color: accentColor }}>-</button>
          <input type="range" min={0.5} max={5} step={0.1} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 h-1 rounded-full appearance-none cursor-pointer" style={{ accentColor }} />
          <button onClick={() => setZoom(Math.min(5, Math.round((zoom + 0.5) * 10) / 10))}
            className="w-6 h-6 rounded flex items-center justify-center text-xs" style={{ border: `1px solid ${accentDim}`, color: accentColor }}>+</button>
          <span className="text-[8px] text-[#665f80] tabular-nums w-6 text-center">{zoom}x</span>
          <button onClick={() => { const c = canvasRef.current; if (c?.__kick) c.__kick(); }}
            className="px-2 py-1 rounded-full text-[9px] text-[#665f80] border border-[#2a2540]">Shake</button>
        </div>

        <div className="px-3 pt-1 pb-2">
          <ModeSelector activeMode={mode} onModeChange={handleModeChange} accentColor={accentColor} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="max-w-[400px] mx-auto">{modeControls}</div>
        </div>
      </div>
    </>
  );
}
