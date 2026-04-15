"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  chladniValue, chladniGradient, besselValue, besselGradient,
  multiValue, multiGradient, PLATE_SIZE,
} from "@/lib/chladni";
import { getAmplitude } from "@/lib/audioAnalysis";

const HALF = PLATE_SIZE / 2;
const PARTICLE_COUNT = 15000;
const PLATE_WORLD = 5;
const PLATE_HALF = PLATE_WORLD / 2;

function plateToWorld(px, pz) {
  return [
    (px / PLATE_SIZE) * PLATE_WORLD - PLATE_HALF,
    (pz / PLATE_SIZE) * PLATE_WORLD - PLATE_HALF,
  ];
}

// Soft circle sprite texture
function createSpriteTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.2, "rgba(255,255,255,0.8)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.3)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// Beautiful random color palette — pastels, neons, warm tones
const COLOR_PALETTES = [
  // Pastel dreams
  [0.95, 0.6, 0.7], [0.6, 0.85, 0.95], [0.75, 0.6, 0.95],
  [0.95, 0.85, 0.6], [0.6, 0.95, 0.75], [0.95, 0.7, 0.9],
  // Neon glow
  [1.0, 0.2, 0.5], [0.2, 0.8, 1.0], [0.5, 0.2, 1.0],
  [1.0, 0.8, 0.1], [0.1, 1.0, 0.6], [1.0, 0.4, 0.1],
  // Warm sunset
  [1.0, 0.55, 0.3], [0.95, 0.35, 0.45], [1.0, 0.75, 0.4],
  // Cool aurora
  [0.3, 0.9, 0.7], [0.4, 0.5, 1.0], [0.7, 0.3, 0.9],
];

function randomColor() {
  const c = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
  // Add slight variation
  return [
    Math.min(1, c[0] + (Math.random() - 0.5) * 0.15),
    Math.min(1, c[1] + (Math.random() - 0.5) * 0.15),
    Math.min(1, c[2] + (Math.random() - 0.5) * 0.15),
  ];
}

