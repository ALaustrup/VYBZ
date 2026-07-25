/**
 * WebGL2 Orb engine — SDF plasma sphere + spectral corona + beat shock.
 * Canvas2D OrbSphere remains the fallback when this returns null.
 */

import {
  createGl,
  createSpectrumTexture,
  fullscreenQuad,
  linkProgram,
  uploadSpectrum,
} from "@/lib/gpu/webgl";
import type { ReactiveVisualFrame } from "@/lib/reactiveVisualRuntime";

const VS = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_res;
uniform float u_time;
uniform float u_live;
uniform float u_calm;
uniform float u_fx;
uniform float u_flash;
uniform vec2 u_stick;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_sub;
uniform float u_level;
uniform float u_beat;
uniform float u_onset;
uniform float u_centroid;
uniform float u_morph; // 0 sphere 1 blob 2 bars 3 ring 4 liquid
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform sampler2D u_spec;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash(i); float b = hash(i+vec2(1.,0.));
  float c = hash(i+vec2(0.,1.)); float d = hash(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.-u.x) + (d-b)*u.x*u.y;
}

float spectrumAt(float a){
  float x = fract(a / 6.2831853);
  return texture(u_spec, vec2(x, 0.5)).r;
}

void main(){
  vec2 res = u_res;
  vec2 uv = (v_uv * res - 0.5 * res) / min(res.x, res.y);
  uv -= u_stick * 0.22;
  // Sub squash
  uv.y *= 1.0 + u_sub * 0.12 * u_live;
  uv.x *= 1.0 - u_sub * 0.08 * u_live;

  float t = u_time;
  float amp = clamp(u_fx, 0.0, 1.6);
  float live = clamp(u_live * (1.0 - u_calm), 0.0, 1.0);

  float ang = atan(uv.y, uv.x);
  float sp = spectrumAt(ang + 3.14159);
  float r0 = 0.34 + (u_bass * 0.04 + u_beat * 0.05 + u_level * 0.03) * amp * live;

  // Morph warp
  float warp = 0.0;
  if (u_morph < 0.5) {
    warp = sp * 0.08 * amp * live + u_onset * 0.03 * live;
  } else if (u_morph < 1.5) {
    warp = sin(ang * 3.0 + t * 1.6 + u_bass * 4.0) * 0.05 * amp * live + sp * 0.06 * live;
  } else if (u_morph < 2.5) {
    warp = sp * 0.11 * amp * live;
  } else if (u_morph < 3.5) {
    warp = sp * 0.05 * live;
  } else {
    warp = sin(ang * 4.0 + t * 2.2) * 0.06 * amp * live + sp * 0.07 * live + u_high * 0.04 * live;
  }

  float d = length(uv) - (r0 + warp);
  if (u_morph > 2.5 && u_morph < 3.5) {
    float inner = r0 * (0.55 - u_beat * 0.06 * live);
    d = abs(length(uv) - mix(r0, (r0 + inner) * 0.5, 0.35)) - (r0 - inner) * 0.35;
  }

  // Soft aura
  float aura = exp(-max(d, 0.0) * 6.5) * (0.35 + 0.4 * live + u_beat * 0.25 * live);
  // Corona spokes
  float corona = 0.0;
  if (live > 0.2 && amp > 0.2) {
    float spoke = pow(sp, 1.35) * smoothstep(0.55, 0.2, length(uv)) * smoothstep(0.15, 0.45, length(uv));
    corona = spoke * (0.55 + amp * 0.45) * live;
  }

  // Idle plasma field
  float plasma = 0.0;
  if (live < 0.95) {
    float n1 = noise(uv * 3.2 + t * 0.25);
    float n2 = noise(uv * 6.0 - t * 0.18);
    plasma = smoothstep(0.55, 0.15, length(uv)) * (0.35 + 0.45 * n1 + 0.25 * n2) * (1.0 - live);
  }

  // Neochrome / uploader palette blend
  vec3 idleA = vec3(0.0, 1.0, 0.78);
  vec3 idleB = vec3(0.36, 0.55, 1.0);
  vec3 idleC = vec3(0.78, 0.49, 1.0);
  float hueT = fract(t * 0.04);
  vec3 idle = mix(mix(idleA, idleB, hueT), mix(idleB, idleC, hueT), 0.5);
  vec3 liveCol = mix(u_c0, mix(u_c1, u_c2, u_centroid), 0.55 + u_mid * 0.2);
  vec3 col = mix(idle, liveCol, live);

  float fill = smoothstep(0.02, -0.01, d);
  float rim = smoothstep(0.04, 0.0, abs(d) - 0.01);

  // Specular + flash
  vec2 specP = uv - vec2(-0.12, -0.18) + vec2(u_centroid - 0.45, -u_high * 0.1) * live * 0.2;
  float spec = exp(-dot(specP, specP) * 28.0) * (0.55 + u_flash * 0.5 + u_onset * 0.35 * live);

  // Internal filaments
  float fil = 0.0;
  if (live > 0.3 && amp > 0.35) {
    float a2 = ang + t * (1.2 + u_centroid);
    float rr = length(uv);
    fil = smoothstep(0.08, 0.0, abs(rr - (0.18 + sp * 0.14))) * (0.25 + u_presence_dummy());
  }

  // Beat ring
  float beatRing = 0.0;
  if (u_beat > 0.15 && live > 0.35) {
    float br = abs(length(uv) - (r0 * (1.15 + u_beat * 0.35)));
    beatRing = exp(-br * 40.0) * u_beat * live;
  }

  vec3 rgb = col * (fill * 0.95 + aura * 0.65 + corona * 0.85 + plasma * 0.55);
  rgb += vec3(1.0) * spec * fill;
  rgb += u_c3 * fil * live;
  rgb += mix(u_c0, vec3(1.0), 0.4) * beatRing * 1.2;
  rgb += vec3(1.0) * u_flash * 0.35 * fill;

  // High shimmer motes
  if (live > 0.4 && u_high > 0.1 && amp > 0.45) {
    float m = hash(floor(uv * 40.0 + t * 2.0));
    float mote = step(0.92, m) * smoothstep(0.45, 0.1, length(uv)) * u_high * amp;
    rgb += mix(u_c1, vec3(1.0), 0.3) * mote * 1.4;
  }

  float alpha = clamp(fill + aura * 0.85 + corona * 0.7 + plasma * 0.5 + beatRing * 0.6, 0.0, 1.0);
  // Soft edge
  alpha *= smoothstep(0.72, 0.35, length(uv));
  fragColor = vec4(rgb, alpha);
}

