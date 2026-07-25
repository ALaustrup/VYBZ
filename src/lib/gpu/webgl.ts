/** Minimal WebGL2 helpers for VYBZ reactive surfaces. */

export function createGl(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  try {
    return canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    return null;
  }
}

export function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("[vybz-gpu]", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function linkProgram(
  gl: WebGL2RenderingContext,
  vsSrc: string,
  fsSrc: string,
): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[vybz-gpu]", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

export function fullscreenQuad(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

export function createSpectrumTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 64, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(64));
  return tex;
}

export function uploadSpectrum(
  gl: WebGL2RenderingContext,
  tex: WebGLTexture,
  spectrum: Uint8Array,
  width = 64,
) {
  const w = Math.max(16, Math.min(128, width));
  const row = new Uint8Array(w);
  const n = spectrum.length;
  for (let i = 0; i < w; i++) {
    const lo = Math.floor((i / w) * n);
    const hi = Math.floor(((i + 1) / w) * n);
    let s = 0;
    let c = 0;
    for (let j = lo; j < hi && j < n; j++) {
      s += spectrum[j];
      c++;
    }
    row[i] = c ? Math.min(255, (s / c) * 1.15) : 0;
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, 1, 0, gl.RED, gl.UNSIGNED_BYTE, row);
}
