"use client";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getAmplitude } from "@/lib/audioAnalysis";
import { WATER_VERT, WATER_FRAG, MAX_LAYERS } from "@/lib/shaders/waterShaders";
import { BESSEL_ZEROS_FLAT } from "@/lib/shaders/sandShaders";

// Plane subdivisions — ~130k vertices. Adjust for perf if needed.
const PLANE_SEGMENTS_DESKTOP = 256;
const PLANE_SEGMENTS_MOBILE = 128;

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

const Water3D = forwardRef(function Water3D({
  frequency, n, m, isActive, analyser, zoom = 1,
  plateShape = "rectangular", layers = null,
}, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  useImperativeHandle(ref, () => canvasRef.current);

  // Live prop mirrors
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
    renderer.setClearColor(0x05030c, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const rect = container.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height) || 500;
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    // ── Scene + camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05030c, 0.08);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 2.2, 3.0);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 0, 0);
    controls.minDistance = 1.2;
    controls.maxDistance = 10;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;

    // ── Plane geometry (choose segments by device)
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    const segs = isMobile ? PLANE_SEGMENTS_MOBILE : PLANE_SEGMENTS_DESKTOP;
    const geometry = new THREE.PlaneGeometry(2, 2, segs, segs);
    // Note: we do NOT rotate the geometry — the mesh is rotated below so the
    // vertex shader sees untransformed local positions (position.xy ∈ [-1,1]).

    // ── Shader material
    const material = new THREE.ShaderMaterial({
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      uniforms: {
        uN: { value: n },
        uM: { value: m },
        uZoom: { value: zoom },
        uAmp: { value: 0.6 },
        uTime: { value: 0 },
        uDispScale: { value: 0.22 },
        uShape: { value: plateShape === "circular" ? 1 : 0 },
        uLayerCount: { value: 0 },
        uLayers: { value: new Array(MAX_LAYERS).fill(null).map(() => new THREE.Vector4()) },
        uBesselZeros: { value: Array.from(BESSEL_ZEROS_FLAT) },
        uCameraPos: { value: camera.position.clone() },
        uLightDir: { value: new THREE.Vector3(0.4, 0.8, 0.5).normalize() },
        uBaseColor: { value: new THREE.Color(0.12, 0.18, 0.32) }, // deep blue
        uGlowColor: { value: new THREE.Color(1.0, 0.82, 0.55) },  // warm nodal glow
        uHue: { value: 0.5 },
        uFresnelPow: { value: 2.5 },
      },
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // lay flat on world XZ (local +Z → world +Y)
    scene.add(mesh);

    // Circular mask: if plateShape === circular, we want a round surface.
    // Cheapest approach: keep the square geometry but discard fragments outside
    // radius in fragment shader OR overlay a circular cutout ring. For now we
    // just clip via a fragment test when shape=circular.
    // (Simpler than rebuilding geometry; good enough.)

    // Ambient soft glow from below (emissive disc to give the water depth)
    const underGlow = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 64),
      new THREE.MeshBasicMaterial({
        color: 0x221040,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      }),
    );
    underGlow.rotation.x = -Math.PI / 2;
    underGlow.position.y = -0.15;
    scene.add(underGlow);

    // Expose kick/scatter (no-ops here — water doesn't have discrete particles,
    // but we keep the interface consistent so the Shake button doesn't throw)
    renderer.domElement.__kick = () => {};
    renderer.domElement.__scatter = () => {};

    // ── Resize
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
        : 0.4;

      const u = material.uniforms;
      u.uN.value = nRef.current;
      u.uM.value = mRef.current;
      u.uZoom.value = zoomRef.current;
      u.uAmp.value = amp;
      u.uTime.value = time;
      u.uShape.value = plateRef.current === "circular" ? 1 : 0;

      const { packed, count } = packLayers(layersRef.current);
      u.uLayerCount.value = count;
      for (let i = 0; i < MAX_LAYERS; i++) u.uLayers.value[i].copy(packed[i]);

      const f = Math.max(40, freqRef.current);
      u.uHue.value = (Math.log2(f / 40) / Math.log2(6000 / 40)) % 1;

      u.uCameraPos.value.copy(camera.position);

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
      underGlow.geometry.dispose();
      underGlow.material.dispose();
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

export default Water3D;