// stub replaced below — u_presence as uniform instead
float u_presence_dummy(){ return u_mid; }
`;

// Fix shader: remove bogus function, use u_mid directly
const FS_FIXED = FS.replace(
  `fil = smoothstep(0.08, 0.0, abs(rr - (0.18 + sp * 0.14))) * (0.25 + u_presence_dummy());
  }

  // Beat ring
  float beatRing = 0.0;
  if (u_beat > 0.15 && live > 0.35) {
    float br = abs(length(uv) - (r0 * (1.15 + u_beat * 0.35)));
    beatRing = exp(-br * 40.0) * u_beat * live;
  }

  vec3 rgb = col * (fill * 0.95 + aura * 0.65 + corona * 0.85 + plasma * 0.55);
  rgb += vec3(1.0) * spec * fill;
  rgb += u_c3 * fil * live;
  rgb += mix(u_c0, vec3(1.0), 0.4) * beatRing * 1.2;
  rgb += vec3(1.0) * u_flash * 0.35 * fill;

  // High shimmer motes
  if (live > 0.4 && u_high > 0.1 && amp > 0.45) {
    float m = hash(floor(uv * 40.0 + t * 2.0));
    float mote = step(0.92, m) * smoothstep(0.45, 0.1, length(uv)) * u_high * amp;
    rgb += mix(u_c1, vec3(1.0), 0.3) * mote * 1.4;
  }

  float alpha = clamp(fill + aura * 0.85 + corona * 0.7 + plasma * 0.5 + beatRing * 0.6, 0.0, 1.0);
  // Soft edge
  alpha *= smoothstep(0.72, 0.35, length(uv));
  fragColor = vec4(rgb, alpha);
}

