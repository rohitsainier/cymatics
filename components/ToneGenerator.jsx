"use client";
import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { PRESETS, frequencyToModes } from "@/lib/chladni";
import { createBinauralGraph, BINAURAL_PRESETS } from "@/lib/binauralAudio";

const ToneGenerator = forwardRef(function ToneGenerator({ onFrequencyChange, onModesChange, onActiveChange, onAnalyserReady }, ref) {
  const [frequency, setFrequency] = useState(528);
  const [n, setN] = useState(5);
  const [m, setM] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const [waveType, setWaveType] = useState("sine");
  const [activePreset, setActivePreset] = useState(5);
  const [isBinaural, setIsBinaural] = useState(false);
  const [beatFreq, setBeatFreq] = useState(10);
  const [binauralPreset, setBinauralPreset] = useState(2); // Alpha default

  const audioCtxRef = useRef(null);
  const oscRef = useRef(null);
  const osc2Ref = useRef(null);
  const gainRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => { onFrequencyChange(frequency); }, [frequency, onFrequencyChange]);
  useEffect(() => { onModesChange(n, m); }, [n, m, onModesChange]);
  useEffect(() => { onActiveChange(isPlaying); }, [isPlaying, onActiveChange]);

  // Expose imperative control for session timer
  useImperativeHandle(ref, () => ({
    play: () => { if (!isPlaying) startAudio(); },
    stop: () => { if (isPlaying) stopAudio(); },
    setFreq: (f) => {
      setFrequency(f);
      const modes = frequencyToModes(f);
      setN(modes.n);
      setM(modes.m);
    },
    setVol: (v) => setVolume(v),
    isPlaying: () => isPlaying,
  }));

  const destroyAudio = useCallback(() => {
    if (oscRef.current) { try { oscRef.current.stop(); } catch {} }
    if (osc2Ref.current) { try { osc2Ref.current.stop(); } catch {} }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    oscRef.current = null;
    osc2Ref.current = null;
    gainRef.current = null;
    analyserRef.current = null;
  }, []);

  const startAudio = useCallback(() => {
    // Destroy previous context to rebuild graph cleanly
    destroyAudio();

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    if (isBinaural) {
      const graph = createBinauralGraph(ctx, frequency, beatFreq, volume, waveType);
      oscRef.current = graph.osc1;
      osc2Ref.current = graph.osc2;
      gainRef.current = graph.gain;
      analyserRef.current = graph.analyser;
    } else {
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
    }

    onAnalyserReady(analyserRef.current);
    setIsPlaying(true);
  }, [frequency, volume, waveType, isBinaural, beatFreq, onAnalyserReady, destroyAudio]);

  const stopAudio = useCallback(() => {
    if (audioCtxRef.current) audioCtxRef.current.suspend();
    setIsPlaying(false);
  }, []);

  // Frequency updates
  useEffect(() => {
    if (oscRef.current && audioCtxRef.current) {
      oscRef.current.frequency.setTargetAtTime(frequency, audioCtxRef.current.currentTime, 0.05);
    }
    if (osc2Ref.current && audioCtxRef.current && isBinaural) {
      osc2Ref.current.frequency.setTargetAtTime(frequency + beatFreq, audioCtxRef.current.currentTime, 0.05);
    }
  }, [frequency, beatFreq, isBinaural]);

  // Beat frequency update
  useEffect(() => {
    if (osc2Ref.current && audioCtxRef.current && isBinaural) {
      osc2Ref.current.frequency.setTargetAtTime(frequency + beatFreq, audioCtxRef.current.currentTime, 0.05);
    }
  }, [beatFreq, frequency, isBinaural]);

  // Volume updates
  useEffect(() => {
    if (gainRef.current && audioCtxRef.current) {
      gainRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.05);
    }
  }, [volume]);

  // Wave type — requires rebuild if playing
  useEffect(() => {
    if (oscRef.current) oscRef.current.type = waveType;
    if (osc2Ref.current) osc2Ref.current.type = waveType;
  }, [waveType]);

  // Binaural toggle — restart audio to rebuild graph
  useEffect(() => {
    if (isPlaying) {
      startAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBinaural]);

  // Cleanup on unmount
  useEffect(() => {
    return () => destroyAudio();
  }, [destroyAudio]);

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
    <div className="space-y-4">
      {/* Play button + wave type */}
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <button
          onClick={() => isPlaying ? stopAudio() : startAudio()}
          className="px-5 py-2 rounded-full text-xs font-medium tracking-widest uppercase transition-all duration-300"
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
            className="px-2.5 py-1 rounded-md text-[9px] uppercase tracking-wider transition-all"
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
          <span>20 Hz</span>
          <span style={{ color: accent }}>Frequency: {frequency} Hz</span>
          <span>4000 Hz</span>
        </div>
        <input
          type="range" min={20} max={4000} step={1} value={frequency}
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
          type="range" min={0} max={0.5} step={0.01} value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: "#665f80" }}
        />
      </div>

      {/* ── Binaural Beats ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] tracking-[3px] text-[#665f80] uppercase">Binaural Beats</p>
          <button
            onClick={() => setIsBinaural(!isBinaural)}
            className="px-3 py-1 rounded-full text-[8px] uppercase tracking-wider transition-all"
            style={{
              background: isBinaural ? `${accent}25` : "transparent",
              color: isBinaural ? accent : "#554f70",
              border: `1px solid ${isBinaural ? accent + "60" : "#1a1728"}`,
            }}
          >
            {isBinaural ? "On" : "Off"}
          </button>
        </div>

        {isBinaural && (
          <div className="space-y-2">
            {/* Beat frequency slider */}
            <div>
              <div className="flex justify-between text-[8px] text-[#665f80] mb-0.5 tracking-wider">
                <span>1 Hz</span>
                <span style={{ color: accent }}>Beat: {beatFreq} Hz</span>
                <span>40 Hz</span>
              </div>
              <input
                type="range" min={1} max={40} step={0.5} value={beatFreq}
                onChange={(e) => { setBeatFreq(Number(e.target.value)); setBinauralPreset(-1); }}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: accent }}
              />
            </div>

            {/* Brainwave presets */}
            <div className="flex gap-1">
              {BINAURAL_PRESETS.map((bp, i) => (
                <button
                  key={bp.label}
                  onClick={() => { setBeatFreq(bp.beatFreq); setBinauralPreset(i); }}
                  className="flex-1 py-1.5 rounded text-center transition-all"
                  style={{
                    background: binauralPreset === i ? `${accent}18` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${binauralPreset === i ? accent + "50" : "#1a1728"}`,
                    color: binauralPreset === i ? accent : "#665f80",
                  }}
                >
                  <div className="text-[8px] font-medium">{bp.label}</div>
                  <div className="text-[7px] opacity-60">{bp.beatFreq}Hz</div>
                </button>
              ))}
            </div>

            <p className="text-[7px] text-[#4a4560] text-center tracking-wider">
              Use headphones for binaural effect
            </p>
          </div>
        )}
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
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15].map((v) => (
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
});

export default ToneGenerator;
