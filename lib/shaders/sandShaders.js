// GPGPU sand-particle shaders for Chladni/Bessel cymatic simulation.
// All field math ported from lib/chladni.js. Square + circular plate supported.
// Multi-layer support via MAX_LAYERS uniform array.

export const MAX_LAYERS = 4;
export const SIM_SIZE_DEFAULT = 512; // 262k grains — tuned at runtime

// ─────────────────────────────────────────────────────────
// Shared GLSL: field evaluation (square + circular + layered)
// ─────────────────────────────────────────────────────────
// Mirrors lib/chladni.js exactly. Uses PLATE_SIZE = 500 in plate coords.
// Inputs: p in [0, PLATE_SIZE]^2, n, m integer modes, zoom scale.
// Returns: value + analytic gradient.

export const FIELD_GLSL = /* glsl */ `
  #define PLATE_SIZE 500.0
  #define HALF (PLATE_SIZE * 0.5)
  #define PI 3.14159265358979

  // ── Square plate: Chladni pattern
  // value = cos(nπx·s/L)cos(mπy·s/L) + cos(mπx·s/L)cos(nπy·s/L)
  float chladniValue(vec2 p, float n, float m, float scale) {
    vec2 sp = p * scale;
    float nx = n * PI * sp.x / PLATE_SIZE;
    float ny = n * PI * sp.y / PLATE_SIZE;
    float mx = m * PI * sp.x / PLATE_SIZE;
    float my = m * PI * sp.y / PLATE_SIZE;
    return cos(nx) * cos(my) + cos(mx) * cos(ny);
  }

  vec2 chladniGradient(vec2 p, float n, float m, float scale) {
    vec2 sp = p * scale;
    float nx = n * PI * sp.x / PLATE_SIZE;
    float ny = n * PI * sp.y / PLATE_SIZE;
    float mx = m * PI * sp.x / PLATE_SIZE;
    float my = m * PI * sp.y / PLATE_SIZE;
    float np = n * PI * scale / PLATE_SIZE;
    float mp = m * PI * scale / PLATE_SIZE;
    float dx = -np * sin(nx) * cos(my) - mp * sin(mx) * cos(ny);
    float dy = -mp * cos(nx) * sin(my) - np * cos(mx) * sin(ny);
    return vec2(dx, dy);
  }

  // ── Bessel J0 — Abramowitz & Stegun rational approximation
  float besselJ0(float x) {
    float ax = abs(x);
    if (ax < 8.0) {
      float y = x * x;
      float num = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 +
        y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))));
      float den = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 +
        y * (59272.64853 + y * (267.8532712 + y * 1.0))));
      return num / den;
    }
    float z = 8.0 / ax;
    float y = z * z;
    float xx = ax - 0.785398164;
    float p = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 +
      y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
    float q = -0.1562499995e-1 + y * (0.1430488765e-3 +
      y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
    return sqrt(0.636619772 / ax) * (cos(xx) * p - z * sin(xx) * q);
  }

  float besselJ1(float x) {
    float ax = abs(x);
    float ans;
    if (ax < 8.0) {
      float y = x * x;
      float num = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 +
        y * (-2972611.439 + y * (15704.48260 + y * (-30.16036606))))));
      float den = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 +
        y * (99447.43394 + y * (376.9991397 + y * 1.0))));
      return num / den;
    }
    float z = 8.0 / ax;
    float y = z * z;
    float xx = ax - 2.356194491;
    float p = 1.0 + y * (0.183105e-2 + y * (-0.3516396496e-4 +
      y * (0.2457520174e-5 + y * (-0.240337019e-6))));
    float q = 0.04687499995 + y * (-0.2002690873e-3 +
      y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
    ans = sqrt(0.636619772 / ax) * (cos(xx) * p - z * sin(xx) * q);
    return x < 0.0 ? -ans : ans;
  }

  // J_n via upward recurrence. n is bounded small (≤8) so a fixed loop is fine.
  float besselJn(int n, float x) {
    if (n == 0) return besselJ0(x);
    if (n == 1) return besselJ1(x);
    if (x == 0.0) return 0.0;
    float ax = abs(x);
    float jPrev = besselJ0(ax);
    float jCurr = besselJ1(ax);
    for (int k = 1; k < 16; k++) {
      if (k >= n) break;
      float jNext = (2.0 * float(k) / ax) * jCurr - jPrev;
      jPrev = jCurr;
      jCurr = jNext;
    }
    if ((n - (n / 2) * 2) != 0 && x < 0.0) return -jCurr;
    return jCurr;
  }

  // ── Bessel zeros k_{n,m} — baked as 9×8 = 72-entry array.
  // Index formula: ni*8 + (mi-1), clamped.
  uniform float uBesselZeros[72];

  float getBesselZero(float n, float m) {
    int ni = int(clamp(n, 0.0, 8.0));
    int mi = int(clamp(m - 1.0, 0.0, 7.0));
    return uBesselZeros[ni * 8 + mi];
  }

  // ── Circular plate: Bessel pattern
  // f(r,θ) = J_n(k_nm · r/R) · cos(n·θ)
  float besselValue(vec2 p, float n, float m, float scale) {
    vec2 c = (p - vec2(HALF)) * scale;
    float r = length(c);
    float theta = atan(c.y, c.x);
    float R = HALF;
    float knm = getBesselZero(n, m);
    return besselJn(int(n), knm * r / R) * cos(n * theta);
  }

  // Numerical Bessel gradient (matches JS implementation, EPSILON=0.5)
  vec2 besselGradient(vec2 p, float n, float m, float scale) {
    float e = 0.5;
    float vpx = besselValue(p + vec2(e, 0.0), n, m, scale);
    float vmx = besselValue(p - vec2(e, 0.0), n, m, scale);
    float vpy = besselValue(p + vec2(0.0, e), n, m, scale);
    float vmy = besselValue(p - vec2(0.0, e), n, m, scale);
    return vec2((vpx - vmx) / (2.0 * e), (vpy - vmy) / (2.0 * e));
  }

  // ── Multi-layer field
  // Layers packed as vec4: (n, m, weight, unused). uLayerCount active.
  uniform vec4 uLayers[${MAX_LAYERS}];
  uniform int uLayerCount;
  uniform int uShape; // 0 = square, 1 = circular

  float fieldValue(vec2 p, float n, float m, float scale) {
    if (uLayerCount > 1) {
      float sum = 0.0;
      for (int i = 0; i < ${MAX_LAYERS}; i++) {
        if (i >= uLayerCount) break;
        vec4 L = uLayers[i];
        float v = uShape == 1
          ? besselValue(p, L.x, L.y, scale)
          : chladniValue(p, L.x, L.y, scale);
        sum += v * L.z;
      }
      return sum;
    }
    return uShape == 1
      ? besselValue(p, n, m, scale)
      : chladniValue(p, n, m, scale);
  }

  vec2 fieldGradient(vec2 p, float n, float m, float scale) {
    if (uLayerCount > 1) {
      vec2 sum = vec2(0.0);
      for (int i = 0; i < ${MAX_LAYERS}; i++) {
        if (i >= uLayerCount) break;
        vec4 L = uLayers[i];
        vec2 g = uShape == 1
          ? besselGradient(p, L.x, L.y, scale)
          : chladniGradient(p, L.x, L.y, scale);
        sum += g * L.z;
      }
      return sum;
    }
    return uShape == 1
      ? besselGradient(p, n, m, scale)
      : chladniGradient(p, n, m, scale);
  }
`;