const ThreeCanvas = forwardRef(function ThreeCanvas({
  frequency, n, m, isActive, analyser, zoom = 1, onZoomChange,
  plateShape = "rectangular", layers = null,
}, ref) {
  const containerRef = useRef(null);
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
  const particleState = useRef(null);
  const kickRef = useRef(0);

  useEffect(() => { nRef.current = n; }, [n]);
  useEffect(() => { mRef.current = m; }, [m]);
  useEffect(() => { freqRef.current = frequency; }, [frequency]);
  useEffect(() => { activeRef.current = isActive; }, [isActive]);
  useEffect(() => { analyserRef.current = analyser; }, [analyser]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { plateRef.current = plateShape; }, [plateShape]);
  useEffect(() => { layersRef.current = layers; }, [layers]);

  function fieldValue(x, y, cn, cm, cz) {
    const ls = layersRef.current;
    const shape = plateRef.current;
    if (ls && ls.length > 1) return multiValue(x, y, ls, shape, cz);
    if (shape === "circular") return besselValue(x, y, cn, cm, cz);
    return chladniValue(x, y, cn, cm, 1, cz);
  }

  function fieldGradient(x, y, cn, cm, cz) {
    const ls = layersRef.current;
    const shape = plateRef.current;
    if (ls && ls.length > 1) return multiGradient(x, y, ls, shape, cz);
    if (shape === "circular") return besselGradient(x, y, cn, cm, cz);
    return chladniGradient(x, y, cn, cm, 1, cz);
  }

  function initParticles() {
    const ps = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const col = randomColor();
      ps.push({
        x: Math.random() * PLATE_SIZE,
        z: Math.random() * PLATE_SIZE,
        vx: 0, vz: 0,
        // Y floats freely — no surface
        wy: (Math.random() - 0.5) * 0.5,
        vy: 0,
        size: 0.8 + Math.random() * 1.5,
        brightness: 0.5 + Math.random() * 0.5,
        r: col[0], g: col[1], b: col[2],
        phase: Math.random() * Math.PI * 2,
      });
    }
    return ps;
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030208, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height) || 500;
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030208, 0.06);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 3.5, 5.5);
    camera.lookAt(0, 0, 0);

    // ── Controls — smooth auto-rotate ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;

    // ── Particles ──
    const ps = initParticles();
    particleState.current = ps;

    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    // Initialize positions
    for (let i = 0; i < ps.length; i++) {
      const [wx, wz] = plateToWorld(ps[i].x, ps[i].z);
      positions[i * 3] = wx;
      positions[i * 3 + 1] = ps[i].wy;
      positions[i * 3 + 2] = wz;
      colors[i * 3] = ps[i].r;
      colors[i * 3 + 1] = ps[i].g;
      colors[i * 3 + 2] = ps[i].b;
      sizes[i] = 0.04;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const spriteTexture = createSpriteTexture();

    const particleMat = new THREE.PointsMaterial({
      size: 0.07,
      map: spriteTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const points = new THREE.Points(particleGeo, particleMat);
    scene.add(points);

    // ── Kick / scatter ──
    renderer.domElement.__kick = () => {
      kickRef.current = 1.0;
      const pState = particleState.current;
      if (!pState) return;
      for (let i = 0; i < pState.length; i++) {
        const p = pState[i];
        const angle = Math.random() * Math.PI * 2;
        const force = 1.5 + Math.random() * 3;
        p.vx += Math.cos(angle) * force;
        p.vz += Math.sin(angle) * force;
        p.vy += (Math.random() - 0.5) * 4;
      }
    };

    renderer.domElement.__scatter = () => {
      const pState = particleState.current;
      if (!pState) return;
      for (let i = 0; i < pState.length; i++) {
        const p = pState[i];
        p.x = Math.random() * PLATE_SIZE;
        p.z = Math.random() * PLATE_SIZE;
        p.wy = (Math.random() - 0.5) * 2;
        p.vx = 0; p.vz = 0; p.vy = 0;
        const col = randomColor();
        p.r = col[0]; p.g = col[1]; p.b = col[2];
      }
    };

    // ── Resize ──
    const handleResize = () => {
      const r = container.getBoundingClientRect();
      const s = Math.min(r.width, r.height) || 500;
      renderer.setSize(s, s);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let time = 0;
    const prevN = { current: nRef.current };
    const prevM = { current: mRef.current };

    // ── Animation loop ──
    const animate = () => {
      time += 0.016;
      const cn = nRef.current;
      const cm = mRef.current;
      const cz = zoomRef.current;
      const isCirc = plateRef.current === "circular";
      const pState = particleState.current;

      // Gentle kick on pattern change
      if (cn !== prevN.current || cm !== prevM.current) {
        prevN.current = cn;
        prevM.current = cm;
        if (pState) {
          for (let i = 0; i < pState.length; i++) {
            const p = pState[i];
            p.vx += (Math.random() - 0.5) * 2;
            p.vz += (Math.random() - 0.5) * 2;
            p.vy += (Math.random() - 0.5) * 1.5;
          }
        }
      }

      let amp = 0.6;
      if (analyserRef.current && activeRef.current) {
        amp = getAmplitude(analyserRef.current);
      }

      const speed = activeRef.current ? 0.6 : 0.12;
      kickRef.current *= 0.96;

      // ── Update particles ──
      if (pState) {
        const posAttr = particleGeo.attributes.position;
        const colAttr = particleGeo.attributes.color;
        const sizeAttr = particleGeo.attributes.size;

        for (let i = 0; i < pState.length; i++) {
          const p = pState[i];

          // Cymatics field force — attract to nodal lines
          const val = fieldValue(p.x, p.z, cn, cm, cz);
          const [gx, gz] = fieldGradient(p.x, p.z, cn, cm, cz);
          const mag = Math.sqrt(gx * gx + gz * gz) + 0.001;

          const fx = -(val * gx / mag) * speed * amp;
          const fz = -(val * gz / mag) * speed * amp;

          // Smooth damping — soothing motion
          p.vx = p.vx * 0.92 + fx * 0.4;
          p.vz = p.vz * 0.92 + fz * 0.4;

          // Gentle jitter
          const jitter = activeRef.current ? 0.15 * amp : 0.04;
          p.vx += (Math.random() - 0.5) * jitter;
          p.vz += (Math.random() - 0.5) * jitter;

          p.x += p.vx;
          p.z += p.vz;

          // Y: float gently based on field value — particles hover at different heights
          const targetY = val * 0.8 * amp;
          const breathe = Math.sin(time * 0.8 + p.phase) * 0.08 * amp;
          p.vy += (targetY + breathe - p.wy) * 0.03;
          p.vy *= 0.92;
          p.wy += p.vy;

          // Boundary — soft wrap
          if (isCirc) {
            const dx = p.x - HALF;
            const dz = p.z - HALF;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > HALF - 2) {
              const nx = dx / dist;
              const nz = dz / dist;
              p.x = HALF + nx * (HALF - 3);
              p.z = HALF + nz * (HALF - 3);
              p.vx -= 1.2 * (p.vx * nx + p.vz * nz) * nx;
              p.vz -= 1.2 * (p.vx * nx + p.vz * nz) * nz;
            }
          } else {
            if (p.x < 0) { p.x = 0; p.vx *= -0.3; }
            if (p.x > PLATE_SIZE) { p.x = PLATE_SIZE; p.vx *= -0.3; }
            if (p.z < 0) { p.z = 0; p.vz *= -0.3; }
            if (p.z > PLATE_SIZE) { p.z = PLATE_SIZE; p.vz *= -0.3; }
          }

          // World position
          const [wx, wz] = plateToWorld(p.x, p.z);
          posAttr.setXYZ(i, wx, p.wy, wz);

          // Color: keep base color but modulate brightness by nodal proximity
          const absVal = Math.abs(val);
          const nearNode = Math.max(0, 1 - absVal * 2.5);
          const glow = 0.3 + nearNode * 0.7 * p.brightness;
          const shimmer = 0.85 + Math.sin(time * 1.5 + p.phase) * 0.15;

          colAttr.setXYZ(i,
            p.r * glow * shimmer,
            p.g * glow * shimmer,
            p.b * glow * shimmer,
          );

          // Size: larger + softer near nodal lines
          sizeAttr.setX(i, (0.03 + nearNode * 0.08) * (0.8 + amp * 0.4));
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;
      }

      controls.update();
      renderer.render(scene, camera);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      spriteTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        touchAction: "none",
        borderRadius: 8,
      }}
    />
  );
});

export default ThreeCanvas;
