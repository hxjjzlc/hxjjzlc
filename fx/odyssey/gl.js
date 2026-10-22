/* =============================================================================
   odyssey · gl.js  —— 四幕场景引擎（WebGL2，零依赖）
   幕 0 = 彼岸 / 幕 1 = 影蚀 / 幕 2 = 血雨 / 幕 3 = 镜面
   对外：ODGL.create(canvas) → E
   E.s  : 状态（外部直接改）
   E.render(now) / E.resize() / E.stampBlood(u,v,r) / E.poke(u,v,r)
   ============================================================================= */
(function (w) {
  'use strict';

  /* ---------------------------------------------------------------- 数学 */
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
        o[i * 4 + j] = s;
      }
    }
    return o;
  }
  function persp(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    const o = new Float32Array(16);
    o[0] = f / aspect; o[5] = f; o[10] = (far + near) * nf; o[11] = -1; o[14] = 2 * far * near * nf;
    return o;
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const scl = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function lookAt(eye, ctr, up) {
    const z = nrm(sub(eye, ctr));
    const x = nrm(crs(up, z));
    const y = crs(z, x);
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
    ]);
  }
  function rnd(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ease = (t) => t * t * (3 - 2 * t);

  /* ------------------------------------------------------------- 着色器 */
  const VS_QUAD = `#version 300 es
precision highp float;
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const COMMON = `
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x),
             mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y);
}
float fbm4(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<4;i++){ v += a*vnoise(p); p = p*2.03 + vec2(1.7,9.2); a *= 0.5; }
  return v;
}
float fbm6(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i=0;i<6;i++){ v += a*vnoise(p); p = p*2.02 + vec2(3.1,7.7); a *= 0.5; }
  return v;
}`;

  /* ---- 天空 / 太阳 / 星 ---- */
  const FS_SKY = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform float uTime, uSun, uTop, uAct, uAsh;
uniform vec3 uSkyA, uSkyB, uSkyC, uSunCol, uHaze;
${COMMON}
void main(){
  vec2 uv = vUv;
  float asp = uRes.x / max(uRes.y, 1.0);
  vec3 col = mix(uSkyC, uSkyB, smoothstep(0.0, 0.60, uv.y));
  col = mix(col, uSkyA, smoothstep(0.45, 1.05, uv.y));

  /* 星屑 */
  vec2 gp = floor(uv * vec2(asp * 190.0, 190.0));
  float sr = hash21(gp);
  float star = smoothstep(0.9975, 1.0, sr);
  float tw = 0.55 + 0.45 * sin(uTime * 1.7 + sr * 61.0);
  col += vec3(0.86, 0.80, 1.0) * star * tw * (1.0 - smoothstep(0.25, 0.85, uv.y)) * 1.3;

  /* 远处云海 / 紫雾 */
  float cl = fbm4(vec2(uv.x * asp * 2.4 + uTime * 0.010, uv.y * 3.2 - uTime * 0.006));
  float band = smoothstep(0.02, 0.30, uv.y) * (1.0 - smoothstep(0.34, 0.62, uv.y));
  col = mix(col, uHaze, band * cl * 0.85);

  /* 紫色太阳 */
  vec2 sp = vec2(0.685, 0.665);
  vec2 dv = (uv - sp) * vec2(asp, 1.0);
  float d = length(dv);
  float sunR = 0.083;
  float disc = 1.0 - smoothstep(sunR - 0.0035, sunR + 0.0025, d);
  float core = 1.0 - smoothstep(0.0, sunR * 0.55, d);
  float halo = exp(-d * d * 24.0) * 0.65 + exp(-d * d * 5.5) * 0.18;
  float rays = smoothstep(0.45, 1.0, fbm4(vec2(atan(dv.y, dv.x) * 3.0, uTime * 0.10)) * 0.8 + 0.4);
  col += uSunCol * disc * (0.70 + 0.45 * core) * uSun;
  col += uSunCol * halo * uSun * (0.55 + 0.45 * rays);
  /* 太阳旁的丝状日冕 */
  float corona = smoothstep(0.55, 0.95, fbm4(dv * 7.0 + vec2(uTime * 0.08, 0.0))) * exp(-d * d * 9.0);
  col += uSunCol * corona * 0.35 * uSun;

  /* 顶部压暗 */
  col *= 0.86 + 0.30 * smoothstep(0.0, 0.7, uv.y);
  /* 灰化（飞灰转场） */
  col = mix(col, vec3(0.30, 0.29, 0.32), uAsh * 0.55);
  o = vec4(col, 1.0);
}`;

  /* ---- 湖底 ---- */
  const VS_PLANE = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform mat4 uVP;
uniform float uSpin, uY, uScale;
out vec3 vWorld;
void main(){
  vec3 p = vec3(aPos.x * uScale, uY, aPos.y * uScale);
  float c = cos(uSpin), s = sin(uSpin);
  p = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  vWorld = p;
  gl_Position = uVP * vec4(p, 1.0);
}`;

  const FS_BED = `#version 300 es
precision highp float;
in vec3 vWorld;
out vec4 o;
uniform float uTime, uLakeR, uAct;
uniform vec3 uCam;
${COMMON}
void main(){
  float r = length(vWorld.xz);
  if (r > uLakeR * 1.02) discard;
  float n = fbm4(vWorld.xz * 0.10 + vec2(uTime * 0.012, -uTime * 0.008));
  vec3 col = mix(vec3(0.020, 0.012, 0.045), vec3(0.075, 0.045, 0.14), n);
  /* 水下暗纹 */
  float vein = smoothstep(0.62, 0.98, fbm6(vWorld.xz * 0.28 + n * 2.0));
  col += vec3(0.28, 0.16, 0.46) * vein * 0.35;
  /* 岸边浅色 */
  float edge = smoothstep(uLakeR * 0.80, uLakeR * 1.02, r);
  col = mix(col, vec3(0.10, 0.08, 0.16), edge * 0.6);
  float d = length(uCam - vWorld);
  col = mix(col, vec3(0.04, 0.03, 0.07), smoothstep(40.0, 95.0, d));
  o = vec4(col, 1.0);
}`;

  /* ---- 岸（湖以外的地） ---- */
  const FS_SHORE = `#version 300 es
precision highp float;
in vec3 vWorld;
out vec4 o;
uniform float uTime, uLakeR, uAsh;
uniform vec3 uCam, uFog;
${COMMON}
void main(){
  float r = length(vWorld.xz);
  if (r < uLakeR * 0.985) discard;
  float n = fbm4(vWorld.xz * 0.085 + vec2(uTime * 0.010, -uTime * 0.006));
  vec3 col = mix(vec3(0.030, 0.017, 0.055), vec3(0.098, 0.058, 0.148), n);
  /* 落花积在地上的暗红斑 */
  float petal = smoothstep(0.58, 0.95, fbm4(vWorld.xz * 0.42 + n * 2.2));
  col += vec3(0.26, 0.055, 0.19) * petal * 0.55;
  /* 靠水的那一圈更湿更亮 */
  float wet = 1.0 - smoothstep(uLakeR, uLakeR * 1.30, r);
  col = mix(col, vec3(0.075, 0.052, 0.115), wet * 0.65);
  /* 远处沉进雾里 */
  float d = length(uCam - vWorld);
  col = mix(col, uFog, smoothstep(30.0, 96.0, d) * 0.92);
  /* 飞灰转场：整片地先褪成灰 */
  col = mix(col, vec3(0.26, 0.25, 0.28), uAsh * 0.35 * (1.0 - wet));
  o = vec4(col, 1.0);
}`;

  /* ---- 湖面 ---- */
  const FS_WATER = `#version 300 es
