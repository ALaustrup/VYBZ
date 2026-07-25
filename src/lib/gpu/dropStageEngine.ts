/**
 * DropStage WebGL2 compositor — full-bleed reactive field for drop banners.
 * Seeded fallback still lives in TrackVisualizer when GPU unavailable.
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
uniform float u_active;
uniform float u_fx;
uniform float u_seed;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_beat;
uniform float u_onset;
uniform float u_level;
uniform float u_centroid;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform sampler2D u_spec;

float hash(float n){ return fract(sin(n) * 43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash2(i); float b = hash2(i+vec2(1.,0.));
  float c = hash2(i+vec2(0.,1.)); float d = hash2(i+vec2(1.,1.));
  vec2 u = f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float spectrumAt(float x){
  return texture(u_spec, vec2(clamp(x, 0.001, 0.999), 0.5)).r;
}

void main(){
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0);
  float t = u_time * (0.35 + u_seed * 0.0001);
  float act = clamp(u_active, 0.0, 1.0);
  float amp = clamp(u_fx, 0.0, 1.6);

  // Seeded style pick
  float style = floor(mod(u_seed, 4.0));

  float bars = 0.0;
  for (int i = 0; i < 48; i++) {
    float fi = float(i) / 48.0;
    float v = spectrumAt(fi);
    float x = (fi - 0.5) * 1.85;
    float h = (0.08 + v * 0.55 * amp) * act + 0.04 * (1.0 - act);
    float d = abs(p.x - x) - 0.012;
    float colH = abs(p.y + 0.15) - h;
    bars += (1.0 - smoothstep(0.0, 0.01, max(d, colH))) * (0.35 + v);
  }

  float rings = 0.0;
  for (int i = 0; i < 5; i++) {
    float rr = 0.12 + float(i) * 0.09 + u_bass * 0.06 * act + u_beat * 0.04 * act;
    float d = abs(length(p) - rr) - 0.006;
    rings += exp(-max(d, 0.0) * 90.0) * (0.4 + u_level * 0.5 * act);
  }

  float field = noise(p * 2.4 + t) * noise(p * 5.0 - t * 0.7);
  float ribbons = sin(p.y * 8.0 + t * 2.0 + u_mid * 4.0 * act + field * 3.0);
  ribbons = pow(abs(ribbons), 4.0) * (0.25 + u_high * 0.5 * act);

  float particles = 0.0;
  for (int i = 0; i < 12; i++) {
    float id = float(i) + u_seed * 0.01;
    vec2 c = vec2(hash(id) - 0.5, hash(id + 3.1) - 0.5) * 1.4;
    c += vec2(sin(t + id), cos(t * 0.8 + id)) * (0.08 + u_beat * 0.1 * act);
    float d = length(p - c);
    particles += exp(-d * 40.0) * (0.3 + u_onset * 0.5 * act);
  }

  float layer = style < 0.5 ? rings
    : style < 1.5 ? bars
    : style < 2.5 ? particles
    : ribbons;

  // Atmospheric wash
  float wash = exp(-length(p) * (1.2 - u_level * 0.3 * act));
  vec3 col = mix(u_c0, u_c1, uv.x + u_centroid * 0.2 * act);
  col = mix(col, u_c2, wash * 0.55);
  col *= 0.25 + wash * 0.45 + layer * (0.55 + amp * 0.35);
  col += u_c1 * u_beat * 0.25 * act;
  col += vec3(1.0) * u_onset * 0.12 * act;

  float alpha = clamp(0.55 + layer * 0.45 + wash * 0.25, 0.0, 0.95);
  fragColor = vec4(col, alpha * (0.75 + 0.25 * act));
}
`;

export type DropStageFrame = {
  time: number;
  active: boolean;
  fxScale: number;
  seed: number;
  palette: string[];
  rv: ReactiveVisualFrame;
};

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  if (m.length < 6) return [0.15, 0.55, 0.95];
  return [
    parseInt(m.slice(0, 2), 16) / 255,
    parseInt(m.slice(2, 4), 16) / 255,
    parseInt(m.slice(4, 6), 16) / 255,
  ];
}

export type DropStageEngine = {
  resize: (w: number, h: number, dpr: number) => void;
  draw: (frame: DropStageFrame) => void;
  destroy: () => void;
};

export function createDropStageEngine(canvas: HTMLCanvasElement): DropStageEngine | null {
  const gl = createGl(canvas);
  if (!gl) return null;
  const prog = linkProgram(gl, VS, FS);
  if (!prog) return null;
  const vao = fullscreenQuad(gl);
  const specTex = createSpectrumTexture(gl);
  const loc = (n: string) => gl.getUniformLocation(prog, n);

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let W = 300;
  let H = 200;

  return {
    resize(cssW, cssH, dpr) {
      W = Math.max(1, Math.floor(cssW * dpr));
      H = Math.max(1, Math.floor(cssH * dpr));
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      gl.viewport(0, 0, W, H);
    },
    draw(frame) {
      uploadSpectrum(gl, specTex, frame.rv.spectrum, frame.fxScale >= 1 ? 96 : 48);
      const p0 = hexToRgb(frame.palette[0] ?? "#34f5a0");
      const p1 = hexToRgb(frame.palette[1] ?? "#00a1ff");
      const p2 = hexToRgb(frame.palette[2] ?? "#ffe566");
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, specTex);
      gl.uniform1i(loc("u_spec"), 0);
      gl.uniform2f(loc("u_res"), W, H);
      gl.uniform1f(loc("u_time"), frame.time);
      gl.uniform1f(loc("u_active"), frame.active ? 1 : 0);
      gl.uniform1f(loc("u_fx"), frame.active ? frame.fxScale : 0);
      gl.uniform1f(loc("u_seed"), frame.seed);
      gl.uniform1f(loc("u_bass"), frame.rv.bass);
      gl.uniform1f(loc("u_mid"), frame.rv.mid);
      gl.uniform1f(loc("u_high"), frame.rv.high);
      gl.uniform1f(loc("u_beat"), frame.rv.beat);
      gl.uniform1f(loc("u_onset"), frame.rv.onset);
      gl.uniform1f(loc("u_level"), frame.rv.level);
      gl.uniform1f(loc("u_centroid"), frame.rv.centroid);
      gl.uniform3f(loc("u_c0"), p0[0], p0[1], p0[2]);
      gl.uniform3f(loc("u_c1"), p1[0], p1[1], p1[2]);
      gl.uniform3f(loc("u_c2"), p2[0], p2[1], p2[2]);
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
