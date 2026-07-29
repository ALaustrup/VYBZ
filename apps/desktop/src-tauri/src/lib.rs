mod audio;

use audio::NativeAudioAnalysis;

#[tauri::command]
fn vybz_ping() -> String {
  "pong".into()
}

/// High-res waveform + batch loudness from a local WAV path (desktop Engine).
#[tauri::command]
fn vybz_analyze_audio(path: String, peak_buckets: Option<u32>) -> Result<NativeAudioAnalysis, String> {
  audio::analyze_wav_path(&path, peak_buckets)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![vybz_ping, vybz_analyze_audio])
    .run(tauri::generate_context!())
    .expect("error while running VYBZ Desktop");
}
