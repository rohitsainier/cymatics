"use client";

const MODES = [
  { id: "tone", label: "Tone", icon: "M9 18V5l12-2v13M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  { id: "mic", label: "Microphone", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" },
  { id: "file", label: "Audio File", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 12l4 4M14 12l-4 4" },
  { id: "samples", label: "Samples", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
];

export default function ModeSelector({ activeMode, onModeChange, accentColor }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-[#0d0b15] border border-[#1a1728]">
      {MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[11px] tracking-wider transition-all duration-300"
            style={{
              background: isActive ? `${accentColor}15` : "transparent",
              color: isActive ? accentColor : "#665f80",
              borderBottom: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={mode.icon} />
            </svg>
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
