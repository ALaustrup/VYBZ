//! App-local sealed session/cache storage (Phase 5 Desktop Alpha).
//! Not a HSM — values are obfuscated on disk under the app data directory.
//! Stronghold / DPAPI upgrade is documented for production signing builds.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Default, Serialize, Deserialize)]
struct StoreFile {
  version: u32,
  entries: HashMap<String, String>,
}

fn store_path(app_data: &PathBuf) -> PathBuf {
  app_data.join("secure").join("store.v1.json")
}

/// Trivial reversible seal — keeps plaintext off disk as plain JSON values.
fn seal(value: &str) -> String {
  use std::fmt::Write;
  let mut out = String::with_capacity(value.len() * 2);
  for b in value.as_bytes() {
    let _ = write!(out, "{b:02x}");
  }
  out
}

fn unseal(value: &str) -> Result<String, String> {
  if value.len() % 2 != 0 {
    return Err("corrupt seal".into());
  }
  let mut bytes = Vec::with_capacity(value.len() / 2);
  let chars: Vec<char> = value.chars().collect();
  for i in (0..chars.len()).step_by(2) {
    let hex: String = chars[i..i + 2].iter().collect();
    let b = u8::from_str_radix(&hex, 16).map_err(|_| "corrupt seal".to_string())?;
    bytes.push(b);
  }
  String::from_utf8(bytes).map_err(|_| "corrupt seal".to_string())
}

fn read_store(app_data: &PathBuf) -> StoreFile {
  let path = store_path(app_data);
  match fs::read_to_string(&path) {
    Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
    Err(_) => StoreFile {
      version: 1,
      entries: HashMap::new(),
    },
  }
}

fn write_store(app_data: &PathBuf, store: &StoreFile) -> Result<(), String> {
  let path = store_path(app_data);
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  let raw = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
  fs::write(path, raw).map_err(|e| e.to_string())
}

pub fn secure_set(app_data: &PathBuf, key: &str, value: &str) -> Result<(), String> {
  if key.is_empty() || key.len() > 128 {
    return Err("invalid key".into());
  }
  let mut store = read_store(app_data);
  store.version = 1;
  store.entries.insert(key.to_string(), seal(value));
  write_store(app_data, &store)
}

pub fn secure_get(app_data: &PathBuf, key: &str) -> Result<Option<String>, String> {
  let store = read_store(app_data);
  match store.entries.get(key) {
    Some(v) => Ok(Some(unseal(v)?)),
    None => Ok(None),
  }
}

pub fn secure_clear(app_data: &PathBuf, key: Option<&str>) -> Result<(), String> {
  let mut store = read_store(app_data);
  if let Some(k) = key {
    store.entries.remove(k);
  } else {
    store.entries.clear();
  }
  write_store(app_data, &store)
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::env;

  #[test]
  fn seals_and_restores() {
    let dir = env::temp_dir().join(format!("vybz-secure-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    secure_set(&dir, "session", r#"{"access":"x"}"#).unwrap();
    assert_eq!(secure_get(&dir, "session").unwrap().as_deref(), Some(r#"{"access":"x"}"#));
    secure_clear(&dir, Some("session")).unwrap();
    assert_eq!(secure_get(&dir, "session").unwrap(), None);
    let _ = fs::remove_dir_all(&dir);
  }
}
