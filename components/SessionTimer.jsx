"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { SESSION_PRESETS, getTotalDuration, formatTime } from "@/lib/sessionPresets";

function playBell(audioCtx) {
  if (!audioCtx || audioCtx.state === "closed") return;
  const osc = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc2.type = "sine";
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc2.frequency.setValueAtTime(1320, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc2.start();
  osc.stop(audioCtx.currentTime + 2.5);
  osc2.stop(audioCtx.currentTime + 2.5);
}

export default function SessionTimer({ toneRef, onFrequencyChange, onModesChange, onClose, accentColor }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepTimeLeft, setStepTimeLeft] = useState(0);
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [completed, setCompleted] = useState(false);

  const tickRef = useRef(null);

  const startSession = useCallback((preset) => {
    if (!toneRef?.current) return;
    const step = preset.steps[0];
    toneRef.current.setFreq(step.freq);
    toneRef.current.setVol(0.25);
    toneRef.current.play();
    onFrequencyChange(step.freq);
    onModesChange(step.n, step.m);

    setSelectedPreset(preset);
    setCurrentStep(0);
    setStepTimeLeft(step.duration);
    setTotalTimeLeft(getTotalDuration(preset));
    setIsRunning(true);
    setCompleted(false);
  }, [toneRef, onFrequencyChange, onModesChange]);

  const stopSession = useCallback(() => {
    if (toneRef?.current) toneRef.current.stop();
    if (tickRef.current) clearInterval(tickRef.current);
    setIsRunning(false);
    setSelectedPreset(null);
    setCurrentStep(0);
  }, [toneRef]);

  // Main timer tick
  useEffect(() => {
    if (!isRunning || !selectedPreset) return;

    tickRef.current = setInterval(() => {
      setStepTimeLeft((prev) => {
        if (prev <= 1) {
          // Step complete — move to next step or finish
          const nextIdx = currentStep + 1;
          if (nextIdx >= selectedPreset.steps.length) {
            // Session complete
            clearInterval(tickRef.current);
            setIsRunning(false);
            setCompleted(true);
            if (toneRef?.current) toneRef.current.stop();
            // Play bell — get audio context from tone generator
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              playBell(ctx);
              setTimeout(() => ctx.close(), 3000);
            } catch {}
            return 0;
          }

          // Transition to next step
          const next = selectedPreset.steps[nextIdx];
          setCurrentStep(nextIdx);
          if (toneRef?.current) {
            toneRef.current.setFreq(next.freq);
          }
          onFrequencyChange(next.freq);
          onModesChange(next.n, next.m);
          return next.duration;
        }
        return prev - 1;
      });

      setTotalTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isRunning, selectedPreset, currentStep, toneRef, onFrequencyChange, onModesChange]);

  const accentDim = accentColor.replace("75%", "50%").replace("60%", "25%");
  const step = selectedPreset?.steps[currentStep];
  const progress = step ? 1 - stepTimeLeft / step.duration : 0;
  const totalProgress = selectedPreset ? 1 - totalTimeLeft / getTotalDuration(selectedPreset) : 0;

  // Preset selection view
  if (!isRunning && !completed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[9px] tracking-[3px] text-[#665f80] uppercase">Guided Sessions</p>
          <button onClick={onClose} className="text-[8px] text-[#554f70] hover:text-[#8880a0]">Back</button>
        </div>

        <div className="space-y-2">
          {SESSION_PRESETS.map((preset) => {
            const totalMin = Math.round(getTotalDuration(preset) / 60);
            return (
              <button
                key={preset.id}
                onClick={() => startSession(preset)}
                className="w-full rounded-lg px-3 py-3 text-left transition-all hover:border-opacity-60"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid #1a1728`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium" style={{ color: accentColor }}>{preset.name}</span>
                  <span className="text-[9px] text-[#665f80] tabular-nums">{totalMin} min</span>
                </div>
                <p className="text-[9px] text-[#665f80]">{preset.desc}</p>
                <div className="flex gap-1 mt-2">
                  {preset.steps.map((s, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full flex-1"
                      style={{ background: `${accentColor}30` }}
                      title={s.label}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Completed view
  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ border: `2px solid #6bcb77`, color: "#6bcb77" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <p className="text-sm" style={{ color: accentColor }}>Session Complete</p>
        <p className="text-[9px] text-[#665f80]">{selectedPreset?.name}</p>
        <button
          onClick={() => { setCompleted(false); setSelectedPreset(null); }}
          className="px-4 py-1.5 rounded-full text-[9px] tracking-wider"
          style={{ border: `1px solid ${accentDim}`, color: accentColor }}
        >
          New Session
        </button>
      </div>
    );
  }

  // Active session view
  return (
    <div className="flex flex-col items-center py-4 space-y-4">
      {/* Circular progress */}
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Background circle */}
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1728" strokeWidth="3" />
          {/* Progress arc */}
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={accentColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${progress * 264} 264`}
            className="transition-all duration-1000"
          />
          {/* Total progress (outer) */}
          <circle cx="50" cy="50" r="46" fill="none" stroke={`${accentColor}20`} strokeWidth="1" />
          <circle
            cx="50" cy="50" r="46" fill="none"
            stroke={`${accentColor}50`}
            strokeWidth="1"
            strokeDasharray={`${totalProgress * 289} 289`}
            className="transition-all duration-1000"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-light tabular-nums" style={{ color: accentColor }}>
            {formatTime(stepTimeLeft)}
          </span>
          <span className="text-[9px] text-[#665f80] mt-1">{step?.label}</span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1 w-full max-w-[200px]">
        {selectedPreset.steps.map((s, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full flex-1 transition-all"
            style={{
              background: i < currentStep ? accentColor
                : i === currentStep ? `${accentColor}80`
                : "#1a1728",
            }}
          />
        ))}
      </div>

      {/* Info */}
      <div className="text-center">
        <p className="text-[10px]" style={{ color: accentColor }}>{selectedPreset.name}</p>
        <p className="text-[8px] text-[#665f80] mt-0.5">
          Step {currentStep + 1}/{selectedPreset.steps.length} · Total: {formatTime(totalTimeLeft)}
        </p>
      </div>

      {/* Stop button */}
      <button
        onClick={stopSession}
        className="px-5 py-2 rounded-full text-[10px] tracking-widest uppercase"
        style={{ border: `1px solid #ff444460`, color: "#ff4444" }}
      >
        End Session
      </button>
    </div>
  );
}
