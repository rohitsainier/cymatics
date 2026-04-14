"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { PRESETS, frequencyToModes } from "@/lib/chladni";

export default function ToneGenerator({ onFrequencyChange, onModesChange, onActiveChange, onAnalyserReady }) {
  const [frequency, setFrequency] = useState(528);
  const [n, setN] = useState(5);
  const [m, setM] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [waveType, setWaveType] = useState("sine");
  const [activePreset, setActivePreset] = useState(5);

  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => { onFrequencyChange(frequency); }, [frequency, onFrequencyChange]);
  useEffect(() => { onModesChange(n, m); }, [n, m, onModesChange]);
  useEffect(() => { onActiveChange(isPlaying); }, [isPlaying, onActiveChange]);

  const startAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      osc.type = waveType;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);
      osc.start();
      oscRef.current = osc;
      gainRef.current = gain;
      analyserRef.current = analyser;
      onAnalyserReady(analyser);
    } else {
      audioCtxRef.current.resume();
    }
    setIsPlaying(true);
  }, [frequency, volume, waveType, onAnalyserReady]);

  const stopAudio = useCallback(() => {
    if (audioCtxRef.current) audioCtxRef.current.suspend();
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (oscRef.current) {
      oscRef.current.frequency.setTargetAtTime(frequency, audioCtxRef.current.currentTime, 0.05);
    }
  }, [frequency]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.05);
    }
  }, [volume]);

  useEffect(() => {
    if (oscRef.current) oscRef.current.type = waveType;
  }, [waveType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (oscRef.current) { try { oscRef.current.stop(); } catch {} }
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  const selectPreset = (idx) => {
    const p = PRESETS[idx];
    setFrequency(p.freq);
    setN(p.n);
    setM(p.m);
    setActivePreset(idx);
  };

  const hueBase = (frequency / 10) % 360;
  const accent = `hsl(${hueBase}, 75%, 60%)`;
  const accentDim = `hsl(${hueBase}, 50%, 25%)`;

  return (
    <div className="space-y-5">
      {/* Play button + wave type */}
      <div className="flex items-center gap-3 justify-center">
        <button
          onClick={() => isPlaying ? stopAudio() : startAudio()}
          className="px-6 py-2.5 rounded-full text-xs font-medium tracking-widest uppercase transition-all duration-300"
          style={{
            background: isPlaying ? accentDim : accent,
            color: isPlaying ? accent : "#08060e",
            border: `1px solid ${accent}`,
          }}
        >
          {isPlaying ? "◼ Stop" : "▶ Play"}
        </button>

        {["sine", "square", "triangle", "sawtooth"].map((type) => (
          <button
            key={type}
            onClick={() => setWaveType(type)}
            className="px-3 py-1.5 rounded-md text-[10px] uppercase tracking-wider transition-all"
            style={{
              background: waveType === type ? `${accent}20` : "transparent",
              color: waveType === type ? accent : "#665f80",
              border: `1px solid ${waveType === type ? accent + "60" : "#1a1728"}`,
            }}
          >
            {type === "sawtooth" ? "saw" : type}
          </button>
        ))}
      </div>

      {/* Frequency slider */}
      <div>
        <div className="flex justify-between text-[9px] text-[#665f80] mb-1 tracking-wider">
          <span>100 Hz</span>
          <span style={{ color: accent }}>Frequency: {frequency} Hz</span>
          <span>1000 Hz</span>
        </div>
        <input
          type="range"
          min={100}
          max={1000}
          step={1}
          value={frequency}
          onChange={(e) => {
            const f = Number(e.target.value);
            setFrequency(f);
            setActivePreset(-1);
            const modes = frequencyToModes(f);
            setN(modes.n);
            setM(modes.m);
          }}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: accent }}
        />
      </div>

      {/* Volume */}
      <div>
        <div className="flex justify-between text-[9px] text-[#665f80] mb-1 tracking-wider">
          <span>Quiet</span>
          <span>Volume</span>
          <span>Loud</span>
        </div>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: "#665f80" }}
        />
      </div>

      {/* Healing frequency presets */}
      <div>
        <p className="text-[9px] tracking-[3px] text-[#665f80] uppercase text-center mb-2">
          Healing Frequencies
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => selectPreset(i)}
              className="rounded-md px-2.5 py-2 text-left text-[10px] tracking-wide transition-all"
              style={{
                background: activePreset === i ? `${accent}18` : "rgba(255,255,255,0.02)",
                border: `1px solid ${activePreset === i ? accent + "60" : "#1a1728"}`,
                color: activePreset === i ? accent : "#8880a0",
              }}
            >
              <span className="font-medium">{p.label}</span>
              <span className="text-[#665f80] ml-1">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode controls */}
      <div>
        <p className="text-[9px] tracking-[3px] text-[#665f80] uppercase text-center mb-2">
          Vibration Modes
        </p>
        <div className="space-y-2">
          {[
            { label: "N", value: n, setter: setN },
            { label: "M", value: m, setter: setM },
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex items-center justify-center gap-1.5">
              <span className="text-[9px] text-[#665f80] w-8 text-right">{label}</span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
                <button
                  key={v}
                  onClick={() => { setter(v); setActivePreset(-1); }}
                  className="w-7 h-7 rounded text-[11px] transition-all"
                  style={{
                    border: `1px solid ${value === v ? accent + "80" : "#1a1728"}`,
                    background: value === v ? `${accent}20` : "transparent",
                    color: value === v ? accent : "#554f70",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
