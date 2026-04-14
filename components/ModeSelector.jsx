"use client";

const MODES = [
  { id: "tone", label: "Tone", shortcut: "1", icon: "M9 18V5l12-2v13M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  { id: "mic", label: "Microphone", shortcut: "2", icon: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" },
  { id: "file", label: "Audio File", shortcut: "3", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M10 12l4 4M14 12l-4 4" },
  { id: "samples", label: "Samples", shortcut: "4", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
];

// Vertical icon sidebar for desktop
export function VerticalModeSelector({ activeMode, onModeChange, accentColor }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      {MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            title={mode.label}
            className="relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group"
            style={{
              background: isActive ? `${accentColor}18` : "transparent",
              color: isActive ? accentColor : "#554f70",
              borderLeft: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={mode.icon} />
            </svg>
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 rounded text-[9px] tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
              style={{ background: "#1a1728", color: isActive ? accentColor : "#8880a0", border: "1px solid #2a2540" }}>
              {mode.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Horizontal tabs for mobile
export default function ModeSelector({ activeMode, onModeChange, accentColor }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-[#0d0b15] border border-[#1a1728]">
      {MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[10px] tracking-wider transition-all duration-300"
            style={{
              background: isActive ? `${accentColor}15` : "transparent",
              color: isActive ? accentColor : "#665f80",
              borderBottom: isActive ? `2px solid ${accentColor}` : "2px solid transparent",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={mode.icon} />
            </svg>
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
