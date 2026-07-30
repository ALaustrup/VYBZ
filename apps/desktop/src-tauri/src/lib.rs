mod audio;
mod crash;
mod prefs;
mod secure_store;

use audio::NativeAudioAnalysis;
use prefs::WindowPrefs;
use tauri::{
  menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
  Manager, WebviewUrl, WebviewWindowBuilder,
};

fn app_data_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
  app.path().app_data_dir().map_err(|e| e.to_string())
}

#[tauri::command]
fn vybz_ping() -> String {
  "pong".into()
}

#[tauri::command]
fn vybz_build_hash() -> String {
  option_env!("VYBZ_DESKTOP_BUILD_HASH")
    .unwrap_or(env!("CARGO_PKG_VERSION"))
    .into()
}

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

#[tauri::command]
fn vybz_open_waveform_preview(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(existing) = app.get_webview_window("waveform") {
    existing.set_focus().map_err(|e| e.to_string())?;
    return Ok(());
  }
  let url = WebviewUrl::App("/desktop/waveform".into());
  WebviewWindowBuilder::new(&app, "waveform", url)
    .title("Waveform preview")
    .inner_size(960.0, 420.0)
    .resizable(true)
    .build()
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn vybz_close_waveform_preview(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(win) = app.get_webview_window("waveform") {
    win.close().map_err(|e| e.to_string())?;
  }
  Ok(())
}

fn build_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
  let waveform = MenuItem::with_id(app, "waveform_preview", "Waveform preview", true, None::<&str>)?;
  let view = Submenu::with_items(app, "View", true, &[&waveform])?;
  let file_quit = PredefinedMenuItem::quit(app, Some("Quit"))?;
  let file = Submenu::with_items(app, "File", true, &[&file_quit])?;
  Menu::with_items(app, &[&file, &view])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      if let Ok(dir) = app.path().app_data_dir() {
        crash::init_panic_hook(dir);
      }
      let menu = build_menu(app.handle())?;
      app.set_menu(menu)?;
      let handle = app.handle().clone();
      app.on_menu_event(move |_app, event| {
        if event.id() == "waveform_preview" {
          let _ = vybz_open_waveform_preview(handle.clone());
        }
      });
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      vybz_ping,
      vybz_build_hash,
      vybz_analyze_audio,
      vybz_window_prefs_get,
      vybz_window_prefs_set,
      vybz_secure_set,
      vybz_secure_get,
      vybz_secure_clear,
      vybz_open_waveform_preview,
      vybz_close_waveform_preview,
    ])
    .run(tauri::generate_context!())
    .expect("error while running VYBZ Desktop");
}