precision highp float;
in vec3 vWorld;
out vec4 o;
uniform float uTime, uLakeR, uAct, uInk, uBlood;
uniform vec3 uCam, uSkyTint, uSunCol;
${COMMON}
void main(){
  float r = length(vWorld.xz);
  if (r > uLakeR) discard;
  vec2 p = vWorld.xz;
  float w = fbm4(p * 0.22 + vec2(uTime * 0.045, uTime * 0.028));
  float wx = fbm4((p + vec2(0.9, 0.0)) * 0.22 + vec2(uTime * 0.045, uTime * 0.028)) - w;
  float wz = fbm4((p + vec2(0.0, 0.9)) * 0.22 + vec2(uTime * 0.045, uTime * 0.028)) - w;
  vec3 N = normalize(vec3(-wx * 2.2, 0.42, -wz * 2.2));
  vec3 V = normalize(uCam - vWorld);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 col = mix(vec3(0.045, 0.030, 0.10), uSkyTint, 0.20 + 0.55 * fres);

  /* 镜面高光（紫日与水岸花光） */
  vec3 L = normalize(vec3(0.55, 0.62, -0.55));
  float spec = pow(max(dot(reflect(-V, N), L), 0.0), 46.0);
  col += uSunCol * spec * 1.5;

  /* 花影拖成竖向光带 */
  float band = smoothstep(0.46, 0.94, fbm4(vec2(p.x * 0.55, p.y * 0.10) + uTime * 0.006));
  float nearShore = smoothstep(uLakeR * 0.35, uLakeR * 1.0, r);
  col += vec3(0.62, 0.10, 0.30) * band * nearShore * 0.55;
  col += vec3(0.42, 0.14, 0.78) * (1.0 - nearShore) * 0.18;

  /* 岸边浪线 */
  float shore = smoothstep(uLakeR - 0.55, uLakeR, r) * (0.5 + 0.5 * sin(r * 22.0 - uTime * 1.6));
  col += vec3(0.55, 0.48, 0.72) * shore * 0.30;

  /* 血与墨的渗染 */
  col = mix(col, vec3(0.30, 0.03, 0.05), uBlood * 0.55);
  col = mix(col, vec3(0.03, 0.035, 0.05), uInk * 0.65);
  float a = 0.62 + 0.24 * fres;
  o = vec4(col, a);
}`;

  /* ---- 彼岸花 ---- */
  const VS_FLOWER = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 iA;   // x, z, rot, scale
layout(location=4) in vec4 iB;   // seed, hue, special, 0
uniform mat4 uVP;
uniform float uTime, uGrow, uSpin, uAsh;
out vec3 vWorld;
out vec3 vNrm;
out vec2 vUv;
out float vLife;
out vec3 vCol;
out float vSpec;
void main(){
  float seed = iB.x;
  float t = fract(uTime * 0.028 + seed * 11.0);
  float bud = smoothstep(0.0, 0.20, t);
  float wilt = smoothstep(0.58, 1.0, t);
  float gr = bud * uGrow;

  vec3 p = aPos;
  p.y *= gr;
  p.xz *= mix(0.30, 1.0, gr);
  /* 凋谢：花瓣外翻并下垂 */
  p.xz *= 1.0 + wilt * 0.42;
  p.y -= wilt * wilt * 0.55 * pow(aUv.x, 1.4);

  float ang = iA.z;
  float c = cos(ang), s = sin(ang);
  p = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
  p *= iA.w;
  p.x += iA.x;
  p.z += iA.y;

  float ss = sin(uSpin), cc = cos(uSpin);
  p = vec3(p.x * cc - p.z * ss, p.y, p.x * ss + p.z * cc);

  vWorld = p;
  vNrm = normalize(vec3(aNrm.x * c - aNrm.z * s, aNrm.y, aNrm.x * s + aNrm.z * c));
  vUv = aUv;
  vLife = t;

  vec3 base = mix(vec3(0.93, 0.075, 0.26), vec3(0.58, 0.11, 0.95), iB.y);
  vSpec = 0.0;
  if (iB.z > 1.5) { base = vec3(1.0, 0.80, 0.32); vSpec = 1.0; }
  else if (iB.z > 0.5) { base = vec3(0.50, 0.96, 1.0); vSpec = 1.0; }
  vCol = base;
  gl_Position = uVP * vec4(p, 1.0);
}`;

  const FS_FLOWER = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNrm;
in vec2 vUv;
in float vLife;
in vec3 vCol;
in float vSpec;
out vec4 o;
uniform vec3 uCam, uFog, uSunCol;
uniform float uAsh, uTime;
${COMMON}
void main(){
  /* 飞灰溶解 */
  float n = hash21(floor(vWorld.xz * 2.4) + floor(vWorld.y * 2.0));
  if (n < uAsh * 1.18) discard;

  vec3 V = normalize(uCam - vWorld);
  vec3 N = normalize(vNrm);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(vec3(-0.35, 0.85, 0.35));
  float diff = max(dot(N, L), 0.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.4);

  float petalCore = pow(1.0 - vUv.y, 0.6);
  vec3 col = vCol * (0.30 + 0.85 * diff);
  col += vCol * rim * (0.85 + 1.5 * vSpec);
  col += vCol * petalCore * 0.45;
  /* 花瓣尖端更亮更透明 */
  float tip = smoothstep(0.55, 1.0, vUv.x);
  col += vCol * tip * 0.35;
  /* 花期 */
  col *= 0.60 + 0.55 * sin(clamp(vLife, 0.0, 1.0) * 3.14159);
  /* 自发光 */
  col += vCol * 0.20;

  float d = length(uCam - vWorld);
  float fog = smoothstep(22.0, 78.0, d);
  col = mix(col, uFog, fog * 0.88);

  float a = (1.0 - smoothstep(0.62, 1.0, uAsh)) * (1.0 - fog * 0.15);
  o = vec4(col, a);
}`;

  /* ---- 巨树 ---- */
  const VS_TREE = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec2 aUv;
layout(location=3) in vec3 iA;
layout(location=4) in vec3 iB;
layout(location=5) in vec3 iR;  // r0, r1, growthOrder
uniform mat4 uVP;
uniform float uGrow, uSpin, uAsh, uTime;
out vec3 vWorld;
out vec3 vNrm;
out float vSpec;
out float vT;
void main(){
  float ang = aUv.x * 6.2831853;
  vec3 ax = normalize(iB - iA);
  vec3 upv = abs(ax.y) < 0.9 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  vec3 t1 = normalize(cross(upv, ax));
  vec3 t2 = cross(ax, t1);
  float r = mix(iR.x, iR.y, aUv.y);
  vec3 radial = t1 * cos(ang) + t2 * sin(ang);
  vec3 p = mix(iA, iB, aUv.y) + radial * r;

  /* 逐级生长 */
  float g = clamp(uGrow * 1.45 - iR.z, 0.0, 1.0);
  p = mix(iA, p, g);

  float ss = sin(uSpin), cc = cos(uSpin);
  p = vec3(p.x * cc - p.z * ss, p.y, p.x * ss + p.z * cc);
  vec3 nr = vec3(radial.x * cc - radial.z * ss, radial.y, radial.x * ss + radial.z * cc);

  vWorld = p;
  vNrm = nr;
  vT = aUv.y;
  vSpec = iR.z;
  gl_Position = uVP * vec4(p, 1.0);
}`;

  const FS_TREE = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNrm;
