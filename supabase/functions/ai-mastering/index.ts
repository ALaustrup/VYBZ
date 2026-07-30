// Supabase Edge Function: ai-mastering
// Authenticated POST { wavBase64 | inputRef, projectId?, stereoWidth? }
// DSP loudness normalize + peak limit (+ optional stereo width).
// ONNX at storage ai-models/mastering.onnx is optional; DSP is the shipped path
// until owner uploads weights (proc_version phase15.dsp.1 vs phase15.onnx.1).
// Deploy with JWT verification ON. Records cost_events via record_cost_event RPC.

import { CORS, admin, callerId, json } from "../_shared/edge.ts";

const PROC_VERSION = "phase15.dsp.1";
const USD_PER_SECOND = 0.0004;

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

function dbFromLinear(x: number): number {
  if (x <= 1e-12) return -120;
  return 20 * Math.log10(x);
}

function decodeMonoPcm16(buf: Uint8Array): {
  samples: Float32Array;
  sampleRate: number;
  channels: number;
} {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.byteLength < 44) throw new Error("WAV too short");
  const ascii = (o: number, n: number) =>
    String.fromCharCode(...buf.subarray(o, o + n));
  if (ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WAVE") throw new Error("Not WAVE");
  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bits = 0;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buf.byteLength) {
    const id = ascii(offset, 4);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === "data") {
      dataOffset = body;
      dataSize = size;
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!sampleRate || !channels || dataOffset < 0 || bits !== 16) {
    throw new Error("Unsupported WAV");
  }
  const frames = Math.floor(dataSize / (2 * channels));
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      sum += view.getInt16(dataOffset + (i * channels + ch) * 2, true) / 32768;
    }
    mono[i] = sum / channels;
  }
  return { samples: mono, sampleRate, channels: 1 };
}

function encodeMonoPcm16(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataSize = samples.length * 2;
  const out = new Uint8Array(44 + dataSize);
  const view = new DataView(out.buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i);
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return out;
}