// ─────────────────────────────────────────────────────────
// Velocity update fragment shader
// ─────────────────────────────────────────────────────────
// Reads: texturePosition (xy = pos), textureVelocity (xy = vel, z = settled)
// Writes: new velocity
//
// Physics: vel ← vel·friction + kick·random_dir − field·gradient·gravity
// Settled grains (low |field| and low |vel|) skip force + clamp velocity to 0.
export const SAND_VELOCITY_GLSL = /* glsl */ `
  uniform float uN;
  uniform float uM;
  uniform float uZoom;
  uniform float uAmp;      // audio amplitude 0..1
  uniform float uKick;     // pulse: 1.0 → 0 over ~1s after button/pattern change
  uniform float uTime;
  uniform float uIsActive; // 0 or 1

  ${FIELD_GLSL}

  // Hash-based pseudo-random (Hugo Elias style)
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 hash2(vec2 p) {
    return vec2(hash(p), hash(p + vec2(37.1, 17.3)));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 pos = texture2D(texturePosition, uv);
    vec4 vel = texture2D(textureVelocity, uv);

    vec2 p = pos.xy;
    vec2 v = vel.xy;

    // ── Field forces
    float val = fieldValue(p, uN, uM, uZoom);
    vec2 grad = fieldGradient(p, uN, uM, uZoom);
    float gmag = length(grad) + 0.001;

    // Attraction toward nodes: move down the gradient of |field|.
    // Using -val * grad / |grad| gives a force that vanishes at nodes.
    float attractStrength = 0.6 * (0.5 + uAmp);
    vec2 attract = -(val * grad / gmag) * attractStrength;

    // Chaotic kick where |field| is large (antinodes) — louder sound = bigger kick
    vec2 rnd = hash2(p * 0.1 + uTime * 17.0) - 0.5;
    float absVal = abs(val);
    float kickStrength = (0.3 + uAmp * 2.0) * absVal * uIsActive;
    vec2 audioKick = rnd * kickStrength * 3.0;

    // Global pulse kick (from __kick button or pattern change)
    vec2 pulseKick = rnd * uKick * 6.0;

    // Ambient jitter — keeps grains alive even with no audio
    vec2 jitter = (hash2(p + uTime * 3.7) - 0.5) * (0.05 + uAmp * 0.3);

    // Combine
    v = v * 0.9 + attract * 0.5 + audioKick + pulseKick + jitter;

    // Settle detection: near node + slow = damp to stop
    float speed = length(v);
    float settled = (absVal < 0.08 && speed < 0.3) ? 1.0 : 0.0;
    if (settled > 0.5) v *= 0.6;

    // Clamp extreme velocities (stability)
    float maxV = 12.0;
    if (speed > maxV) v = v / speed * maxV;

    gl_FragColor = vec4(v, settled, vel.w);
  }
`;

