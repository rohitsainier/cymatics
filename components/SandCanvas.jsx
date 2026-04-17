"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { getAmplitude } from "@/lib/audioAnalysis";
import {
  SAND_VELOCITY_GLSL,
  SAND_POSITION_GLSL,
  SAND_RENDER_VERT,
  SAND_RENDER_FRAG,
  BESSEL_ZEROS_FLAT,
  MAX_LAYERS,
} from "@/lib/shaders/sandShaders";

const PLATE_SIZE = 500;

// Auto-pick sim size based on device capability
function pickSimSize(renderer) {
  const maxTex = renderer.capabilities.maxTextureSize || 2048;
  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
  if (isMobile) return maxTex >= 2048 ? 256 : 128;
  // Desktop
  if (maxTex >= 8192) return 512; // ~262k grains
  if (maxTex >= 4096) return 384; // ~147k
  return 256;
}

// Pack up to MAX_LAYERS into a vec4[] — (n, m, weight, 0)
function packLayers(layers) {
  const packed = new Array(MAX_LAYERS).fill(null).map(() => new THREE.Vector4(0, 0, 0, 0));
  if (!layers || layers.length === 0) return { packed, count: 0 };
  const count = Math.min(layers.length, MAX_LAYERS);
  for (let i = 0; i < count; i++) {
    const L = layers[i];
    packed[i].set(L.n || 1, L.m || 1, L.weight || 1, 0);
  }
  return { packed, count };
}

