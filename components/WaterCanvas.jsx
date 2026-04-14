"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { chladniValue, besselValue, multiValue, PLATE_SIZE } from "@/lib/chladni";
import { getAmplitude } from "@/lib/audioAnalysis";

const RES = 500; // Render resolution (matches PLATE_SIZE)
const GRID = 250; // Height map grid (higher = more detail, max perf sweet spot)
const CELL = RES / GRID;

const WaterCanvas = forwardRef(function WaterCanvas({
  frequency, n, m, isActive, analyser, zoom = 1,
  plateShape = "rectangular", layers = null,
}, ref) {
  const canvasRef = useRef(null);
  useImperativeHandle(ref, () => canvasRef.current);

  const animRef = useRef(null);
  const nRef = useRef(n);
  const mRef = useRef(m);
  const freqRef = useRef(frequency);
  const activeRef = useRef(isActive);
  const analyserRef = useRef(analyser);
  const zoomRef = useRef(zoom);
  const plateRef = useRef(plateShape);
  const layersRef = useRef(layers);

  useEffect(() => { nRef.current = n; }, [n]);
  useEffect(() => { mRef.current = m; }, [m]);
  useEffect(() => { freqRef.current = frequency; }, [frequency]);
  useEffect(() => { activeRef.current = isActive; }, [isActive]);
  useEffect(() => { analyserRef.current = analyser; }, [analyser]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { plateRef.current = plateShape; }, [plateShape]);
  useEffect(() => { layersRef.current = layers; }, [layers]);

  function getField(x, y, cn, cm, cz) {
    const ls = layersRef.current;
    const shape = plateRef.current;
    if (ls && ls.length > 1) return multiValue(x, y, ls, shape, cz);
    if (shape === "circular") return besselValue(x, y, cn, cm, cz);
    return chladniValue(x, y, cn, cm, 1, cz);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // NO DPR scaling — putImageData writes raw pixels, CSS handles display scaling
    canvas.width = RES;
    canvas.height = RES;

    const heightMap = new Float32Array(GRID * GRID);
    const imageData = ctx.createImageData(RES, RES);
    const data = imageData.data;

    let time = 0;

    const animate = () => {
      time += 0.016;
      const cn = nRef.current;
      const cm = mRef.current;
      const cz = zoomRef.current;
      const freq = freqRef.current;

      let amp = 0.6;
      if (analyserRef.current && activeRef.current) amp = getAmplitude(analyserRef.current);

      // Compute height map
      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          const px = gx * CELL + CELL * 0.5;
          const py = gy * CELL + CELL * 0.5;
          const val = getField(px, py, cn, cm, cz);
          const ripple = activeRef.current ? Math.sin(time * 4 + val * 5) * 0.12 * amp : 0;
          heightMap[gy * GRID + gx] = val * amp + ripple;
        }
      }

      // Light direction (normalized)
      const lx = -0.35, ly = -0.55, lz = 0.76;

      // Hue from frequency for tinting
      const hueRad = ((freq / 10) % 360) * Math.PI / 180;

      // Render each pixel
      for (let py = 0; py < RES; py++) {
        const gy = Math.min(GRID - 2, Math.floor(py / CELL));
        const fy = (py / CELL) - gy; // fractional position within grid cell

        for (let px = 0; px < RES; px++) {
          const gx = Math.min(GRID - 2, Math.floor(px / CELL));
          const fx = (px / CELL) - gx;
          const idx = gy * GRID + gx;

          // Bilinear interpolation of height
          const h00 = heightMap[idx];
          const h10 = heightMap[idx + 1];
          const h01 = heightMap[idx + GRID];
          const h11 = heightMap[idx + GRID + 1];
          const h = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;

          // Normal from height gradient (central differences)
          const hL = gx > 0 ? heightMap[idx - 1] : h00;
          const hR = heightMap[idx + 1];
          const hU = gy > 0 ? heightMap[idx - GRID] : h00;
          const hD = heightMap[idx + GRID];

          const nx = (hL - hR) * 4;
          const ny = (hU - hD) * 4;
          const nz = 1;
          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
          const nnx = nx / nLen, nny = ny / nLen, nnz = nz / nLen;

          // Diffuse lighting
          const diffuse = Math.max(0, nnx * lx + nny * ly + nnz * lz);

          // Specular (Blinn-Phong)
          const hx = lx, hy = ly, hz = lz + 1; // half-vector (view = 0,0,1)
          const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
          const specDot = Math.max(0, (nnx * hx + nny * hy + nnz * hz) / hLen);
          const specular = Math.pow(specDot, 32) * 1.5;

          // Fresnel — edges reflect more (darker water at steep angles)
          const fresnel = 1 - Math.pow(nnz, 1.5);

          const absH = Math.abs(h);

          // Deep ocean color palette
          const depth = 0.25 + diffuse * 0.45;
          const tint = Math.cos(hueRad) * 0.12;

          let r = (5 + tint * 20) * depth + absH * 12;
          let g = (18 + tint * 10) * depth + absH * 25;
          let b = (42 - tint * 15) * depth + absH * 15;

          // Ambient occlusion in valleys
          const ao = 0.7 + 0.3 * Math.min(1, absH * 2);
          r *= ao;
          g *= ao;
          b *= ao;

          // Fresnel darkening at grazing angles
          r = r * (1 - fresnel * 0.4);
          g = g * (1 - fresnel * 0.3);
          b = b * (1 - fresnel * 0.15);

          // Specular highlights (white-ish with slight color)
          r += specular * 180;
          g += specular * 195;
          b += specular * 210;

          // Caustic glow on nodal lines (where h ≈ 0)
          if (absH < 0.2) {
            const caustic = (1 - absH / 0.2);
            const causticPulse = 0.7 + 0.3 * Math.sin(time * 2 + px * 0.05 + py * 0.05);
            const ci = caustic * causticPulse * 45;
            r += ci * 0.5;
            g += ci * 0.9;
            b += ci * 0.6;
          }

          // High point shimmer
          if (h > 0.4) {
            const shimmer = (h - 0.4) * 30;
            r += shimmer * 0.3;
            g += shimmer * 0.5;
            b += shimmer * 0.2;
          }

          const pidx = (py * RES + px) * 4;
          data[pidx] = Math.min(255, Math.max(0, r));
          data[pidx + 1] = Math.min(255, Math.max(0, g));
          data[pidx + 2] = Math.min(255, Math.max(0, b));
          data[pidx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        borderRadius: plateShape === "circular" ? "50%" : 8,
        touchAction: "none",
        imageRendering: "auto",
      }}
    />
  );
});

export default WaterCanvas;
