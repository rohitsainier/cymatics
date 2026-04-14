"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getDominantFrequency, getFrequencyBands } from "@/lib/audioAnalysis";
import { frequencyToModes } from "@/lib/chladni";

export default function FilePlayer({ onFrequencyChange, onModesChange, onActiveChange, onAnalyserReady }) {
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [detectedFreq, setDetectedFreq] = useState(0);
  const [bands, setBands] = useState({ bass: 0, mid: 0, high: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const freqLoopRef = useRef(null);
  const connectedRef = useRef(false);

  const setupAudio = useCallback(() => {
    if (!audioRef.current || connectedRef.current) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const source = ctx.createMediaElementSource(audioRef.current);
    sourceRef.current = source;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    source.connect(analyser);
    analyser.connect(ctx.destination);
    connectedRef.current = true;

    onAnalyserReady(analyser);
  }, [onAnalyserReady]);

  const startFreqDetection = useCallback(() => {
    const detect = () => {
      if (!analyserRef.current || !audioCtxRef.current) return;
      const freq = getDominantFrequency(analyserRef.current, audioCtxRef.current.sampleRate);
      const b = getFrequencyBands(analyserRef.current);
      setBands(b);

      if (freq > 40 && freq < 6000) {
        setDetectedFreq(Math.round(freq));
        onFrequencyChange(Math.round(freq));
        const modes = frequencyToModes(freq);
        onModesChange(modes.n, modes.m);
      }
      freqLoopRef.current = requestAnimationFrame(detect);
    };
    freqLoopRef.current = requestAnimationFrame(detect);
  }, [onFrequencyChange, onModesChange]);

  const stopFreqDetection = useCallback(() => {
    if (freqLoopRef.current) cancelAnimationFrame(freqLoopRef.current);
  }, []);

  const handleFile = useCallback((f) => {
    if (!f || !f.type.startsWith("audio/")) return;
    // Stop current playback and detection
    stopFreqDetection();
    if (audioRef.current) audioRef.current.pause();
    if (file) URL.revokeObjectURL(file);
    // Close old audio context so a fresh one is created on play
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    sourceRef.current = null;
    analyserRef.current = null;
    connectedRef.current = false;
    // Increment key to force a new <audio> DOM element (fixes MediaElementSource reuse error)
    setFileKey((k) => k + 1);
    setFile(URL.createObjectURL(f));
    setFileName(f.name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onActiveChange(false);
  }, [file, stopFreqDetection, onActiveChange]);

  const play = useCallback(() => {
    if (!audioRef.current) return;
    setupAudio();
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    audioRef.current.play();
    setIsPlaying(true);
    onActiveChange(true);
    startFreqDetection();
  }, [setupAudio, startFreqDetection, onActiveChange]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    onActiveChange(false);
    stopFreqDetection();
  }, [stopFreqDetection, onActiveChange]);

  useEffect(() => {
    return () => {
      stopFreqDetection();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (file) URL.revokeObjectURL(file);
    };
  }, [file, stopFreqDetection]);

  const formatTime = (t) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const freqHue = (detectedFreq / 10) % 360;
  const accent = `hsl(${freqHue}, 75%, 60%)`;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Hidden audio element */}
      {file && (
        <audio
          key={fileKey}
          ref={audioRef}
          src={file}
          onLoadedMetadata={() => setDuration(audioRef.current.duration)}
          onTimeUpdate={() => setCurrentTime(audioRef.current.currentTime)}
          onEnded={() => { setIsPlaying(false); onActiveChange(false); stopFreqDetection(); }}
        />
      )}

      {/* Drop zone */}
      <div
        className="relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer"
        style={{
          borderColor: isDragging ? accent : "#2a2540",
          background: isDragging ? `${accent}08` : "rgba(255,255,255,0.01)",
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "audio/*";
          input.onchange = (e) => {
            if (e.target.files[0]) handleFile(e.target.files[0]);
          };
          input.click();
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={isDragging ? accent : "#4a4560"} strokeWidth="1.2" className="mx-auto mb-3">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <p className="text-[11px] text-[#8880a0] mb-1">
          {fileName || "Drop an audio file here or click to browse"}
        </p>
        <p className="text-[9px] text-[#4a4560]">MP3, WAV, OGG, FLAC</p>
      </div>

      {/* Player controls */}
      {file && (
        <div className="space-y-3">
          {/* File name */}
          <p className="text-[11px] text-[#8880a0] text-center truncate px-4">{fileName}</p>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full bg-[#1a1728] cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              if (audioRef.current) audioRef.current.currentTime = ratio * duration;
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{ width: `${progress}%`, background: accent }}
            />
          </div>

          {/* Time + controls */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#665f80] tabular-nums w-12">
              {formatTime(currentTime)}
            </span>

            <div className="flex items-center gap-3">
              {/* Rewind 10s */}
              <button
                onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, currentTime - 10); }}
                className="text-[#665f80] hover:text-[#8880a0] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 4v6h6" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>

              {/* Play/Pause */}
              <button
                onClick={() => (isPlaying ? pause() : play())}
                className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: isPlaying ? `${accent}20` : accent,
                  border: `1px solid ${accent}`,
                  color: isPlaying ? accent : "#08060e",
                }}
              >
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                )}
              </button>

              {/* Forward 10s */}
              <button
                onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, currentTime + 10); }}
                className="text-[#665f80] hover:text-[#8880a0] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M23 4v6h-6" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            </div>

            <span className="text-[10px] text-[#665f80] tabular-nums w-12 text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Detected frequency */}
          {isPlaying && (
            <div className="text-center space-y-3 pt-2">
              <div>
                <span className="text-3xl font-light tabular-nums" style={{ color: detectedFreq > 0 ? accent : "#332e48" }}>
                  {detectedFreq > 0 ? detectedFreq : "---"}
                </span>
                <span className="text-xs ml-1.5 text-[#665f80]">Hz</span>
              </div>

              {/* Mini frequency bands */}
              <div className="flex items-end justify-center gap-2 h-10">
                {[
                  { label: "B", value: bands.bass, color: "#ff6b6b" },
                  { label: "M", value: bands.mid, color: "#ffd93d" },
                  { label: "H", value: bands.high, color: "#6bcb77" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center gap-0.5">
                    <div
                      className="w-8 rounded-sm transition-all duration-100"
                      style={{
                        height: `${Math.max(3, value * 36)}px`,
                        background: `${color}${Math.round(40 + value * 60).toString(16)}`,
                      }}
                    />
                    <span className="text-[7px] text-[#4a4560]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
