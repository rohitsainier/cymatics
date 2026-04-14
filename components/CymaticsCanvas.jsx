"use client";
import { useEffect, useRef, useCallback } from "react";
import { chladniValue, chladniGradient, PLATE_SIZE } from "@/lib/chladni";
import { getAmplitude } from "@/lib/audioAnalysis";

const PARTICLE_COUNT = 5000;

export default function CymaticsCanvas({ frequency, n, m, isActive, analyser, zoom = 1, onZoomChange }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef(null);
  const animRef = useRef(null);
  const nRef = useRef(n);
  const mRef = useRef(m);
  const freqRef = useRef(frequency);
  const activeRef = useRef(isActive);
  const analyserRef = useRef(analyser);
  const zoomRef = useRef(zoom);

  useEffect(() => { nRef.current = n; }, [n]);
  useEffect(() => { mRef.current = m; }, [m]);
  useEffect(() => { freqRef.current = frequency; }, [frequency]);
  useEffect(() => { activeRef.current = isActive; }, [isActive]);
  useEffect(() => { analyserRef.current = analyser; }, [analyser]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const initParticles = useCallback(() => {
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * PLATE_SIZE,
        y: Math.random() * PLATE_SIZE,
        vx: 0,
        vy: 0,
        size: 1 + Math.random() * 1.5,
        brightness: 0.4 + Math.random() * 0.6,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => { initParticles(); }, [initParticles]);

  // Kick: give all particles a random velocity burst (they flow back to pattern)
  const kickParticles = useCallback(() => {
    const particles = particlesRef.current;
    if (!particles) return;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const angle = Math.random() * Math.PI * 2;
      const force = 2 + Math.random() * 4;
      p.vx += Math.cos(angle) * force;
      p.vy += Math.sin(angle) * force;
    }
  }, []);

  // Full scatter: randomize positions entirely
  const fullScatter = useCallback(() => {
    const particles = particlesRef.current;
    if (!particles) return;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x = Math.random() * PLATE_SIZE;
      p.y = Math.random() * PLATE_SIZE;
      p.vx = 0;
      p.vy = 0;
    }
  }, []);

  // Expose both scatter modes
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.__kick = kickParticles;
      canvasRef.current.__scatter = fullScatter;
    }
  }, [kickParticles, fullScatter]);

  // Mouse wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onZoomChange) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      const newZoom = Math.max(0.5, Math.min(5, zoomRef.current + delta));
      onZoomChange(Math.round(newZoom * 10) / 10);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [onZoomChange]);

  // Pinch-to-zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onZoomChange) return;

    let lastDist = 0;

    const getDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        lastDist = getDistance(e.touches);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        const delta = (dist - lastDist) * 0.005;
        const newZoom = Math.max(0.5, Math.min(5, zoomRef.current + delta));
        onZoomChange(Math.round(newZoom * 10) / 10);
        lastDist = dist;
      }
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
    };
  }, [onZoomChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = PLATE_SIZE * dpr;
    canvas.height = PLATE_SIZE * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const animate = () => {
      time += 0.016;
      const cn = nRef.current;
      const cm = mRef.current;
      const cz = zoomRef.current;
      const particles = particlesRef.current;
      if (!particles) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      let amp = 0.6;
      if (analyserRef.current && activeRef.current) {
        amp = getAmplitude(analyserRef.current);
      }

      const speed = activeRef.current ? 0.8 : 0.15;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const val = chladniValue(p.x, p.y, cn, cm, 1, cz);
        const [gx, gy] = chladniGradient(p.x, p.y, cn, cm, 1, cz);
        const mag = Math.sqrt(gx * gx + gy * gy) + 0.001;

        const fx = -(val * gx / mag) * speed * amp;
        const fy = -(val * gy / mag) * speed * amp;

        p.vx = p.vx * 0.85 + fx * 0.5;
        p.vy = p.vy * 0.85 + fy * 0.5;

        const jitter = activeRef.current ? 0.3 * amp : 0.08;
        p.vx += (Math.random() - 0.5) * jitter;
        p.vy += (Math.random() - 0.5) * jitter;

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx *= -0.5; }
        if (p.x > PLATE_SIZE) { p.x = PLATE_SIZE; p.vx *= -0.5; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.5; }
        if (p.y > PLATE_SIZE) { p.y = PLATE_SIZE; p.vy *= -0.5; }
      }

      // Draw
      ctx.fillStyle = "rgba(8, 6, 14, 0.25)";
      ctx.fillRect(0, 0, PLATE_SIZE, PLATE_SIZE);

      const hueBase = (freqRef.current / 10) % 360;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const val = Math.abs(chladniValue(p.x, p.y, cn, cm, 1, cz));
        const nearNodeLine = Math.max(0, 1 - val * 3);
        const glow = nearNodeLine * p.brightness * amp;

        const hue = (hueBase + nearNodeLine * 40) % 360;
        const sat = 70 + nearNodeLine * 30;
        const light = 40 + glow * 50;
        const alpha = 0.3 + glow * 0.7;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + glow * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
        ctx.fill();

        if (glow > 0.7) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, 70%, ${glow * 0.12})`;
          ctx.fill();
        }
      }

      // Pulsing border when active
      if (activeRef.current) {
        const pulse = Math.sin(time * freqRef.current * 0.02) * 0.5 + 0.5;
        ctx.strokeStyle = `hsla(${hueBase}, 80%, 60%, ${0.04 + pulse * 0.06})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(2, 2, PLATE_SIZE - 4, PLATE_SIZE - 4);
      }

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
        borderRadius: 8,
        touchAction: "none",
      }}
    />
  );
}