in float vT;
in float vSpec;
out vec4 o;
uniform vec3 uCam, uFog;
uniform float uAsh, uTime;
${COMMON}
void main(){
  float n = hash21(floor(vWorld.xz * 3.0) + floor(vWorld.y * 3.0));
  if (n < uAsh * 1.10) discard;
  vec3 V = normalize(uCam - vWorld);
  vec3 N = normalize(vNrm);
  if (dot(N, V) < 0.0) N = -N;
  vec3 L = normalize(vec3(-0.3, 0.8, 0.4));
  float diff = max(dot(N, L), 0.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  vec3 col = vec3(0.045, 0.030, 0.060) + vec3(0.09, 0.05, 0.13) * diff;
  col += vec3(0.45, 0.18, 0.80) * rim * 0.55;
  /* 树皮裂纹发光 */
  float cr = smoothstep(0.72, 1.0, fbm4(vec2(vT * 18.0, atan(vWorld.z, vWorld.x) * 2.4)));
  col += vec3(0.55, 0.16, 0.85) * cr * 0.30;
  float d = length(uCam - vWorld);
  col = mix(col, uFog, smoothstep(28.0, 92.0, d) * 0.88);
  o = vec4(col, 1.0 - smoothstep(0.62, 1.0, uAsh));
}`;

  /* ---- 树冠 / 空中光点 ---- */
  const VS_POINT = `#version 300 es
precision highp float;
layout(location=0) in vec4 aP;   // x, y, z, seed
layout(location=1) in vec4 aC;   // r, g, b, size
uniform mat4 uVP;
uniform float uTime, uSpin, uGrow, uSun;
out vec3 vCol;
out float vA;
void main(){
  vec3 p = aP.xyz;
  p.y += sin(uTime * 0.8 + aP.w * 40.0) * 0.25;
  float ss = sin(uSpin), cc = cos(uSpin);
  p = vec3(p.x * cc - p.z * ss, p.y, p.x * ss + p.z * cc);
  vec4 cp = uVP * vec4(p, 1.0);
  gl_Position = cp;
  float tw = 0.55 + 0.45 * sin(uTime * 2.0 + aP.w * 57.0);
  vCol = aC.rgb;
  vA = tw * aC.a * uGrow * (0.35 + 0.65 * uSun);
  gl_PointSize = aC.a * 120.0 / max(cp.w, 1.0) * (0.7 + 0.6 * tw);
}`;

  const FS_POINT = `#version 300 es
precision highp float;
in vec3 vCol;
in float vA;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  float a = smoothstep(0.5, 0.0, r);
  o = vec4(vCol, a * a * vA);
}`;

  /* ---- 飘落花瓣 ---- */
  const VS_PETAL = `#version 300 es
precision highp float;
layout(location=0) in vec4 aP;
uniform mat4 uVP;
uniform float uTime, uSpin, uGrow, uAsh;
out vec3 vCol;
out float vA;
out float vRot;
void main(){
  float t = fract(uTime * 0.045 + aP.w * 13.0);
  float y = mix(24.0, 0.4, t);
  float sway = sin(t * 22.0 + aP.w * 31.0) * (1.4 + aP.w * 1.6);
  vec3 p = vec3(aP.x + sway, y, aP.z + cos(t * 16.0 + aP.w * 17.0) * 1.2);
  float ss = sin(uSpin), cc = cos(uSpin);
  p = vec3(p.x * cc - p.z * ss, p.y, p.x * ss + p.z * cc);
  vec4 cp = uVP * vec4(p, 1.0);
  gl_Position = cp;
  gl_PointSize = (2.0 + aP.w * 3.4) * 44.0 / max(cp.w, 1.0);
  vCol = mix(vec3(0.95, 0.10, 0.32), vec3(0.66, 0.16, 0.98), aP.w);
  vA = (1.0 - smoothstep(0.55, 1.0, uAsh)) * uGrow * (0.35 + 0.65 * sin(t * 3.14159));
  vRot = t * 9.0 + aP.w * 20.0;
}`;

  const FS_PETAL = `#version 300 es
precision highp float;
in vec3 vCol;
in float vA;
in float vRot;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  vec2 q = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  float m = length(vec2(q.x * 2.6, q.y * 1.05));
  float a = smoothstep(0.5, 0.18, m);
  o = vec4(vCol * (0.8 + 0.5 * a), a * vA * 0.9);
}`;

  /* ---- 墨流体 ---- */
  const FS_INK = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform vec2 uRes;
uniform float uTime, uInk, uAct;
${COMMON}
void main(){
  float asp = uRes.x / max(uRes.y, 1.0);
  vec2 p = (vUv - 0.5) * vec2(asp, 1.0) * 2.6;
  float t = uTime * 0.045;
  vec2 q = vec2(fbm4(p + vec2(0.0, t)), fbm4(p + vec2(5.2, 1.3) - t * 0.7));
  vec2 r = vec2(fbm4(p + 3.2 * q + vec2(1.7, 9.2) + t * 1.3),
                fbm4(p + 3.2 * q + vec2(8.3, 2.8) - t * 1.1));
  float f = fbm6(p + 3.6 * r);
  float g = fbm4(p * 0.6 - r * 1.4 + t * 0.6);

  vec3 col = mix(vec3(0.012, 0.016, 0.026), vec3(0.075, 0.10, 0.16), f * 1.25);
  col = mix(col, vec3(0.24, 0.31, 0.44), smoothstep(0.62, 0.94, f) * 0.42);
  col += vec3(0.10, 0.16, 0.26) * pow(g, 3.0) * 0.55;
  /* 墨的边缘丝 */
  float edge = smoothstep(0.48, 0.52, f) * smoothstep(0.56, 0.52, f);
  col += vec3(0.30, 0.38, 0.50) * edge * 0.28;
  /* 顶部更暗，底部略有反光 */
  col *= 0.85 + 0.30 * (1.0 - vUv.y);
  /* 墨的浓度：低的时候半透，让下面的天光透出来；浸满时完全不透 */
  float a = clamp(uInk * 1.12, 0.0, 1.0);
  o = vec4(col, a);
}`;

  /* ---- 雨滴 ---- */
  const VS_RAIN = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aTail;