const SandCanvas = forwardRef(function SandCanvas({
  frequency, n, m, isActive, analyser, zoom = 1, onZoomChange,
  plateShape = "rectangular", layers = null,
}, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  useImperativeHandle(ref, () => canvasRef.current);

  // Live prop mirrors (so the anim loop sees latest values without re-init)
  const nRef = useRef(n);
  const mRef = useRef(m);
  const zoomRef = useRef(zoom);
  const plateRef = useRef(plateShape);
  const layersRef = useRef(layers);
  const activeRef = useRef(isActive);
  const analyserRef = useRef(analyser);
  const freqRef = useRef(frequency);

  useEffect(() => { nRef.current = n; }, [n]);
  useEffect(() => { mRef.current = m; }, [m]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { plateRef.current = plateShape; }, [plateShape]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { activeRef.current = isActive; }, [isActive]);
  useEffect(() => { analyserRef.current = analyser; }, [analyser]);
  useEffect(() => { freqRef.current = frequency; }, [frequency]);

  // For pulse effects
  const kickRef = useRef(0);
  const scatterRef = useRef(0);
  const prevNMRef = useRef({ n, m });

  useEffect(() => {
    if (n !== prevNMRef.current.n || m !== prevNMRef.current.m) {
      kickRef.current = 0.8;
      prevNMRef.current = { n, m };
    }
  }, [n, m]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── Renderer
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

    // ── Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030208, 0.08);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 2.2, 3.2);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0, 0);
    controls.minDistance = 1.2;
    controls.maxDistance = 10;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;

    // ── GPGPU setup
    const SIM_SIZE = pickSimSize(renderer);
    const PARTICLE_COUNT = SIM_SIZE * SIM_SIZE;
    const gpu = new GPUComputationRenderer(SIM_SIZE, SIM_SIZE, renderer);

    // Fallback to half-float if full float not available
    if (renderer.capabilities.isWebGL2 === false) {
      gpu.setDataType(THREE.HalfFloatType);
    }

    // Init position texture — random positions in [0, PLATE_SIZE]², seeds in w
    const posTex = gpu.createTexture();
    const posData = posTex.image.data;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posData[i * 4 + 0] = Math.random() * PLATE_SIZE;
      posData[i * 4 + 1] = Math.random() * PLATE_SIZE;
      posData[i * 4 + 2] = 0; // age
      posData[i * 4 + 3] = Math.random(); // seed for color
    }

    // Init velocity texture — zero
    const velTex = gpu.createTexture();
    const velData = velTex.image.data;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      velData[i * 4 + 0] = 0;
      velData[i * 4 + 1] = 0;
      velData[i * 4 + 2] = 0; // settled flag
      velData[i * 4 + 3] = 0;
    }

    // Register variables. Velocity depends on position + old velocity; position depends on both.
    const velVar = gpu.addVariable("textureVelocity", SAND_VELOCITY_GLSL, velTex);
    const posVar = gpu.addVariable("texturePosition", SAND_POSITION_GLSL, posTex);
    gpu.setVariableDependencies(velVar, [posVar, velVar]);
    gpu.setVariableDependencies(posVar, [posVar, velVar]);

    // Uniforms
    const velUniforms = velVar.material.uniforms;
    velUniforms.uN = { value: n };
    velUniforms.uM = { value: m };
    velUniforms.uZoom = { value: zoom };
    velUniforms.uAmp = { value: 0 };
    velUniforms.uKick = { value: 0 };
    velUniforms.uTime = { value: 0 };
    velUniforms.uIsActive = { value: 0 };
    velUniforms.uShape = { value: plateShape === "circular" ? 1 : 0 };
    velUniforms.uLayerCount = { value: 0 };
    velUniforms.uLayers = { value: new Array(MAX_LAYERS).fill(null).map(() => new THREE.Vector4()) };
    velUniforms.uBesselZeros = { value: Array.from(BESSEL_ZEROS_FLAT) };

    const posUniforms = posVar.material.uniforms;
    posUniforms.uShape = { value: plateShape === "circular" ? 1 : 0 };
    posUniforms.uScatter = { value: 0 };

    // Edge wrap settings (OpenGL defaults are clamp)
    velVar.wrapS = velVar.wrapT = THREE.ClampToEdgeWrapping;
    posVar.wrapS = posVar.wrapT = THREE.ClampToEdgeWrapping;

    const gpuErr = gpu.init();
    if (gpuErr !== null) {
      console.error("[SandCanvas] GPUComputationRenderer init failed:", gpuErr);
    }

    // ── Render geometry: one vertex per particle, with aRef = sim-texture UV
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3); // unused, but required
    const refs = new Float32Array(PARTICLE_COUNT * 2);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i % SIM_SIZE;
      const iy = Math.floor(i / SIM_SIZE);
      refs[i * 2 + 0] = (ix + 0.5) / SIM_SIZE;
      refs[i * 2 + 1] = (iy + 0.5) / SIM_SIZE;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aRef", new THREE.BufferAttribute(refs, 2));

    const material = new THREE.ShaderMaterial({
      vertexShader: SAND_RENDER_VERT,
      fragmentShader: SAND_RENDER_FRAG,
      uniforms: {
        uPosTex: { value: null },
        uVelTex: { value: null },
        uPlateSize: { value: PLATE_SIZE },
        uPointScale: { value: 0.5 },
        uAmp: { value: 0 },
        uHue: { value: 0.5 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Ground plate (subtle) — gives spatial anchor
    const plateGeo = plateShape === "circular"
      ? new THREE.CircleGeometry(1, 128)
      : new THREE.PlaneGeometry(2, 2);
    const plateMat = new THREE.MeshBasicMaterial({
      color: 0x0b0815,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.rotation.x = -Math.PI / 2;
    plate.position.y = -0.01;
    scene.add(plate);

    // Subtle grid
    const grid = new THREE.GridHelper(2, 20, 0x1a1728, 0x1a1728);
    grid.position.y = -0.005;
    grid.material.transparent = true;
    grid.material.opacity = 0.25;
    scene.add(grid);

    // ── Expose kick / scatter on canvas
    renderer.domElement.__kick = () => { kickRef.current = 1.0; };
    renderer.domElement.__scatter = () => { scatterRef.current = 1.0; };

    // ── Resize handling
    const handleResize = () => {
      const r = container.getBoundingClientRect();
      const s = Math.min(r.width, r.height) || 500;
      renderer.setSize(s, s);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ── Animation loop
    let time = 0;
    let rafId = 0;

    const animate = () => {
      time += 0.016;

      const amp = (analyserRef.current && activeRef.current)
        ? getAmplitude(analyserRef.current)
        : 0.2;

      // Push uniforms
      velUniforms.uN.value = nRef.current;
      velUniforms.uM.value = mRef.current;
      velUniforms.uZoom.value = zoomRef.current;
      velUniforms.uAmp.value = amp;
      velUniforms.uKick.value = kickRef.current;
      velUniforms.uTime.value = time;
      velUniforms.uIsActive.value = activeRef.current ? 1 : 0;
      velUniforms.uShape.value = plateRef.current === "circular" ? 1 : 0;

      // Layers
      const { packed, count } = packLayers(layersRef.current);
      velUniforms.uLayerCount.value = count;
      for (let i = 0; i < MAX_LAYERS; i++) velUniforms.uLayers.value[i].copy(packed[i]);

      posUniforms.uShape.value = plateRef.current === "circular" ? 1 : 0;
      posUniforms.uScatter.value = scatterRef.current;

      // Pulses decay
      kickRef.current *= 0.92;
      if (kickRef.current < 0.01) kickRef.current = 0;
      scatterRef.current = 0; // one-shot

      // GPGPU step
      gpu.compute();

      // Feed textures into render material
      material.uniforms.uPosTex.value = gpu.getCurrentRenderTarget(posVar).texture;
      material.uniforms.uVelTex.value = gpu.getCurrentRenderTarget(velVar).texture;
      material.uniforms.uAmp.value = amp;

      // Hue drifts with frequency: log-map 40..6000 Hz → 0..1
      const f = Math.max(40, freqRef.current);
      material.uniforms.uHue.value = (Math.log2(f / 40) / Math.log2(6000 / 40)) % 1;

      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    // ── Context-loss guard
    const onLost = (e) => { e.preventDefault(); cancelAnimationFrame(rafId); };
    const onRestored = () => { rafId = requestAnimationFrame(animate); };
    renderer.domElement.addEventListener("webglcontextlost", onLost);
    renderer.domElement.addEventListener("webglcontextrestored", onRestored);

    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
      resizeObserver.disconnect();
      controls.dispose();
      geometry.dispose();
      material.dispose();
      plateGeo.dispose();
      plateMat.dispose();
      grid.geometry.dispose();
      grid.material.dispose();
      gpu.dispose?.();
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

export default SandCanvas;
