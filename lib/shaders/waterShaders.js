// Water3D shaders — GPU-displaced plane visualization of the cymatic field.
// Reuses FIELD_GLSL from sandShaders.js (same Chladni/Bessel math, multi-layer).
// The plane is subdivided densely; each vertex reads the field at its (x,z)
// location and displaces in Y. Fragment shader does Blinn-Phong + Fresnel +
// nodal-line glow for a liquid-metal / water look.

import { FIELD_GLSL, MAX_LAYERS } from "./sandShaders";

export { MAX_LAYERS };

// ─────────────────────────────────────────────────────────
// Vertex shader — displacement + analytic normal
// ─────────────────────────────────────────────────────────
// Plane lives in world XZ in range [-1, 1]. We map to plate space [0, 500]
// for field evaluation (matches chladni.js convention).
//
// World displacement is scaled by uDispScale (so user can dial up/down).
// Normal is computed from the analytic gradient — no finite differences.
export const WATER_VERT = /* glsl */ `
  uniform float uN;
  uniform float uM;
  uniform float uZoom;
  uniform float uAmp;
  uniform float uTime;
  uniform float uDispScale;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vField;

  ${FIELD_GLSL}

  void main() {
    // Untransformed plane: position.xy ∈ [-1, 1], position.z = 0.
    // Host rotates the mesh -PI/2 about X so the plane lies flat on world XZ,
    // and our local +Z becomes world +Y (up).
    vec2 local = position.xy;
    vec2 plate = (local * 0.5 + 0.5) * 500.0; // → [0, 500]²

    // Ripple modulation: time * amplitude gives gentle shimmer
    float ripple = sin(uTime * 2.0 + plate.x * 0.03) * 0.02 * uAmp;

    float f = fieldValue(plate, uN, uM, uZoom);
    vec2 g = fieldGradient(plate, uN, uM, uZoom);

    float disp = (f * uAmp + ripple) * uDispScale;
    vField = f;

    // Analytic normal: the surface is z = disp(x,y), so the surface normal
    // in local space is (-∂disp/∂x, -∂disp/∂y, 1). Gradient is per plate-unit;
    // plate spans 2 world units across 500 plate units, so scale accordingly.
    float gScale = (500.0 / 2.0) * uDispScale * uAmp;
    vec3 n = normalize(vec3(-g.x * gScale, -g.y * gScale, 1.0));
    vNormal = normalize(normalMatrix * n);

    vec3 newPos = vec3(position.x, position.y, disp);
    vec4 mv = modelViewMatrix * vec4(newPos, 1.0);
    vWorldPos = (modelMatrix * vec4(newPos, 1.0)).xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

// ─────────────────────────────────────────────────────────
// Fragment shader — Blinn-Phong + Fresnel + nodal glow + hue tint
// ─────────────────────────────────────────────────────────
export const WATER_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vField;

  uniform vec3 uCameraPos;
  uniform vec3 uLightDir;     // normalized
  uniform vec3 uBaseColor;    // deep water tint
  uniform vec3 uGlowColor;    // nodal line glow tint
  uniform float uHue;         // 0..1 from frequency
  uniform float uFresnelPow;

  // HSV → RGB (for frequency hue tint)
  vec3 hsv(float h, float s, float v) {
    vec3 k = vec3(5.0, 3.0, 1.0);
    vec3 p = abs(fract(h + k / 6.0) * 6.0 - 3.0);
    return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);
    vec3 L = normalize(uLightDir);
    vec3 H = normalize(L + V);

    // Diffuse — soft, low-contrast (water isn't matte)
    float nDotL = max(dot(N, L), 0.0);
    float diffuse = 0.25 + 0.35 * nDotL;

    // Specular — sharp Blinn-Phong
    float spec = pow(max(dot(N, H), 0.0), 64.0) * 1.2;

    // Fresnel — edge-on views reflect more (water/metal effect)
    float fres = pow(1.0 - max(dot(N, V), 0.0), uFresnelPow);

    // Nodal line glow — bright where |field| is small
    float nodeGlow = smoothstep(0.15, 0.0, abs(vField));

    // Compose
    vec3 tint = hsv(uHue, 0.35, 1.0);
    vec3 baseTinted = uBaseColor * mix(vec3(1.0), tint, 0.4);
    vec3 col = baseTinted * diffuse;
    col += vec3(1.0) * spec;
    col += tint * fres * 0.6;
    col += uGlowColor * nodeGlow * 1.4;

    // Gentle tone rolloff for highlights
    col = col / (1.0 + col * 0.35);

    gl_FragColor = vec4(col, 1.0);
  }
`;
