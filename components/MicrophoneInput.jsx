"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getDominantFrequency, getFrequencyBands } from "@/lib/audioAnalysis";
import { frequencyToModes } from "@/lib/chladni";

// Smoothing: keep a rolling window of recent detections
const SMOOTH_WINDOW = 8;

function medianFilter(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function MicrophoneInput({ onFrequencyChange, onModesChange, onActiveChange, onAnalyserReady }) {
  const [isListening, setIsListening] = useState(false);
  const [permissionState, setPermissionState] = useState("prompt");
  const [detectedFreq, setDetectedFreq] = useState(0);
  const [rawFreq, setRawFreq] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [bands, setBands] = useState({ bass: 0, mid: 0, high: 0 });

  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const freqLoopRef = useRef(null);
  const freqHistoryRef = useRef([]);
  const lastStableFreqRef = useRef(0);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      setPermissionState("granted");

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096; // larger FFT = better low-frequency resolution
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      source.connect(analyser);

      onAnalyserReady(analyser);
      setIsListening(true);
      onActiveChange(true);
      freqHistoryRef.current = [];

      // Frequency detection loop
      const detectFreq = () => {
        if (!analyserRef.current) return;
        const freq = getDominantFrequency(analyserRef.current, ctx.sampleRate);
        const b = getFrequencyBands(analyserRef.current);
        setBands(b);

        if (freq > 40 && freq < 6000) {
          setRawFreq(Math.round(freq));

          // Rolling history for median smoothing
          const history = freqHistoryRef.current;
          history.push(freq);
          if (history.length > SMOOTH_WINDOW) history.shift();

          // Median filter removes outlier spikes
          const smoothed = medianFilter(history);

          // Only update if we have enough consistent readings
          const stableCount = history.filter(
            (f) => Math.abs(f - smoothed) < smoothed * 0.12
          ).length;
          const conf = Math.min(1, stableCount / (SMOOTH_WINDOW * 0.6));
          setConfidence(conf);

          if (conf > 0.3) {
            const rounded = Math.round(smoothed);
            setDetectedFreq(rounded);
            onFrequencyChange(rounded);
            const modes = frequencyToModes(smoothed);
            onModesChange(modes.n, modes.m);
            lastStableFreqRef.current = rounded;
          }
        } else if (lastStableFreqRef.current > 0) {
          // No detection — keep showing last known freq but fade confidence
          setConfidence((prev) => Math.max(0, prev - 0.05));
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
    freqHistoryRef.current = [];
    setIsListening(false);
    setConfidence(0);
    onActiveChange(false);
    onAnalyserReady(null);
  }, [onActiveChange, onAnalyserReady]);

  useEffect(() => {
    return () => stopMic();
  }, [stopMic]);

  const freqHue = (detectedFreq / 10) % 360;
  const accent = `hsl(${freqHue}, 75%, 60%)`;

  return (
    <div className="space-y-4">
      {/* Mic button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => (isListening ? stopMic() : startMic())}
          className="relative w-20 h-20 rounded-full transition-all duration-300 flex items-center justify-center"
          style={{
            background: isListening
              ? `radial-gradient(circle, ${accent}30 0%, transparent 70%)`
              : "rgba(255,255,255,0.03)",
            border: `2px solid ${isListening ? accent : "#2a2540"}`,
            boxShadow: isListening ? `0 0 40px ${accent}25` : "none",
          }}
        >
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping" style={{ border: `1px solid ${accent}30` }} />
              <span className="absolute inset-[-6px] rounded-full animate-pulse opacity-30" style={{ border: `1px solid ${accent}20` }} />
            </>
          )}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={isListening ? accent : "#665f80"} strokeWidth="1.5">
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

      {/* Frequency display */}
      {isListening && (
        <div className="text-center space-y-3">
          <div>
            <span
              className="text-4xl font-light tabular-nums transition-colors duration-200"
              style={{ color: detectedFreq > 0 ? accent : "#332e48" }}
            >
              {detectedFreq > 0 ? detectedFreq : "---"}
            </span>
            <span className="text-xs ml-1.5 text-[#665f80]">Hz</span>
          </div>

          {/* Confidence bar */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-[8px] text-[#4a4560] uppercase tracking-wider">Confidence</span>
            <div className="w-24 h-1.5 rounded-full bg-[#1a1728] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${confidence * 100}%`,
                  background: confidence > 0.6 ? "#6bcb77" : confidence > 0.3 ? "#ffd93d" : "#ff6b6b",
                }}
              />
            </div>
            {rawFreq > 0 && (
              <span className="text-[8px] text-[#4a4560] tabular-nums">
                raw: {rawFreq}
              </span>
            )}
          </div>

          {/* Frequency bands */}
          <div className="flex items-end justify-center gap-2 h-12">
            {[
              { label: "Bass", value: bands.bass, color: "#ff6b6b" },
              { label: "Mid", value: bands.mid, color: "#ffd93d" },
              { label: "High", value: bands.high, color: "#6bcb77" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-10 rounded-sm transition-all duration-100"
                  style={{
                    height: `${Math.max(3, value * 44)}px`,
                    background: `${color}${Math.round(40 + value * 60).toString(16)}`,
                    boxShadow: value > 0.3 ? `0 0 8px ${color}40` : "none",
                  }}
                />
                <span className="text-[7px] text-[#665f80] uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-[8px] text-[#4a4560] leading-relaxed max-w-xs mx-auto">
            Sing or hum steadily near your mic. The confidence bar
            shows detection quality — green means a strong lock.
          </p>
        </div>
      )}

      {permissionState === "denied" && (
        <div className="text-center px-3 py-2.5 rounded-lg bg-red-900/10 border border-red-900/20">
          <p className="text-[10px] text-red-400/80">
            Mic access denied. Allow microphone in browser settings and reload.
          </p>
        </div>
      )}
    </div>
  );
}