uniform mat4 uVP;
uniform float uBlood, uSpin;
out float vA;
void main(){
  float ss = sin(uSpin), cc = cos(uSpin);
  vec3 p = vec3(aPos.x * cc - aPos.z * ss, aPos.y, aPos.x * ss + aPos.z * cc);
  vA = uBlood;
  gl_Position = uVP * vec4(p, 1.0);
}`;

  const FS_RAIN = `#version 300 es
precision highp float;
in float vA;
out vec4 o;
void main(){ o = vec4(0.78, 0.10, 0.14, 0.62 * vA); }`;

  /* ---- 血海 ---- */
  const FS_SEA = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uSea, uTime;
uniform vec3 uCam;
${COMMON}
void main(){
  float y0 = uSea;
  if (y0 <= 0.001) discard;
  float rip = 0.004 * sin(vUv.x * 46.0 + uTime * 2.6) + 0.003 * sin(vUv.x * 91.0 - uTime * 3.7);
  float edge = y0 + rip;
  if (vUv.y > edge) discard;
  float d = clamp((edge - vUv.y) / max(edge, 0.001), 0.0, 1.0);
  vec3 top = vec3(0.78, 0.12, 0.14);
  vec3 mid = vec3(0.44, 0.035, 0.06);
  vec3 deep = vec3(0.13, 0.008, 0.02);
  vec3 col = mix(top, mid, smoothstep(0.0, 0.18, d));
  col = mix(col, deep, smoothstep(0.22, 1.0, d));
  float b = fbm4(vec2(vUv.x * 7.0, vUv.y * 26.0 - uTime * 0.55));
  col += vec3(0.55, 0.14, 0.12) * pow(b, 3.2) * 0.55;
  float hb = smoothstep(0.55, 0.98, fbm4(vec2(vUv.x * 3.2 + uTime * 0.05, vUv.y * 9.0)));
  col += vec3(0.34, 0.05, 0.06) * hb * 0.5;
  col += vec3(1.0, 0.62, 0.60) * smoothstep(0.010, 0.0, edge - vUv.y) * 0.7;
  o = vec4(col, 1.0);
}`;

  /* ---- 墨污染叠加 ---- */
  const FS_VEIL = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform float uAmt;
void main(){
  vec4 c = texture(uTex, vUv);
  o = vec4(vec3(0.012, 0.014, 0.020), c.a * uAmt);
}`;

  /* ---- 血迹叠加 ---- */
  const FS_BLOOD = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform float uFade;
void main(){
  vec4 c = texture(uTex, vUv);
  o = vec4(c.rgb, c.a * 0.92 * uFade);
}`;

  /* ---- 墨的衰减 ---- */
  const FS_DECAY = `#version 300 es
precision highp float;
out vec4 o;
uniform float uK;
void main(){ o = vec4(0.0, 0.0, 0.0, uK); }`;

  /* ---- 血迹老化 ---- */
  const FS_AGE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform float uDt;
void main(){
  vec4 c = texture(uTex, vUv);
  if (c.a < 0.002) { o = vec4(0.0); return; }
  vec3 brown = vec3(0.135, 0.070, 0.048);
  float k = clamp(uDt * 0.55, 0.0, 0.05);
  c.rgb = mix(c.rgb, brown, k);
  c.a = max(0.20, c.a - uDt * 0.055);
  o = c;
}`;

  /* ---- 软笔刷（污染 / 血） ---- */
  const VS_BRUSH = `#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform vec2 uC, uS;
