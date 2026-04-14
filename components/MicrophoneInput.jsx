"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getDominantFrequency, getFrequencyBands } from "@/lib/audioAnalysis";
import { frequencyToModes } from "@/lib/chladni";

export default function MicrophoneInput({ onFrequencyChange, onModesChange, onActiveChange, onAnalyserReady }) {
  const [isListening, setIsListening] = useState(false);
  const [permissionState, setPermissionState] = useState("prompt"); // prompt | granted | denied
  const [detectedFreq, setDetectedFreq] = useState(0);
  const [bands, setBands] = useState({ bass: 0, mid: 0, high: 0 });

  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const freqLoopRef = useRef(null);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState("granted");

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      source.connect(analyser);
      // Don't connect to destination — we don't want feedback

      onAnalyserReady(analyser);
      setIsListening(true);
      onActiveChange(true);

      // Frequency detection loop
      const detectFreq = () => {
        if (!analyserRef.current) return;
        const freq = getDominantFrequency(analyserRef.current, ctx.sampleRate);
        const b = getFrequencyBands(analyserRef.current);
        setBands(b);

        if (freq > 60 && freq < 1200) {
          setDetectedFreq(Math.round(freq));
          onFrequencyChange(Math.round(freq));
          const modes = frequencyToModes(freq);
          onModesChange(modes.n, modes.m);
        }
        freqLoopRef.current = requestAnimationFrame(detectFreq);
      };
      freqLoopRef.current = requestAnimationFrame(detectFreq);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setPermissionState("denied");
      }
      console.error("Mic error:", err);
    }
  }, [onFrequencyChange, onModesChange, onActiveChange, onAnalyserReady]);

  const stopMic = useCallback(() => {
    if (freqLoopRef.current) cancelAnimationFrame(freqLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioCtxRef.current) audioCtxRef.current.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    setIsListening(false);
    onActiveChange(false);
    onAnalyserReady(null);
  }, [onActiveChange, onAnalyserReady]);

  useEffect(() => {
    return () => stopMic();
  }, [stopMic]);

  const freqHue = (detectedFreq / 10) % 360;
  const accent = `hsl(${freqHue}, 75%, 60%)`;

  return (
    <div className="space-y-5">
      {/* Status + toggle */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => (isListening ? stopMic() : startMic())}
          className="relative w-24 h-24 rounded-full transition-all duration-300 flex items-center justify-center"
          style={{
            background: isListening
              ? `radial-gradient(circle, ${accent}30 0%, transparent 70%)`
              : "rgba(255,255,255,0.03)",
            border: `2px solid ${isListening ? accent : "#2a2540"}`,
            boxShadow: isListening ? `0 0 40px ${accent}25` : "none",
          }}
        >
          {/* Pulsing rings when listening */}
          {isListening && (
            <>
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{ border: `1px solid ${accent}30` }}
              />
              <span
                className="absolute inset-[-8px] rounded-full animate-pulse opacity-30"
                style={{ border: `1px solid ${accent}20` }}
              />
            </>
          )}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isListening ? accent : "#665f80"} strokeWidth="1.5">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <p className="text-[10px] tracking-[2px] uppercase" style={{ color: isListening ? accent : "#665f80" }}>
          {permissionState === "denied"
            ? "Microphone access denied"
            : isListening
            ? "Listening..."
            : "Tap to start listening"}
        </p>
      </div>

      {/* Detected frequency display */}
      {isListening && (
        <div className="text-center space-y-4">
          <div>
            <span
              className="text-5xl font-light tabular-nums"
              style={{ color: detectedFreq > 0 ? accent : "#332e48" }}
            >
              {detectedFreq > 0 ? detectedFreq : "---"}
            </span>
            <span className="text-sm ml-2" style={{ color: "#665f80" }}>
              Hz
            </span>
          </div>

          {/* Frequency bands visualizer */}
          <div className="flex items-end justify-center gap-3 h-16">
            {[
              { label: "Bass", value: bands.bass, color: "#ff6b6b" },
              { label: "Mid", value: bands.mid, color: "#ffd93d" },
              { label: "High", value: bands.high, color: "#6bcb77" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className="w-12 rounded-sm transition-all duration-100"
                  style={{
                    height: `${Math.max(4, value * 60)}px`,
                    background: `${color}${Math.round(40 + value * 60).toString(16)}`,
                    boxShadow: value > 0.3 ? `0 0 10px ${color}40` : "none",
                  }}
                />
                <span className="text-[8px] text-[#665f80] uppercase tracking-wider">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[9px] text-[#4a4560] leading-relaxed max-w-xs mx-auto">
            Sing, hum, or play an instrument near your mic.
            The pattern will follow the dominant pitch.
          </p>
        </div>
      )}

      {permissionState === "denied" && (
        <div className="text-center px-4 py-3 rounded-lg bg-red-900/10 border border-red-900/20">
          <p className="text-[11px] text-red-400/80">
            Microphone access was denied. Please allow microphone permissions in your browser settings and reload.
          </p>
        </div>
      )}
    </div>
  );
}
