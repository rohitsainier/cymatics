"use client";
import { useState } from "react";
import { frequencyToModes, LAYER_PRESETS } from "@/lib/chladni";

export default function FrequencyLayers({ layers, onLayersChange, accentColor }) {
  const [isMulti, setIsMulti] = useState(layers && layers.length > 1);

  const accentDim = accentColor.replace("75%", "50%").replace("60%", "25%");

  const toggleMulti = () => {
    if (isMulti) {
      setIsMulti(false);
      onLayersChange(null);
    } else {
      setIsMulti(true);
      onLayersChange([
        { freq: 528, n: 5, m: 2, weight: 0.5 },
        { freq: 432, n: 4, m: 3, weight: 0.5 },
      ]);
    }
  };

  const updateLayer = (idx, field, value) => {
    if (!layers) return;
    const next = [...layers];
    next[idx] = { ...next[idx], [field]: value };
    if (field === "freq") {
      const modes = frequencyToModes(value);
      next[idx].n = modes.n;
      next[idx].m = modes.m;
    }
    onLayersChange(next);
  };

  const addLayer = () => {
    if (!layers || layers.length >= 3) return;
    onLayersChange([...layers, { freq: 396, n: 3, m: 2, weight: 0.33 }]);
  };

  const removeLayer = (idx) => {
    if (!layers || layers.length <= 2) return;
    onLayersChange(layers.filter((_, i) => i !== idx));
  };

  const selectPreset = (preset) => {
    setIsMulti(true);
    onLayersChange(preset.layers.map((l) => ({ ...l })));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] tracking-[3px] text-[#665f80] uppercase">Layers</p>
        <button
          onClick={toggleMulti}
          className="px-3 py-1 rounded-full text-[8px] uppercase tracking-wider transition-all"
          style={{
            background: isMulti ? `${accentColor}25` : "transparent",
            color: isMulti ? accentColor : "#554f70",
            border: `1px solid ${isMulti ? accentColor + "60" : "#1a1728"}`,
          }}
        >
          {isMulti ? "Multi" : "Single"}
        </button>
      </div>

      {isMulti && layers && (
        <div className="space-y-2">
          {/* Layer rows */}
          {layers.map((layer, i) => (
            <div key={i} className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1728" }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] text-[#665f80]">Layer {i + 1}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] tabular-nums" style={{ color: accentColor }}>{layer.freq} Hz</span>
                  {layers.length > 2 && (
                    <button
                      onClick={() => removeLayer(i)}
                      className="text-[8px] text-[#554f70] hover:text-red-400 transition-colors"
                    >
                      x
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range" min={100} max={2000} step={1} value={layer.freq}
                onChange={(e) => updateLayer(i, "freq", Number(e.target.value))}
                className="w-full h-0.5 rounded-full appearance-none cursor-pointer mb-1"
                style={{ accentColor }}
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[7px] text-[#554f70] w-10">Weight</span>
                <input
                  type="range" min={0.1} max={1} step={0.05} value={layer.weight}
                  onChange={(e) => updateLayer(i, "weight", Number(e.target.value))}
                  className="flex-1 h-0.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "#665f80" }}
                />
                <span className="text-[7px] text-[#554f70] tabular-nums w-6 text-right">
                  {Math.round(layer.weight * 100)}%
                </span>
              </div>
            </div>
          ))}

          {/* Add layer button */}
          {layers.length < 3 && (
            <button
              onClick={addLayer}
              className="w-full py-1.5 rounded text-[8px] text-[#554f70] tracking-wider transition-colors"
              style={{ border: "1px dashed #1a1728" }}
            >
              + Add Layer
            </button>
          )}

          {/* Layer presets */}
          <div className="pt-1">
            <p className="text-[7px] text-[#554f70] uppercase tracking-wider mb-1">Presets</p>
            <div className="grid grid-cols-2 gap-1">
              {LAYER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => selectPreset(preset)}
                  className="rounded px-2 py-1.5 text-left transition-all"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1728", color: "#8880a0" }}
                >
                  <div className="text-[8px] font-medium">{preset.label}</div>
                  <div className="text-[7px] text-[#554f70]">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