// ─────────────────────────────────────────────────────────
// Position update fragment shader
// ─────────────────────────────────────────────────────────
// Reads: texturePosition + newly-written textureVelocity
// Writes: new position, with boundary handling (wrap or circle clamp)
export const SAND_POSITION_GLSL = /* glsl */ `
  uniform int uShape;       // 0 = square, 1 = circular
  uniform float uScatter;   // pulse: 1.0 → re-randomize positions

  float hash_p(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 pos = texture2D(texturePosition, uv);
    vec4 vel = texture2D(textureVelocity, uv);

    vec2 p = pos.xy;

    // Scatter: hard-reset positions to random
    if (uScatter > 0.5) {
      vec2 r = vec2(
        hash_p(uv * 91.3 + vec2(pos.w, 0.0)),
        hash_p(uv * 57.7 + vec2(0.0, pos.w))
      );
      p = r * 500.0;
      gl_FragColor = vec4(p, pos.z, pos.w);
      return;
    }

    p += vel.xy;

    // Boundary
    float PLATE = 500.0;
    float HALF_P = 250.0;
    if (uShape == 1) {
      // Circular: clamp inside radius
      vec2 c = p - vec2(HALF_P);
      float r = length(c);
      float R = HALF_P - 3.0;
      if (r > R) {
        p = vec2(HALF_P) + normalize(c) * R;
      }
    } else {
      // Square: soft wrap at edges
      if (p.x < 0.0) p.x = 0.0;
      if (p.x > PLATE) p.x = PLATE;
      if (p.y < 0.0) p.y = 0.0;
      if (p.y > PLATE) p.y = PLATE;
    }

    // pos.z stores age for color variation; increment slowly
    gl_FragColor = vec4(p, pos.z + 0.01, pos.w);
  }
`;

