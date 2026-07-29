//! High-res waveform peaks + batch loudness for WAV PCM (Phase 4 Processing Engine).
//! Pure Rust — no FFmpeg / paid services.

use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAudioAnalysis {
  pub peaks: Vec<f32>,
  pub bucket_count: u32,
  pub sample_rate: u32,
  pub channels: u16,
  pub duration_seconds: f64,
  pub peak_dbfs: f64,
  pub rms_dbfs: f64,
  pub integrated_lufs_approx: f64,
  pub engine: &'static str,
  pub processing_version: &'static str,
}

fn db_from_linear(x: f64) -> f64 {
  if x <= 1e-12 {
    -120.0
  } else {
    20.0 * (x.log10())
  }
}

fn read_u16(buf: &[u8], o: usize) -> Option<u16> {
  Some(u16::from_le_bytes([*buf.get(o)?, *buf.get(o + 1)?]))
}

fn read_u32(buf: &[u8], o: usize) -> Option<u32> {
  Some(u32::from_le_bytes([
    *buf.get(o)?,
    *buf.get(o + 1)?,
    *buf.get(o + 2)?,
    *buf.get(o + 3)?,
  ]))
}

fn ascii4(buf: &[u8], o: usize) -> Option<&str> {
  std::str::from_utf8(buf.get(o..o + 4)?).ok()
}

/// Decode mono-mixed PCM16/PCM24/PCM32 from a WAV file on disk.
pub fn analyze_wav_path(path: &str, bucket_count: Option<u32>) -> Result<NativeAudioAnalysis, String> {
  let p = Path::new(path);
  if !p.exists() {
    return Err(format!("file not found: {path}"));
  }
  let bytes = fs::read(p).map_err(|e| e.to_string())?;
  analyze_wav_bytes(&bytes, bucket_count)
}

pub fn analyze_wav_bytes(bytes: &[u8], bucket_count: Option<u32>) -> Result<NativeAudioAnalysis, String> {
  if bytes.len() < 44 {
    return Err("WAV too short".into());
  }
  if ascii4(bytes, 0) != Some("RIFF") || ascii4(bytes, 8) != Some("WAVE") {
    return Err("Not a RIFF/WAVE file".into());
  }

  let mut offset = 12usize;
  let mut sample_rate = 0u32;
  let mut channels = 0u16;
  let mut bits = 0u16;
  let mut audio_format = 1u16;
  let mut data_off = None;
  let mut data_size = 0u32;

  while offset + 8 <= bytes.len() {
    let id = ascii4(bytes, offset).unwrap_or("");
    let size = read_u32(bytes, offset + 4).unwrap_or(0) as usize;
    let body = offset + 8;
    if id == "fmt " && body + 16 <= bytes.len() {
      audio_format = read_u16(bytes, body).unwrap_or(1);
      channels = read_u16(bytes, body + 2).unwrap_or(0);
      sample_rate = read_u32(bytes, body + 4).unwrap_or(0);
      bits = read_u16(bytes, body + 14).unwrap_or(0);
    } else if id == "data" {
      data_off = Some(body);
      data_size = size as u32;
      break;
    }
    offset = body + size + (size % 2);
  }

  let data_off = data_off.ok_or("WAV missing data chunk")?;
  if sample_rate == 0 || channels == 0 {
    return Err("WAV missing fmt".into());
  }
  if audio_format != 1 {
    return Err(format!("Unsupported WAV format {audio_format} (PCM only in Phase 4)"));
  }
  let bps = (bits / 8) as usize;
  if bps == 0 || ![1usize, 2, 3, 4].contains(&bps) {
    return Err(format!("Unsupported bit depth {bits}"));
  }

  let frame_count = (data_size as usize) / (bps * channels as usize);
  let mut mono = Vec::with_capacity(frame_count);
  for i in 0..frame_count {
    let mut sum = 0.0f64;
    for ch in 0..channels as usize {
      let pos = data_off + (i * channels as usize + ch) * bps;
      let sample = match bps {
        1 => (bytes[pos] as f64 - 128.0) / 128.0,
        2 => {
          let v = i16::from_le_bytes([bytes[pos], bytes[pos + 1]]);
          v as f64 / 32768.0
        }
        3 => {
          let mut v = (bytes[pos + 2] as i32) << 16 | (bytes[pos + 1] as i32) << 8 | bytes[pos] as i32;
          if v & 0x800000 != 0 {
            v |= !0xffffff;
          }
          v as f64 / 8388608.0
        }
        _ => {
          let v = i32::from_le_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]]);
          v as f64 / 2147483648.0
        }
      };
      sum += sample;
    }
    mono.push(sum / channels as f64);
  }

  let buckets = bucket_count.unwrap_or(2048).clamp(16, 16384) as usize;
  let mut peaks = vec![0.0f32; buckets];
  if !mono.is_empty() {
    let step = mono.len() as f64 / buckets as f64;
    for i in 0..buckets {
      let start = (i as f64 * step).floor() as usize;
      let end = (((i + 1) as f64) * step).floor() as usize;
      let end = end.min(mono.len()).max(start + 1);
      let mut peak = 0.0f64;
      for s in &mono[start..end] {
        let a = s.abs();
        if a > peak {
          peak = a;
        }
      }
      peaks[i] = peak.min(1.0) as f32;
    }
  }

  let mut peak = 0.0f64;
  let mut sum_sq = 0.0f64;
  for s in &mono {
    let a = s.abs();
    if a > peak {
      peak = a;
    }
    sum_sq += s * s;
  }
  let rms = if mono.is_empty() {
    0.0
  } else {
    (sum_sq / mono.len() as f64).sqrt()
  };

  let win = ((sample_rate as f64) * 0.4).floor().max(1.0) as usize;
  let mut gated = Vec::new();
  let mut start = 0usize;
  while start + win <= mono.len() {
    let mut w = 0.0f64;
    for s in &mono[start..start + win] {
      w += s * s;
    }
    let w_rms = (w / win as f64).sqrt();
    if db_from_linear(w_rms) > -70.0 {
      gated.push(w_rms * w_rms);
    }
    start += win;
  }
  let integrated = if gated.is_empty() {
    rms
  } else {
    (gated.iter().sum::<f64>() / gated.len() as f64).sqrt()
  };
  let integrated_lufs = if integrated <= 1e-12 {
    -70.0
  } else {
    -0.691 + 10.0 * (integrated * integrated).log10()
  };

  Ok(NativeAudioAnalysis {
    peaks,
    bucket_count: buckets as u32,
    sample_rate,
    channels,
    duration_seconds: frame_count as f64 / sample_rate as f64,
    peak_dbfs: db_from_linear(peak),
    rms_dbfs: db_from_linear(rms),
    integrated_lufs_approx: integrated_lufs,
    engine: "native",
    processing_version: "phase4.waveform.1",
  })
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn rejects_short_buffer() {
    assert!(analyze_wav_bytes(&[0u8; 10], None).is_err());
  }
}
