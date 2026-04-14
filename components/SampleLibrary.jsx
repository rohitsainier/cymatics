"use client";
import { useState, useRef, useCallback, useEffect } from "react";

const SAMPLES = [
  {
    id: "om",
    name: "Om (AUM)",
    freq: 136.1,
    n: 2,
    m: 1,
    image: "/samples/om-n2m1.png",
    description: "The primordial sound. 136.1 Hz matches the Earth's year frequency.",
    harmonics: [1, 2, 3, 5],
    amplitudes: [1, 0.6, 0.35, 0.15],
    color: "#e8a838",
  },
  {
    id: "crystal",
    name: "Crystal Bowl C",
    freq: 256,
    n: 3,
    m: 1,
    image: "/samples/crystal-n3m1.png",
    description: "Pure C note from a quartz crystal singing bowl. Clean overtones.",
    harmonics: [1, 2, 4],
    amplitudes: [1, 0.3, 0.1],
    color: "#38e8d0",
  },
  {
    id: "tibetan",
    name: "Tibetan Bowl",
    freq: 333,
    n: 3,
    m: 2,
    image: "/samples/tibetan-n3m2.png",
    description: "Hand-hammered Tibetan singing bowl. Rich, warm harmonics.",
    harmonics: [1, 2.67, 4.2, 5.8],
    amplitudes: [1, 0.5, 0.3, 0.2],
    color: "#d4a038",
  },
  {
    id: "natural",
    name: "432 Hz Natural A",
    freq: 432,
    n: 4,
    m: 3,
    image: "/samples/natural-n4m3.png",
    description: "Verdi tuning. Said to resonate with the natural vibration of the universe.",
    harmonics: [1, 2, 3, 4],
    amplitudes: [1, 0.5, 0.25, 0.12],
    color: "#68d838",
  },
  {
    id: "miracle",
    name: "528 Hz Miracle",
    freq: 528,
    n: 5,
    m: 2,
    image: "/samples/miracle-n5m2.png",
    description: "The \"Love\" frequency. Solfeggio tone associated with transformation.",
    harmonics: [1, 2, 3],
    amplitudes: [1, 0.4, 0.2],
    color: "#38d868",
  },
  {
    id: "heart",
    name: "639 Hz Heart",
    freq: 639,
    n: 5,
    m: 3,
    image: "/samples/heart-n5m3.png",
    description: "Solfeggio heart frequency. Harmonizing and connecting.",
    harmonics: [1, 2, 3, 5],
    amplitudes: [1, 0.45, 0.25, 0.1],
    color: "#e83888",
  },
  {
    id: "throat",
    name: "741 Hz Throat",
    freq: 741,
    n: 6,
    m: 2,
    image: "/samples/throat-n6m2.png",
    description: "Solfeggio expression frequency. Clarity and awakening intuition.",
    harmonics: [1, 2, 3],
    amplitudes: [1, 0.35, 0.15],
    color: "#3888e8",
  },
  {
    id: "crown",
    name: "963 Hz Crown",
    freq: 963,
    n: 7,
    m: 4,
    image: "/samples/crown-n7m4.png",
    description: "Highest Solfeggio tone. Spiritual connection and oneness.",
    harmonics: [1, 2, 3, 4],
    amplitudes: [1, 0.5, 0.3, 0.15],
    color: "#b838e8",
  },
];