// ─────────────────────────────────────────────────────────
// Particle render — vertex shader samples positionTex by particle index
// ─────────────────────────────────────────────────────────
export const SAND_RENDER_VERT = /* glsl */ `
  uniform sampler2D uPosTex;
  uniform sampler2D uVelTex;
  uniform float uPlateSize;     // 500.0
  uniform float uPointScale;    // base point size
  uniform float uAmp;
  attribute vec2 aRef;          // uv into sim texture, [0,1]²

  varying float vSettled;
  varying float vSeed;
  varying float vSpeed;

  void main() {
    vec4 pos = texture2D(uPosTex, aRef);
    vec4 vel = texture2D(uVelTex, aRef);

    // Map plate-space [0, 500] → world [-1, 1]
    vec2 world2 = (pos.xy / uPlateSize) * 2.0 - 1.0;
    vec3 world = vec3(world2.x, 0.0, world2.y);

    vSettled = vel.z;
    vSeed = pos.w;
    vSpeed = length(vel.xy);

    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    gl_Position = projectionMatrix * mv;

    // Size: tiny grains. settled = sharper, moving = slightly larger.
    // Scale inversely with camera distance but clamp — each grain ~1-3px.
    float s = uPointScale * (1.0 + vSpeed * 0.04) * (0.8 + uAmp * 0.3);
    gl_PointSize = clamp(s * 8.0 / -mv.z, 1.0, 6.0);
  }
`;

export const SAND_RENDER_FRAG = /* glsl */ `
  precision highp float;
  varying float vSettled;
  varying float vSeed;
  varying float vSpeed;
  uniform float uHue; // 0..1

  // HSV → RGB
  vec3 hsv(float h, float s, float v) {
    vec3 k = vec3(5.0, 3.0, 1.0);
    vec3 p = abs(fract(h + k / 6.0) * 6.0 - 3.0);
    return v * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), s);
  }

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    // Soft falloff
    float alpha = smoothstep(0.5, 0.0, d);

    // Color: settled grains → warm sand/ochre, moving → cool glow tied to uHue
    vec3 warm = mix(vec3(1.0, 0.85, 0.55), vec3(0.95, 0.7, 0.4), fract(vSeed * 3.1));
    vec3 cool = hsv(uHue + vSeed * 0.08, 0.8, 1.0);
    vec3 col = mix(cool, warm, vSettled);

    // Moving grains brighter (kinetic energy glow)
    col *= 0.6 + vSpeed * 0.15 + vSettled * 0.4;

    gl_FragColor = vec4(col, alpha * (0.6 + vSettled * 0.4));
  }
`;

// ─────────────────────────────────────────────────────────
// Flattened Bessel zeros table (9 × 8), matches BESSEL_ZEROS in lib/chladni.js
// ─────────────────────────────────────────────────────────
export const BESSEL_ZEROS_FLAT = new Float32Array([
  2.4048, 5.5201, 8.6537, 11.7915, 14.9309, 18.0711, 21.2116, 24.3525,
  3.8317, 7.0156, 10.1735, 13.3237, 16.4706, 19.6159, 22.7601, 25.9037,
  5.1356, 8.4172, 11.6198, 14.7960, 17.9598, 21.1170, 24.2701, 27.4206,
  6.3802, 9.7610, 13.0152, 16.2235, 19.4094, 22.5828, 25.7482, 28.9084,
  7.5883, 11.0647, 14.3725, 17.6160, 20.8269, 24.0190, 27.1991, 30.3710,
  8.7715, 12.3386, 15.7002, 18.9801, 22.2178, 25.4303, 28.6266, 31.8117,
  9.9361, 13.5893, 17.0038, 20.3208, 23.5861, 26.8202, 30.0337, 33.2330,
  11.0864, 14.8213, 18.2876, 21.6415, 24.9349, 28.1912, 31.4228, 34.6371,
  12.2251, 16.0378, 19.5545, 22.9452, 26.2668, 29.5457, 32.7958, 36.0256,
]);
