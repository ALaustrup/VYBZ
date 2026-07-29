//! Window geometry + theme prefs persisted under the app data directory.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WindowPrefs {
  pub width: f64,
  pub height: f64,
  pub x: Option<f64>,
  pub y: Option<f64>,
  /// "dark" | "light" | "system"
  pub theme: String,
}

impl Default for WindowPrefs {
  fn default() -> Self {
    Self {
      width: 1440.0,
      height: 900.0,
      x: None,
      y: None,
      theme: "dark".into(),
    }
  }
}

fn prefs_path(app_data: &PathBuf) -> PathBuf {
  app_data.join("window-prefs.json")
}

pub fn load_prefs(app_data: &PathBuf) -> WindowPrefs {
  let path = prefs_path(app_data);
  match fs::read_to_string(&path) {
    Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
    Err(_) => WindowPrefs::default(),
  }
}

pub fn save_prefs(app_data: &PathBuf, prefs: &WindowPrefs) -> Result<(), String> {
  fs::create_dir_all(app_data).map_err(|e| e.to_string())?;
  let raw = serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?;
  fs::write(prefs_path(app_data), raw).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::env;

  #[test]
  fn round_trips_window_prefs() {
    let dir = env::temp_dir().join(format!("vybz-prefs-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    let prefs = WindowPrefs {
      width: 1280.0,
      height: 720.0,
      x: Some(40.0),
      y: Some(60.0),
      theme: "light".into(),
    };
    save_prefs(&dir, &prefs).unwrap();
    assert_eq!(load_prefs(&dir), prefs);
    let _ = fs::remove_dir_all(&dir);
  }
}