// stub replaced below — u_presence as uniform instead
float u_presence_dummy(){ return u_mid; }
`,
  `fil = smoothstep(0.08, 0.0, abs(rr - (0.18 + sp * 0.14))) * (0.25 + u_mid);
  }

  // Beat ring
  float beatRing = 0.0;
  if (u_beat > 0.15 && live > 0.35) {
    float br = abs(length(uv) - (r0 * (1.15 + u_beat * 0.35)));
    beatRing = exp(-br * 40.0) * u_beat * live;
  }

  vec3 rgb = col * (fill * 0.95 + aura * 0.65 + corona * 0.85 + plasma * 0.55);
  rgb += vec3(1.0) * spec * fill;
  rgb += u_c3 * fil * live;
  rgb += mix(u_c0, vec3(1.0), 0.4) * beatRing * 1.2;
  rgb += vec3(1.0) * u_flash * 0.35 * fill;

  // High shimmer motes
  if (live > 0.4 && u_high > 0.1 && amp > 0.45) {
    float m = hash(floor(uv * 40.0 + t * 2.0));
    float mote = step(0.92, m) * smoothstep(0.45, 0.1, length(uv)) * u_high * amp;
    rgb += mix(u_c1, vec3(1.0), 0.3) * mote * 1.4;
  }

  float alpha = clamp(fill + aura * 0.85 + corona * 0.7 + plasma * 0.5 + beatRing * 0.6, 0.0, 1.0);
  alpha *= smoothstep(0.72, 0.35, length(uv));
  fragColor = vec4(rgb, alpha);
}
`,
);

export type OrbGpuFrame = {
  time: number;
  liveBlend: number;
  calm: boolean;
  stickX: number;
  stickY: number;
  fxScale: number;
  flash: number;
  morph: number;
  palette: string[];
  rv: ReactiveVisualFrame;
};

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  if (m.length < 6) return [0.2, 0.7, 1];
  return [
    parseInt(m.slice(0, 2), 16) / 255,
    parseInt(m.slice(2, 4), 16) / 255,
    parseInt(m.slice(4, 6), 16) / 255,
  ];
}

export type OrbEngine = {
  resize: (cssSize: number, dpr: number) => void;
  draw: (frame: OrbGpuFrame) => void;
  destroy: () => void;
};

export function createOrbEngine(canvas: HTMLCanvasElement): OrbEngine | null {
  const gl = createGl(canvas);
  if (!gl) return null;
  const prog = linkProgram(gl, VS, FS_FIXED);
  if (!prog) return null;
  const vao = fullscreenQuad(gl);
  const specTex = createSpectrumTexture(gl);

  const loc = (n: string) => gl.getUniformLocation(prog, n);
  const u = {
    res: loc("u_res"),
    time: loc("u_time"),
    live: loc("u_live"),
    calm: loc("u_calm"),
    fx: loc("u_fx"),
    flash: loc("u_flash"),
    stick: loc("u_stick"),
    bass: loc("u_bass"),
    mid: loc("u_mid"),
    high: loc("u_high"),
    sub: loc("u_sub"),
    level: loc("u_level"),
    beat: loc("u_beat"),
    onset: loc("u_onset"),
    centroid: loc("u_centroid"),
    morph: loc("u_morph"),
    c0: loc("u_c0"),
    c1: loc("u_c1"),
    c2: loc("u_c2"),
    c3: loc("u_c3"),
    spec: loc("u_spec"),
  };

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let w = 200;
  let h = 200;

  return {
    resize(cssSize, dpr) {
      const px = Math.floor(cssSize * dpr);
      w = px;
      h = px;
      canvas.width = px;
      canvas.height = px;
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      gl.viewport(0, 0, px, px);
    },
    draw(frame) {
      const { rv } = frame;
      uploadSpectrum(gl, specTex, rv.spectrum, frame.fxScale >= 1 ? 96 : 64);
      const p0 = hexToRgb(frame.palette[0] ?? "#00ffc8");
      const p1 = hexToRgb(frame.palette[1] ?? "#5b8cff");
      const p2 = hexToRgb(frame.palette[2] ?? "#c77dff");
      const p3 = hexToRgb(frame.palette[3] ?? "#34f5a0");

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, specTex);
      gl.uniform1i(u.spec, 0);
      gl.uniform2f(u.res, w, h);
      gl.uniform1f(u.time, frame.time);
      gl.uniform1f(u.live, frame.liveBlend);
      gl.uniform1f(u.calm, frame.calm ? 1 : 0);
      gl.uniform1f(u.fx, frame.fxScale);
      gl.uniform1f(u.flash, frame.flash);
      gl.uniform2f(u.stick, frame.stickX, frame.stickY);
      gl.uniform1f(u.bass, rv.bass);
      gl.uniform1f(u.mid, rv.mid);
      gl.uniform1f(u.high, rv.high);
      gl.uniform1f(u.sub, rv.sub);
      gl.uniform1f(u.level, rv.level);
      gl.uniform1f(u.beat, rv.beat);
      gl.uniform1f(u.onset, rv.onset);
      gl.uniform1f(u.centroid, rv.centroid);
      gl.uniform1f(u.morph, frame.morph);
      gl.uniform3f(u.c0, p0[0], p0[1], p0[2]);
      gl.uniform3f(u.c1, p1[0], p1[1], p1[2]);
      gl.uniform3f(u.c2, p2[0], p2[1], p2[2]);
      gl.uniform3f(u.c3, p3[0], p3[1], p3[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    },
    destroy() {
      gl.deleteTexture(specTex);
      gl.deleteProgram(prog);
      gl.deleteVertexArray(vao);
    },
  };
}

export function morphIdFromFx(fx: string): number {
  switch (fx) {
    case "pulse": return 1;
    case "bars": return 2;
    case "ripple": return 3;
    case "aurora": return 4;
    default: return 0;
  }
}