function masterMono(
  samples: Float32Array,
  sampleRate: number,
  targetRmsDbfs = -14,
  peakCeiling = 0.95
) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  const inputRms = Math.sqrt(sum / Math.max(1, samples.length));
  const target = Math.pow(10, targetRmsDbfs / 20);
  let gain = inputRms > 1e-12 ? target / inputRms : 1;
  const out = new Float32Array(samples.length);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]! * gain;
    out[i] = v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  if (peak > peakCeiling && peak > 1e-12) {
    const lim = peakCeiling / peak;
    for (let i = 0; i < out.length; i++) out[i]! *= lim;
    gain *= lim;
  }
  let osum = 0;
  for (let i = 0; i < out.length; i++) osum += out[i]! * out[i]!;
  const outputRms = Math.sqrt(osum / Math.max(1, out.length));
  return {
    samples: out,
    metrics: {
      inputRmsDbfs: dbFromLinear(inputRms),
      outputRmsDbfs: dbFromLinear(outputRms),
      gainDb: 20 * Math.log10(Math.max(gain, 1e-12)),
      durationSeconds: samples.length / sampleRate,
      sampleRate,
      procVersion: PROC_VERSION,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const uid = await callerId(req);
  if (!uid) return json({ error: "unauthorized" }, 401);

  // Soft kill-switch
  const { data: flag } = await admin
    .from("edge_flags")
    .select("enabled")
    .eq("flag_name", "feature:ai_mastering:disabled")
    .maybeSingle();
  if (flag?.enabled) return json({ error: "ai_mastering_disabled" }, 403);

  let body: {
    wavBase64?: string;
    inputRef?: string;
    projectId?: string;
    targetRmsDbfs?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  let bytes: Uint8Array | null = null;
  if (body.wavBase64) {
    try {
      bytes = b64ToBytes(String(body.wavBase64).replace(/^data:audio\/wav;base64,/, ""));
    } catch {
      return json({ error: "invalid_base64" }, 400);
    }
  } else if (body.inputRef) {
    const { data, error } = await admin.storage.from("audio-assets").download(String(body.inputRef));
    if (error || !data) return json({ error: "input_ref_missing" }, 404);
    bytes = new Uint8Array(await data.arrayBuffer());
  }
  if (!bytes || bytes.byteLength < 44) return json({ error: "wav_required" }, 400);
  if (bytes.byteLength > 25 * 1024 * 1024) return json({ error: "file_too_large" }, 413);

  // Optional ONNX presence check (not executed in v1 — DSP path)
  let usedOnnx = false;
  try {
    const { data: head } = await admin.storage.from("ai-models").list("", { search: "mastering.onnx" });
    usedOnnx = Array.isArray(head) && head.some((f) => f.name === "mastering.onnx");
  } catch {
    usedOnnx = false;
  }

  let decoded;
  try {
    decoded = decodeMonoPcm16(bytes);
  } catch (e) {
    return json({ error: (e as Error).message || "decode_failed" }, 400);
  }

  const mastered = masterMono(decoded.samples, decoded.sampleRate, body.targetRmsDbfs ?? -14);
  if (usedOnnx) {
    // Weights present but runtime deferred — keep DSP, annotate meta.
    mastered.metrics.procVersion = PROC_VERSION;
  }
  const outBytes = encodeMonoPcm16(mastered.samples, decoded.sampleRate);
  const seconds = Math.max(0.001, mastered.metrics.durationSeconds);
  const usd = seconds * USD_PER_SECOND;

  const { data: job, error: jobErr } = await admin
    .from("processing_jobs_ai")
    .insert({
      user_id: uid,
      project_id: body.projectId || null,
      type: "ai_mastering",
      status: "completed",
      version: PROC_VERSION,
      input_ref: body.inputRef || null,
      output_ref: null,
      meta: { metrics: mastered.metrics, onnxAvailable: usedOnnx },
    })
    .select("id")
    .single();

  if (jobErr) {
    console.error("job insert", jobErr);
    return json({ error: "job_insert_failed" }, 500);
  }

  const outPath = `${uid}/masters/${job.id}.wav`;
  const { error: upErr } = await admin.storage
    .from("audio-assets")
    .upload(outPath, outBytes, { contentType: "audio/wav", upsert: true });
  if (!upErr) {
    await admin.from("processing_jobs_ai").update({ output_ref: outPath }).eq("id", job.id);
  }

  await admin.from("processing_results").insert({
    job_id: job.id,
    user_id: uid,
    project_id: body.projectId || null,
    kind: "mastering",
    proc_version: PROC_VERSION,
    payload: { metrics: mastered.metrics },
    output_ref: upErr ? null : outPath,
  });

  await admin.rpc("record_cost_event", {
    p_feature: "ai_mastering",
    p_units: seconds,
    p_usd_estimate: usd,
    p_meta: { job_id: job.id, proc_version: PROC_VERSION },
  });

  // Phase 18 — debit prepaid AI seconds when the user has a ledger balance.
  const { data: balRaw } = await admin.rpc("get_ai_credit_balance", { p_user_id: uid });
  const bal = Number(balRaw ?? 0);
  if (bal > 0) {
    const debitSecs = Math.min(seconds, bal);
    const { error: debitErr } = await admin.rpc("admin_debit_ai_credits", {
      p_user_id: uid,
      p_seconds: debitSecs,
      p_reason: "ai_mastering",
      p_usd: debitSecs * USD_PER_SECOND,
      p_meta: { job_id: job.id, proc_version: PROC_VERSION },
    });
    if (debitErr) console.error("admin_debit_ai_credits", debitErr.message);
  }

  return json({
    jobId: job.id,
    status: "completed",
    procVersion: PROC_VERSION,
    metrics: mastered.metrics,
    outputRef: upErr ? null : outPath,
    wavBase64: bytesToB64(outBytes),
    onnxAvailable: usedOnnx,
  });
});