uniform float uAsp;
out vec2 vUv;
void main(){
  vec2 p = uC + aPos * uS * vec2(1.0 / uAsp, 1.0);
  vUv = aPos;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

  const FS_INKBRUSH = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uR;
${COMMON}
void main(){
  float r = length(vUv);
  float n = fbm4(vUv * 3.4 + 11.0);
  float a = smoothstep(1.0, 0.15, r + n * 0.35) * 0.85;
  o = vec4(0.0, 0.0, 0.0, a);
}`;

  const FS_BLOODBRUSH = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uR;
${COMMON}
void main(){
  float r = length(vUv);
  float n = fbm4(vUv * 4.0 + 3.0);
  float core = smoothstep(1.0, 0.0, r);
  float a = core * (0.55 + 0.45 * n);
  /* 溅射小点 */
  float sp = step(0.82, hash21(floor(vUv * 7.0) + n * 4.0)) * smoothstep(1.2, 0.4, r) * 0.5;
  o = vec4(mix(vec3(0.52, 0.03, 0.06), vec3(0.30, 0.02, 0.03), n), (a + sp) * 0.9);
}`;

  /* ------------------------------------------------------------ 引擎 */
  function create(canvas) {
    const gl = canvas.getContext('webgl2', {
      antialias: true, alpha: false, depth: true, stencil: false,
      premultipliedAlpha: false, powerPreference: 'high-performance'
    });
    if (!gl) return null;

    const S = {
      act: 0, camTop: 0, spin: 0, grow: 1, ash: 0, ink: 0, blood: 0, sea: 0, sun: 1,
      mx: 0, my: 0, glow: 1,
      wash: 0,      /* 0 = 墨自己慢慢干，1 = 泡在清水里洗（很慢） */
      bedRise: 0    /* 0 = 湖底在原位，1 = 湖底升到水面之上 */
    };

    /* --- program --- */
    function sh(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('[odyssey gl] shader:', gl.getShaderInfoLog(s), src.slice(0, 200));
        return null;
      }
      return s;
    }
    function prog(vs, fs) {
      const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
      if (!v || !f) return null;
      const p = gl.createProgram();
      gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error('[odyssey gl] link:', gl.getProgramInfoLog(p));
        return null;
      }
      const cache = {};
      return {
        p: p,
        u: function (n) {
          if (!(n in cache)) cache[n] = gl.getUniformLocation(p, n);
          return cache[n];
        }
      };
    }

    const P = {
      sky: prog(VS_QUAD, FS_SKY),
      bed: prog(VS_PLANE, FS_BED),
      shore: prog(VS_PLANE, FS_SHORE),
      water: prog(VS_PLANE, FS_WATER),
      flower: prog(VS_FLOWER, FS_FLOWER),
      tree: prog(VS_TREE, FS_TREE),
      point: prog(VS_POINT, FS_POINT),
      petal: prog(VS_PETAL, FS_PETAL),
      ink: prog(VS_QUAD, FS_INK),
      rain: prog(VS_RAIN, FS_RAIN),
      sea: prog(VS_QUAD, FS_SEA),
      veil: prog(VS_QUAD, FS_VEIL),
      blood: prog(VS_QUAD, FS_BLOOD),
      age: prog(VS_QUAD, FS_AGE),
      inkbrush: prog(VS_BRUSH, FS_INKBRUSH),
      bloodbrush: prog(VS_BRUSH, FS_BLOODBRUSH),
      decay: prog(VS_QUAD, FS_DECAY)
    };

    /* --- 几何 --- */
    function buf(data, target) {
      const b = gl.createBuffer();
      gl.bindBuffer(target || gl.ARRAY_BUFFER, b);
      gl.bufferData(target || gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return b;
    }

    const QUAD = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));

    /* 平面（两个三角形） */
    const planeVerts = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);
    const planeBuf = buf(planeVerts);

    /* 花：7 枚花瓣 + 7 根蕊 */
    function buildFlower() {
      const pos = [], nor = [], uv = [], idx = [];
      const PET = 7;
      function strip(pts, nrmDir, uvS) {
        const base = pos.length / 3;
        for (let i = 0; i < pts.length; i++) {
          for (let side = -1; side <= 1; side += 2) {
            pos.push(pts[i][0] + pts[i][3] * side, pts[i][1], pts[i][2] + pts[i][4] * side);
            nor.push(nrmDir[0], nrmDir[1], nrmDir[2]);
            uv.push(uvS ? uvS[i] : i / (pts.length - 1), side > 0 ? 1 : 0);
          }
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
          idx.push(a, c, b, b, c, d);
        }
      }
      for (let p = 0; p < PET; p++) {
        const rot = (p / PET) * Math.PI * 2;
        const c = Math.cos(rot), s = Math.sin(rot);
        const tx = -s, tz = c;
        const SEG = 14, pts = [];
        for (let i = 0; i <= SEG; i++) {
          const u = i / SEG;
          const rad = 0.14 + 0.50 * Math.pow(u, 1.85);
          const yy = 1.02 * Math.sin(u * Math.PI * 0.70) + 0.16 * u;
          const w = 0.085 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.03)), 0.5) * (1 - 0.5 * u) + 0.004;
          pts.push([c * rad, yy, s * rad, tx * w, tz * w]);
        }
        strip(pts, [c * 0.35, 0.92, s * 0.35], null);
      }
      for (let p = 0; p < PET; p++) {
        const rot = (p / PET) * Math.PI * 2 + 0.42;
        const c = Math.cos(rot), s = Math.sin(rot);
        const tx = -s, tz = c;
        const SEG = 8, pts = [];
        for (let i = 0; i <= SEG; i++) {
          const u = i / SEG;
          const rad = 0.05 + 0.66 * u;
          const yy = 1.55 * u - 0.28 * u * u;
          const w = 0.014 * (1 - 0.4 * u) + 0.002;
          pts.push([c * rad, yy, s * rad, tx * w, tz * w]);
        }
        strip(pts, [c * 0.5, 0.7, s * 0.5], null);
      }
      return {
        pos: new Float32Array(pos), nor: new Float32Array(nor), uv: new Float32Array(uv),
        idx: new Uint16Array(idx), count: idx.length
      };
    }

    const F = buildFlower();
    const tgt = gl.ARRAY_BUFFER;
    const fPos = buf(F.pos), fNor = buf(F.nor), fUv = buf(F.uv);
    const fIdx = buf(F.idx, gl.ELEMENT_ARRAY_BUFFER);

    /* 花田实例 */
    const FLOWERS = 300;
    const instA = new Float32Array(FLOWERS * 4);
    const instB = new Float32Array(FLOWERS * 4);
    (function () {
      const R = rnd(20261023);
      for (let i = 0; i < FLOWERS; i++) {
        let x, z, r;
        const ring = i < 46;
        r = ring ? 12.5 + R() * 5.0 : 16.0 + Math.pow(R(), 0.72) * 40.0;
        const a = R() * Math.PI * 2;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        const sc = 0.62 + Math.pow(R(), 1.6) * 1.35;
        instA[i * 4] = x; instA[i * 4 + 1] = z;
        instA[i * 4 + 2] = R() * Math.PI * 2; instA[i * 4 + 3] = sc;
        instB[i * 4] = R();
        instB[i * 4 + 1] = R();
        const sp = R();
        instB[i * 4 + 2] = sp > 0.982 ? 2 : (sp > 0.958 ? 1 : 0);
        instB[i * 4 + 3] = 0;
      }
    })();
    const fInstA = buf(instA), fInstB = buf(instB);

    /* 树 */
    function buildTree() {
      const R = rnd(7717);
      const segs = [];
      const MAXD = 6;
      const tops = [];
      function branch(a, dir, len, rad, depth) {
        const b = add(a, scl(nrm(dir), len));
        segs.push({ a: a, b: b, r0: rad, r1: rad * 0.66, d: depth / MAXD });
        if (depth >= MAXD || rad < 0.045) { tops.push(b); return; }
        const n = depth < 2 ? 2 : (R() < 0.30 ? 3 : 2);
        for (let i = 0; i < n; i++) {
          const ang = R() * Math.PI * 2;
          const tilt = 0.28 + R() * 0.55;
          const perp = nrm(crs(dir, [Math.cos(ang), 0.12, Math.sin(ang)]));
          let nd = nrm(add(scl(dir, Math.cos(tilt)), scl(perp, Math.sin(tilt))));
          nd = nrm(add(nd, [0, 0.18, 0]));
          branch(b, nd, len * (0.70 + R() * 0.16), rad * 0.66, depth + 1);
        }
      }
      branch([0, 0, 0], [0, 1, 0], 8.6, 0.95, 0);
      return { segs: segs, tops: tops };
    }
    const T = buildTree();
    const TREE_X = -13.5, TREE_Z = -27.0;
    const tA = new Float32Array(T.segs.length * 3);
    const tB = new Float32Array(T.segs.length * 3);
    const tR = new Float32Array(T.segs.length * 3);
    T.segs.forEach(function (s, i) {
      tA[i * 3] = s.a[0] + TREE_X; tA[i * 3 + 1] = s.a[1]; tA[i * 3 + 2] = s.a[2] + TREE_Z;
      tB[i * 3] = s.b[0] + TREE_X; tB[i * 3 + 1] = s.b[1]; tB[i * 3 + 2] = s.b[2] + TREE_Z;
      tR[i * 3] = s.r0; tR[i * 3 + 1] = s.r1; tR[i * 3 + 2] = s.d;
    });
    /* 圆柱几何 */
    const cyl = (function () {
      const P2 = [], N2 = [], U2 = [], I2 = [];
      const SIDES = 9;
      for (let i = 0; i <= SIDES; i++) {
        const a = i / SIDES * Math.PI * 2;
        P2.push(Math.cos(a), 0, Math.sin(a), Math.cos(a), 1, Math.sin(a));
        N2.push(Math.cos(a), 0, Math.sin(a), Math.cos(a), 0, Math.sin(a));
        U2.push(i / SIDES, 0, i / SIDES, 1);
      }
      for (let i = 0; i < SIDES; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        I2.push(a, b, c, b, d, c);
      }
      return {
        pos: new Float32Array(P2), nor: new Float32Array(N2), uv: new Float32Array(U2),
        idx: new Uint16Array(I2)
      };
    })();
    const cPos = buf(cyl.pos), cNor = buf(cyl.nor), cUv = buf(cyl.uv);
    const cIdx = buf(cyl.idx, gl.ELEMENT_ARRAY_BUFFER);
    const tInstA = buf(tA), tInstB = buf(tB), tInstR = buf(tR);

    /* 树冠光点 */
    const GP = [];
    (function () {
      const R = rnd(3313);
      T.tops.forEach(function (p) {
        const n = 3 + Math.floor(R() * 5);
        for (let i = 0; i < n; i++) {
          GP.push(p[0] + (R() - 0.5) * 1.8 + TREE_X, p[1] + (R() - 0.5) * 1.6,
            p[2] + (R() - 0.5) * 1.8 + TREE_Z, R());
        }
      });
      for (let i = 0; i < 260; i++) {
        const a = R() * Math.PI * 2, r = R() * 46;
        GP.push(Math.cos(a) * r, 0.8 + R() * 7.0, Math.sin(a) * r, R());
      }
    })();
    const gpA = new Float32Array(GP.length);
    const gpC = new Float32Array(GP.length / 4 * 4);
    for (let i = 0; i < GP.length / 4; i++) {
      gpC[i * 4] = 0.80 + 0.2 * Math.random();
      gpC[i * 4 + 1] = 0.42 + 0.25 * Math.random();
      gpC[i * 4 + 2] = 0.95;
      gpC[i * 4 + 3] = 0.35 + 0.5 * Math.random();
    }
    gpA.set(GP);
    const gpBuf = buf(gpA), gpCBuf = buf(gpC);

    /* 花瓣 */
    const NPT = 190, petalA = new Float32Array(NPT * 4);
    (function () {
      const R = rnd(9091);
      for (let i = 0; i < NPT; i++) {
        const a = R() * Math.PI * 2, r = 8 + R() * 40;
        petalA[i * 4] = Math.cos(a) * r;
        petalA[i * 4 + 1] = 0;
        petalA[i * 4 + 2] = Math.sin(a) * r;
        petalA[i * 4 + 3] = R();
      }
    })();
    const petalBuf = buf(petalA);

    /* 雨 */
    const NRAIN = 240;
    const rainPos = new Float32Array(NRAIN * 2 * 3);
    const rainState = [];
    (function () {
      const R = rnd(5150);
      for (let i = 0; i < NRAIN; i++) {
        rainState.push({
          x: (R() - 0.5) * 46, z: (R() - 0.5) * 46,
          y: R() * 26, v: 15 + R() * 16, seed: R()
        });
      }
    })();
    const rainBuf = buf(rainPos);
    let lastStamp = 0;

    /* --- FBO --- */
    function mkFBO(size, sizeY) {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, sizeY, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.viewport(0, 0, size, sizeY);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { tex: tex, fb: fb, w: size, h: sizeY };
    }
    const inkFBO = mkFBO(512, 512);
    let bloodA = mkFBO(512, 512), bloodB = mkFBO(512, 512);

    function bindVAO(setup) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      setup();
      gl.bindVertexArray(null);
      return vao;
    }
    function attr(loc, b, n, stride, off) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, n, gl.FLOAT, false, stride || 0, off || 0);
    }

    /* 天空 VAO */
    let vaoSky = gl.createVertexArray();

    /* 平面 VAO */
    const vaoPlane = bindVAO(function () { attr(0, planeBuf, 2); });

    /* 花 VAO */
    const vaoFlower = bindVAO(function () {
      attr(0, fPos, 3); attr(1, fNor, 3); attr(2, fUv, 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fIdx);
      attr(3, fInstA, 4); gl.vertexAttribDivisor(3, 1);
      attr(4, fInstB, 4); gl.vertexAttribDivisor(4, 1);
    });

    /* 树 VAO */
    const vaoTree = bindVAO(function () {
      attr(0, cPos, 3); attr(1, cNor, 3); attr(2, cUv, 2);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cIdx);
      attr(3, tInstA, 3); gl.vertexAttribDivisor(3, 1);
      attr(4, tInstB, 3); gl.vertexAttribDivisor(4, 1);
      attr(5, tInstR, 3); gl.vertexAttribDivisor(5, 1);
    });

    /* 点 VAO */
    const vaoPoint = bindVAO(function () { attr(0, gpBuf, 4); attr(1, gpCBuf, 4); });
    const vaoPetal = bindVAO(function () { attr(0, petalBuf, 4); });
    const vaoRain = bindVAO(function () { attr(0, rainBuf, 3); });
    const vaoQuad = bindVAO(function () { attr(0, QUAD, 2); });

    /* 刷子 VAO（用 QUAD 作为 [-1,1] 方形但需要三角形带 4 点） */
    const quadIdx = buf(new Uint16Array([0, 1, 2, 2, 1, 3]), gl.ELEMENT_ARRAY_BUFFER);
    const vaoBrush = gl.createVertexArray();
    gl.bindVertexArray(vaoBrush);
    attr(0, QUAD, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quadIdx);
    gl.bindVertexArray(null);

    const vaoScreenBlit = gl.createVertexArray(); /* 全屏三角用 gl_VertexID，空 VAO 即可 */

    /* --- 尺寸 --- */
    let W = 1, H = 1, DPR = 1;
    function resize() {
      DPR = Math.min(w.devicePixelRatio || 1, 1.6);
      const cw = canvas.clientWidth || w.innerWidth;
      const ch = canvas.clientHeight || w.innerHeight;
      W = Math.max(1, Math.floor(cw * DPR));
      H = Math.max(1, Math.floor(ch * DPR));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W; canvas.height = H;
      }
    }

    /* --- 相机 --- */
    const cam = { eye: [0, 4.6, 17.5], ctr: [0, 3.2, -10], up: [0, 1, 0], fov: 52 };
    function updateCam() {
      const t = ease(clamp(S.camTop, 0, 1));
      const eye = mix3([S.mx * 2.6, 4.8 - S.my * 1.5, 17.8], [0.001, 70, 0.001], t);
      const ctr = mix3([S.mx * 0.7, 3.3 - S.my * 0.5, -10], [0, 0, 0], t);
      const up = mix3([0, 1, 0], [0, 0, -1], t);
      cam.eye = eye; cam.ctr = ctr; cam.up = up;
      cam.fov = (52 + (46 - 52) * t) * Math.PI / 180;
    }

    /* --- 调色 --- */
    const PAL = [
      { /* 彼岸 */
        a: [0.055, 0.020, 0.115], b: [0.240, 0.075, 0.320], c: [0.360, 0.130, 0.340],
        sun: [0.72, 0.52, 1.00], haze: [0.30, 0.12, 0.42], fog: [0.115, 0.055, 0.175],
        skyTint: [0.30, 0.16, 0.44]
      },
      { /* 影蚀 */
        a: [0.008, 0.011, 0.020], b: [0.038, 0.050, 0.078], c: [0.070, 0.085, 0.120],
        sun: [0.30, 0.38, 0.55], haze: [0.06, 0.08, 0.12], fog: [0.045, 0.058, 0.085],
        skyTint: [0.10, 0.13, 0.20]
      },
      { /* 血雨 */
        a: [0.030, 0.006, 0.012], b: [0.115, 0.020, 0.035], c: [0.185, 0.040, 0.050],
        sun: [0.85, 0.20, 0.22], haze: [0.16, 0.04, 0.06], fog: [0.105, 0.030, 0.045],
        skyTint: [0.18, 0.06, 0.09]
      },
      { /* 镜面 */
        a: [0.020, 0.004, 0.008], b: [0.070, 0.012, 0.020], c: [0.120, 0.020, 0.028],
        sun: [0.60, 0.15, 0.18], haze: [0.10, 0.02, 0.03], fog: [0.06, 0.012, 0.02],
        skyTint: [0.12, 0.03, 0.05]
      }
    ];
    const cur = {
      a: PAL[0].a.slice(), b: PAL[0].b.slice(), c: PAL[0].c.slice(),
      sun: PAL[0].sun.slice(), haze: PAL[0].haze.slice(), fog: PAL[0].fog.slice(),
      skyTint: PAL[0].skyTint.slice()
    };
    function blendPal(dt) {
      const t = PAL[clamp(S.act, 0, 3)];
      const k = clamp(dt * 1.6, 0, 1);
      ['a', 'b', 'c', 'sun', 'haze', 'fog', 'skyTint'].forEach(function (key) {
        for (let i = 0; i < 3; i++) cur[key][i] += (t[key][i] - cur[key][i]) * k;
      });
    }

    /* --- 渲染 --- */
    let last = 0, acc = 0;
    const LAKE_R = 15.5;

    function drawSky(t) {
      gl.useProgram(P.sky.p);
      gl.bindVertexArray(vaoSky);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.uniform2f(P.sky.u('uRes'), W, H);
      gl.uniform1f(P.sky.u('uTime'), t);
      gl.uniform1f(P.sky.u('uSun'), S.sun * (1.0 - clamp(S.camTop, 0, 1) * 0.985));
      gl.uniform1f(P.sky.u('uTop'), S.camTop);
      gl.uniform1f(P.sky.u('uAsh'), S.ash);
      gl.uniform3fv(P.sky.u('uSkyA'), cur.a);
      gl.uniform3fv(P.sky.u('uSkyB'), cur.b);
      gl.uniform3fv(P.sky.u('uSkyC'), cur.c);
      gl.uniform3fv(P.sky.u('uSunCol'), cur.sun);
      gl.uniform3fv(P.sky.u('uHaze'), cur.haze);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function drawInk(t) {
      if (S.ink <= 0.004) return;
      gl.useProgram(P.ink.p);
      gl.bindVertexArray(vaoSky);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(P.ink.u('uRes'), W, H);
      gl.uniform1f(P.ink.u('uTime'), t);
      gl.uniform1f(P.ink.u('uInk'), S.ink);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    }

    function drawPlane(pr, t, y, scale) {
      gl.useProgram(pr.p);
      gl.bindVertexArray(vaoPlane);
      gl.enable(gl.DEPTH_TEST);
      gl.uniformMatrix4fv(pr.u('uVP'), false, VP);
      gl.uniform1f(pr.u('uSpin'), S.spin);
      gl.uniform1f(pr.u('uTime'), t);
      gl.uniform1f(pr.u('uY'), y);
      gl.uniform1f(pr.u('uScale'), scale);
      gl.uniform1f(pr.u('uLakeR'), LAKE_R);
      gl.uniform3fv(pr.u('uCam'), cam.eye);
      return true;
    }

    const mIdent = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    let VP = mIdent;

    function drawBed(t) {
      /* 湖底：正常情况下沉在水下 1.6，湖底上升时抬到水面之上 */
      drawPlane(P.bed, t, -1.6 + 1.44 * clamp(S.bedRise, 0, 1), 90);
      gl.uniform1f(P.bed.u('uAct'), S.act);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawShore(t) {
      if (!P.shore) return;
      drawPlane(P.shore, t, -0.05, 96);
      gl.uniform1f(P.shore.u('uAsh'), S.ash);
      gl.uniform3fv(P.shore.u('uFog'), cur.fog);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function drawWater(t) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      drawPlane(P.water, t, 0, 90);
      gl.uniform3fv(P.water.u('uSkyTint'), cur.skyTint);
      gl.uniform3fv(P.water.u('uSunCol'), cur.sun);
      gl.uniform1f(P.water.u('uInk'), S.ink);
      gl.uniform1f(P.water.u('uBlood'), S.blood);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    function drawFlowers(t) {
      gl.useProgram(P.flower.p);
      gl.bindVertexArray(vaoFlower);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(P.flower.u('uVP'), false, VP);
      gl.uniform1f(P.flower.u('uTime'), t);
      gl.uniform1f(P.flower.u('uGrow'), S.grow);
      gl.uniform1f(P.flower.u('uSpin'), S.spin);
      gl.uniform1f(P.flower.u('uAsh'), S.ash);
      gl.uniform3fv(P.flower.u('uCam'), cam.eye);
      gl.uniform3fv(P.flower.u('uFog'), cur.fog);
      gl.uniform3fv(P.flower.u('uSunCol'), cur.sun);
      gl.drawElementsInstanced(gl.TRIANGLES, F.count, gl.UNSIGNED_SHORT, 0, FLOWERS);
      gl.disable(gl.BLEND);
    }

    function drawTree(t) {
      gl.useProgram(P.tree.p);
      gl.bindVertexArray(vaoTree);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(P.tree.u('uVP'), false, VP);
      gl.uniform1f(P.tree.u('uGrow'), S.grow);
      gl.uniform1f(P.tree.u('uSpin'), S.spin);
      gl.uniform1f(P.tree.u('uAsh'), S.ash);
      gl.uniform1f(P.tree.u('uTime'), t);
      gl.uniform3fv(P.tree.u('uCam'), cam.eye);
      gl.uniform3fv(P.tree.u('uFog'), cur.fog);
      gl.drawElementsInstanced(gl.TRIANGLES, cyl.idx.length, gl.UNSIGNED_SHORT, 0, T.segs.length);
      gl.disable(gl.BLEND);
    }

    function drawPoints(t) {
      gl.useProgram(P.point.p);
      gl.bindVertexArray(vaoPoint);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      gl.uniformMatrix4fv(P.point.u('uVP'), false, VP);
      gl.uniform1f(P.point.u('uTime'), t);
      gl.uniform1f(P.point.u('uSpin'), S.spin);
      gl.uniform1f(P.point.u('uGrow'), S.grow);
      gl.uniform1f(P.point.u('uSun'), Math.max(0.25, S.sun));
      gl.drawArrays(gl.POINTS, 0, gpA.length / 4);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    function drawPetals(t) {
      gl.useProgram(P.petal.p);
      gl.bindVertexArray(vaoPetal);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniformMatrix4fv(P.petal.u('uVP'), false, VP);
      gl.uniform1f(P.petal.u('uTime'), t);
      gl.uniform1f(P.petal.u('uSpin'), S.spin);
      gl.uniform1f(P.petal.u('uGrow'), S.grow);
      gl.uniform1f(P.petal.u('uAsh'), S.ash);
      gl.drawArrays(gl.POINTS, 0, NPT);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    function drawRain(t, dt) {
      /* CPU 雨滴 */
      for (let i = 0; i < NRAIN; i++) {
        const r = rainState[i];
        r.y -= r.v * dt;
        if (r.y < 0.15) {
          /* 落地 → 屏幕坐标 → 血印（限流，帧末统一落笔） */
          const p = project(r.x, 0.02, r.z);
          if (p && p[2] > 0 && p[2] < 1 && pending.length < 7) {
            const u = p[0] * 0.5 + 0.5, v = p[1] * 0.5 + 0.5;
            if (u > -0.1 && u < 1.1 && v > -0.1 && v < 1.1) {
              pending.push([u, v, 0.014 + r.seed * 0.030]);
            }
          }
          r.y = 22 + r.seed * 8;
          r.v = 16 + r.seed * 16;
        }
        const i6 = i * 6;
        rainPos[i6] = r.x; rainPos[i6 + 1] = r.y; rainPos[i6 + 2] = r.z;
        rainPos[i6 + 3] = r.x; rainPos[i6 + 4] = r.y + 0.9 + r.v * 0.03; rainPos[i6 + 5] = r.z;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, rainBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, rainPos);

      gl.useProgram(P.rain.p);
      gl.bindVertexArray(vaoRain);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(P.rain.u('uVP'), false, VP);
      gl.uniform1f(P.rain.u('uBlood'), S.blood);
      gl.uniform1f(P.rain.u('uSpin'), S.spin);
      gl.drawArrays(gl.LINES, 0, NRAIN * 2);
      gl.disable(gl.BLEND);
    }

    function drawSea(t) {
      if (S.sea <= 0.002) return;
      gl.useProgram(P.sea.p);
      gl.bindVertexArray(vaoSky);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform1f(P.sea.u('uSea'), S.sea);
      gl.uniform1f(P.sea.u('uTime'), t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    }

    function drawVeil() {
      /* 墨污染：只有影蚀这一幕在叠 */
      if (S.act !== 1) return;
      gl.useProgram(P.veil.p);
      gl.bindVertexArray(vaoSky);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inkFBO.tex);
      gl.uniform1i(P.veil.u('uTex'), 0);
      gl.uniform1f(P.veil.u('uAmt'), 0.97);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    }

    function drawBloodLayer() {
      gl.useProgram(P.blood.p);
      gl.bindVertexArray(vaoSky);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bloodA.tex);
      gl.uniform1i(P.blood.u('uTex'), 0);
      gl.uniform1f(P.blood.u('uFade'), Math.max(0, Math.min(1, S.blood)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
    }

    /* 血迹老化 ping-pong */
    function ageBlood(dt) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, bloodB.fb);
      gl.viewport(0, 0, bloodB.w, bloodB.h);
      gl.useProgram(P.age.p);
      gl.bindVertexArray(vaoSky);
      gl.disable(gl.BLEND);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, bloodA.tex);
      gl.uniform1i(P.age.u('uTex'), 0);
      gl.uniform1f(P.age.u('uDt'), dt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const t2 = bloodA; bloodA = bloodB; bloodB = t2;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* 墨污染衰减：dst *= k */
    function decayInk(dt) {
      const k = Math.exp(-dt * (0.030 + S.wash * 0.16));
      gl.bindFramebuffer(gl.FRAMEBUFFER, inkFBO.fb);
      gl.viewport(0, 0, inkFBO.w, inkFBO.h);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ZERO, gl.SRC_ALPHA);
      gl.useProgram(P.decay.p);
      gl.bindVertexArray(vaoSky);
      gl.uniform1f(P.decay.u('uK'), k);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* 笔刷绘制（污染 / 血） */
    function brushOn(fbo, u, v, size, blood) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.fb);
      gl.viewport(0, 0, fbo.w, fbo.h);
      const pr = blood ? P.bloodbrush : P.inkbrush;
      gl.useProgram(pr.p);
      gl.bindVertexArray(vaoBrush);
      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform2f(pr.u('uC'), u * 2 - 1, v * 2 - 1);
      gl.uniform2f(pr.u('uS'), size * 2, size * 2);
      gl.uniform1f(pr.u('uAsp'), fbo.w / fbo.h);
      gl.uniform1f(pr.u('uR'), size);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    const pending = [];
    function stampBlood(u, v, size) {
      brushOn(bloodA, u, v, Math.max(0.004, size), true);
    }
    function poke(u, v, size) {
      brushOn(inkFBO, u, v, Math.max(0.01, size), false);
    }

    /* 投影工具 */
    function project(x, y, z) {
      const m = VP;
      const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
      const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
      const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
      if (cw <= 0) return null;
      return [cx / cw, cy / cw, cw];
    }

    /* 主循环 */
    function render(now) {
      if (!last) last = now;
      let dt = (now - last) / 1000;
      if (dt > 0.06) dt = 0.06;
      last = now;
      const t = now / 1000;
      acc += dt;

      resize();
      gl.viewport(0, 0, W, H);
      const asp = W / Math.max(H, 1);
      updateCam();
      const proj = persp(cam.fov, asp, 0.1, 260);
      const view = lookAt(cam.eye, cam.ctr, cam.up);
      VP = mul(proj, view);

      blendPal(dt);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0.02, 0.01, 0.04, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);

      drawSky(t);

      const showWorld = S.act <= 2;
      if (S.act >= 1 && S.ink > 0.004) drawInk(t);

      if (showWorld) {
        drawBed(t);
        drawShore(t);
        if (S.act <= 1 && S.grow > 0.001) {
          drawFlowers(t);
          drawTree(t);
        }
        drawWater(t);
        if (S.act <= 1 && S.grow > 0.001) {
          drawPoints(t);
          drawPetals(t);
        }
        if (S.act === 2) drawRain(t, dt);
      }

      drawSea(t);

      /* 后处理叠加 */
      gl.disable(gl.DEPTH_TEST);
      gl.bindVertexArray(vaoSky);
      if (S.ash > 0.001 && S.act <= 1) {
        /* 飞灰：只是一层灰雾，靠粒子感 */
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      }
      /* 帧末统一落血印，避免打断主 pass 的 viewport */
      if (pending.length) {
        for (let i = 0; i < pending.length; i++) {
          stampBlood(pending[i][0], pending[i][1], pending[i][2]);
        }
        pending.length = 0;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
        gl.disable(gl.DEPTH_TEST);
      }

      decayInk(dt);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      drawVeil();
      drawBloodLayer();

      /* 血迹老化（每 ~80ms 一次） */
      if (acc > 0.08) {
        ageBlood(Math.min(acc, 0.2));
        acc = 0;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, W, H);
      }
      gl.bindVertexArray(null);
    }

    return {
      gl: gl, s: S, render: render, resize: resize,
      stampBlood: stampBlood, poke: poke, project: project,
      clearBlood: function () {
        [bloodA, bloodB].forEach(function (f) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
          gl.viewport(0, 0, f.w, f.h);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        });
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      },
      clearInk: function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, inkFBO.fb);
        gl.viewport(0, 0, inkFBO.w, inkFBO.h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    };
  }

  w.ODGL = { create: create };
})(window);