export default function SampleLibrary({ onFrequencyChange, onModesChange, onActiveChange, onAnalyserReady }) {
  const [playingId, setPlayingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const audioCtxRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const gainRef = useRef(null);
  const analyserRef = useRef(null);

  const stopCurrent = useCallback(() => {
    oscillatorsRef.current.forEach((osc) => {
      try { osc.stop(); } catch {}
    });
    oscillatorsRef.current = [];
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setPlayingId(null);
    onActiveChange(false);
    onAnalyserReady(null);
  }, [onActiveChange, onAnalyserReady]);

  const playSample = useCallback((sample) => {
    // Stop any currently playing sample
    if (playingId) stopCurrent();

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.25, ctx.currentTime);
    gainRef.current = masterGain;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    // Create oscillators with harmonics for a rich sound
    const oscs = [];
    sample.harmonics.forEach((harmonic, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = i === 0 ? "sine" : "sine";
      osc.frequency.setValueAtTime(sample.freq * harmonic, ctx.currentTime);

      // Slight detuning for warmth (except fundamental)
      if (i > 0) {
        osc.detune.setValueAtTime((Math.random() - 0.5) * 4, ctx.currentTime);
      }

      const amp = sample.amplitudes[i] || 0.1;
      // Soft attack envelope
      oscGain.gain.setValueAtTime(0, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(amp * 0.25, ctx.currentTime + 0.3);

      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
      oscs.push(osc);
    });

    oscillatorsRef.current = oscs;
    setPlayingId(sample.id);
    setSelectedId(sample.id);

    onFrequencyChange(Math.round(sample.freq));
    onModesChange(sample.n, sample.m);
    onActiveChange(true);
    onAnalyserReady(analyser);
  }, [playingId, stopCurrent, onFrequencyChange, onModesChange, onActiveChange, onAnalyserReady]);

  const toggleSample = useCallback((sample) => {
    if (playingId === sample.id) {
      stopCurrent();
    } else {
      playSample(sample);
    }
  }, [playingId, stopCurrent, playSample]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCurrent();
  }, [stopCurrent]);

  const selected = SAMPLES.find((s) => s.id === selectedId) || SAMPLES[0];

  return (
    <div className="space-y-5">
      {/* Selected sample detail */}
      <div
        className="rounded-xl p-4 border transition-all"
        style={{
          background: `${selected.color}08`,
          borderColor: `${selected.color}30`,
        }}
      >
        <div className="flex gap-4 items-start">
          {/* Reference pattern image */}
          <div className="shrink-0">
            <div
              className="w-24 h-24 rounded-lg overflow-hidden border"
              style={{ borderColor: `${selected.color}40` }}
            >
              <img
                src={selected.image}
                alt={`${selected.name} pattern`}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[8px] text-[#665f80] text-center mt-1 tracking-wider uppercase">
              Expected
            </p>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium" style={{ color: selected.color }}>
                {selected.name}
              </h3>
              <span className="text-[10px] text-[#665f80] tabular-nums">
                {selected.freq} Hz
              </span>
            </div>
            <p className="text-[10px] text-[#8880a0] leading-relaxed mb-2">
              {selected.description}
            </p>
            <div className="flex gap-3 text-[9px] text-[#665f80]">
              <span>Mode: n={selected.n} m={selected.m}</span>
              <span>Harmonics: {selected.harmonics.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sample grid */}
      <div>
        <p className="text-[9px] tracking-[3px] text-[#665f80] uppercase text-center mb-3">
          Sacred Sound Library
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SAMPLES.map((sample) => {
            const isPlaying = playingId === sample.id;
            const isSelected = selectedId === sample.id;
            return (
              <button
                key={sample.id}
                onClick={() => toggleSample(sample)}
                onMouseEnter={() => { if (!playingId) setSelectedId(sample.id); }}
                className="relative rounded-lg overflow-hidden transition-all text-left group"
                style={{
                  border: `1px solid ${isSelected ? sample.color + "60" : "#1a1728"}`,
                  background: isPlaying ? `${sample.color}15` : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-center gap-2.5 p-2.5">
                  {/* Mini pattern preview */}
                  <div
                    className="w-10 h-10 rounded shrink-0 overflow-hidden opacity-70 group-hover:opacity-100 transition-opacity"
                    style={{ border: `1px solid ${sample.color}25` }}
                  >
                    <img
                      src={sample.image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      {isPlaying && (
                        <span className="flex gap-[2px] items-end h-3">
                          {[1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className="w-[3px] rounded-sm animate-pulse"
                              style={{
                                background: sample.color,
                                height: `${6 + Math.random() * 6}px`,
                                animationDelay: `${i * 0.15}s`,
                              }}
                            />
                          ))}
                        </span>
                      )}
                      <span
                        className="text-[10px] font-medium truncate"
                        style={{ color: isSelected ? sample.color : "#8880a0" }}
                      >
                        {sample.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-[#554f70] tabular-nums">
                      {sample.freq} Hz
                    </span>
                  </div>
                </div>

                {/* Playing indicator bar */}
                {isPlaying && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: sample.color }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <p className="text-[9px] text-[#4a4560] text-center leading-relaxed">
        Tap a sound to play. Compare the live particle pattern above with the reference image.
        The nodal line structure should match.
      </p>
    </div>
  );
}
