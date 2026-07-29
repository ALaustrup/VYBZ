mod audio;
mod crash;
mod prefs;
mod secure_store;

use audio::NativeAudioAnalysis;
use prefs::WindowPrefs;
use tauri::Manager;

fn app_data_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
  app
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn vybz_ping() -> String {
  "pong".into()
}

/// High-res waveform + batch loudness from a local WAV path (desktop Engine).
#[tauri::command]
fn vybz_analyze_audio(path: String, peak_buckets: Option<u32>) -> Result<NativeAudioAnalysis, String> {
  audio::analyze_wav_path(&path, peak_buckets)
}

#[tauri::command]
fn vybz_window_prefs_get(app: tauri::AppHandle) -> Result<WindowPrefs, String> {
  let dir = app_data_dir(&app)?;
  Ok(prefs::load_prefs(&dir))
}

#[tauri::command]
fn vybz_window_prefs_set(app: tauri::AppHandle, prefs: WindowPrefs) -> Result<(), String> {
  let dir = app_data_dir(&app)?;
  prefs::save_prefs(&dir, &prefs)
}

#[tauri::command]
fn vybz_secure_set(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
  let dir = app_data_dir(&app)?;
  secure_store::secure_set(&dir, &key, &value)
}

#[tauri::command]
fn vybz_secure_get(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
  let dir = app_data_dir(&app)?;
  secure_store::secure_get(&dir, &key)
}

#[tauri::command]
fn vybz_secure_clear(app: tauri::AppHandle, key: Option<String>) -> Result<(), String> {
  let dir = app_data_dir(&app)?;
  secure_store::secure_clear(&dir, key.as_deref())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      if let Ok(dir) = app.path().app_data_dir() {
        crash::init_panic_hook(dir);
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      vybz_ping,
      vybz_analyze_audio,
      vybz_window_prefs_get,
      vybz_window_prefs_set,
      vybz_secure_set,
      vybz_secure_get,
      vybz_secure_clear,
    ])
    .run(tauri::generate_context!())
    .expect("error while running VYBZ Desktop");
}
