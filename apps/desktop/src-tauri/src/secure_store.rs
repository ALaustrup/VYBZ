//! AES-GCM sealed prefs → `%APPDATA%/Vybz/secrets.bin` (Phase 12).
//! Migrates Phase 5 hex `secure/store.v1.json` on first open.

use aes_gcm::{
  aead::{Aead, KeyInit},
  Aes256Gcm, Nonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

const SEAL_MAGIC: &[u8] = b"VYBZSEAL1";
const KEY_FILE: &str = "secrets.key";
const BIN_FILE: &str = "secrets.bin";
const LEGACY_STORE: &str = "secure/store.v1.json";

#[derive(Debug, Default, Serialize, Deserialize)]
struct StoreFile {
  version: u32,
  entries: HashMap<String, String>,
}

fn vybz_data_dir(app_data: &Path) -> PathBuf {
  // Prefer sibling `Vybz` under Roaming when app_data is …/cloud.vybz.desktop
  if let Some(parent) = app_data.parent() {
    return parent.join("Vybz");
  }
  app_data.join("Vybz")
}

fn secrets_bin(app_data: &Path) -> PathBuf {
  vybz_data_dir(app_data).join(BIN_FILE)
}

fn secrets_key_path(app_data: &Path) -> PathBuf {
  vybz_data_dir(app_data).join(KEY_FILE)
}

fn legacy_path(app_data: &Path) -> PathBuf {
  app_data.join(LEGACY_STORE)
}

fn load_or_create_key(app_data: &Path) -> Result<[u8; 32], String> {
  let dir = vybz_data_dir(app_data);
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  let path = secrets_key_path(app_data);
  if path.exists() {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    if bytes.len() != 32 {
      return Err("corrupt secrets.key".into());
    }
    let mut key = [0u8; 32];
    key.copy_from_slice(&bytes);
    return Ok(key);
  }
  let mut key = [0u8; 32];
  rand::thread_rng().fill_bytes(&mut key);
  fs::write(&path, key).map_err(|e| e.to_string())?;
  #[cfg(windows)]
  {
    let _ = fs::metadata(&path);
  }
  Ok(key)
}

fn seal_value(key: &[u8; 32], value: &str) -> Result<String, String> {
  let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
  let mut iv = [0u8; 12];
  rand::thread_rng().fill_bytes(&mut iv);
  let nonce = Nonce::from_slice(&iv);
  let ct = cipher
    .encrypt(nonce, value.as_bytes())
    .map_err(|_| "encrypt failed".to_string())?;
  let mut out = Vec::with_capacity(SEAL_MAGIC.len() + 12 + ct.len());
  out.extend_from_slice(SEAL_MAGIC);
  out.extend_from_slice(&iv);
  out.extend_from_slice(&ct);
  Ok(base64_encode(&out))
}

fn unseal_value(key: &[u8; 32], sealed: &str) -> Result<String, String> {
  let raw = base64_decode(sealed)?;
  if raw.len() < SEAL_MAGIC.len() + 12 + 16 {
    return Err("corrupt seal".into());
  }
  if &raw[..SEAL_MAGIC.len()] != SEAL_MAGIC {
    return Err("corrupt seal magic".into());
  }
  let iv = &raw[SEAL_MAGIC.len()..SEAL_MAGIC.len() + 12];
  let ct = &raw[SEAL_MAGIC.len() + 12..];
  let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
  let nonce = Nonce::from_slice(iv);
  let plain = cipher
    .decrypt(nonce, ct)
    .map_err(|_| "decrypt failed".to_string())?;
  String::from_utf8(plain).map_err(|_| "corrupt seal utf8".to_string())
}

fn base64_encode(bytes: &[u8]) -> String {
  use base64::Engine;
  base64_engine().encode(bytes)
}

fn base64_decode(s: &str) -> Result<Vec<u8>, String> {
  use base64::Engine;
  base64_engine()
    .decode(s.trim())
    .map_err(|_| "corrupt b64".to_string())
}

fn base64_engine() -> base64::engine::GeneralPurpose {
  base64::engine::general_purpose::STANDARD
}

fn hex_unseal_legacy(value: &str) -> Result<String, String> {
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

fn read_bin_store(app_data: &Path, key: &[u8; 32]) -> Result<StoreFile, String> {
  let path = secrets_bin(app_data);
  if !path.exists() {
    return Ok(StoreFile {
      version: 2,
      entries: HashMap::new(),
    });
  }
  let sealed = fs::read_to_string(&path).map_err(|e| e.to_string())?;
  let json = unseal_value(key, sealed.trim())?;
  serde_json::from_str(&json).map_err(|e| e.to_string())
}

fn write_bin_store(app_data: &Path, key: &[u8; 32], store: &StoreFile) -> Result<(), String> {
  let dir = vybz_data_dir(app_data);
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  let json = serde_json::to_string(store).map_err(|e| e.to_string())?;
  let sealed = seal_value(key, &json)?;
  fs::write(secrets_bin(app_data), sealed).map_err(|e| e.to_string())
}

fn migrate_legacy_if_needed(app_data: &Path, key: &[u8; 32]) -> Result<(), String> {
  let legacy = legacy_path(app_data);
  if !legacy.exists() {
    return Ok(());
  }
  if secrets_bin(app_data).exists() {
    return Ok(());
  }
  let raw = fs::read_to_string(&legacy).map_err(|e| e.to_string())?;
  let legacy_store: StoreFile = serde_json::from_str(&raw).unwrap_or_default();
  let mut next = StoreFile {
    version: 2,
    entries: HashMap::new(),
  };
  for (k, v) in legacy_store.entries {
    let plain = hex_unseal_legacy(&v).unwrap_or(v);
    next.entries.insert(k, plain);
  }
  write_bin_store(app_data, key, &next)?;
  let _ = fs::rename(&legacy, legacy.with_extension("json.migrated"));
  Ok(())
}

pub fn secure_set(app_data: &PathBuf, key: &str, value: &str) -> Result<(), String> {
  if key.is_empty() || key.len() > 128 {
    return Err("invalid key".into());
  }
  let aes = load_or_create_key(app_data)?;
  migrate_legacy_if_needed(app_data, &aes)?;
  let mut store = read_bin_store(app_data, &aes)?;
  store.version = 2;
  store.entries.insert(key.to_string(), value.to_string());
  write_bin_store(app_data, &aes, &store)
}

pub fn secure_get(app_data: &PathBuf, key: &str) -> Result<Option<String>, String> {
  let aes = load_or_create_key(app_data)?;
  migrate_legacy_if_needed(app_data, &aes)?;
  let store = read_bin_store(app_data, &aes)?;
  Ok(store.entries.get(key).cloned())
}

pub fn secure_clear(app_data: &PathBuf, key: Option<&str>) -> Result<(), String> {
  let aes = load_or_create_key(app_data)?;
  migrate_legacy_if_needed(app_data, &aes)?;
  let mut store = read_bin_store(app_data, &aes)?;
  if let Some(k) = key {
    store.entries.remove(k);
  } else {
    store.entries.clear();
  }
  write_bin_store(app_data, &aes, &store)
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::env;

  #[test]
  fn aes_seals_roundtrip_and_migrates_hex() {
    let dir = env::temp_dir().join(format!("vybz-secure-aes-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(dir.join("secure")).unwrap();
    // legacy hex store
    let mut legacy = StoreFile {
      version: 1,
      entries: HashMap::new(),
    };
    let hex: String = b"hello"
      .iter()
      .map(|b| format!("{b:02x}"))
      .collect();
    legacy.entries.insert("k".into(), hex);
    fs::write(
      dir.join("secure/store.v1.json"),
      serde_json::to_string(&legacy).unwrap(),
    )
    .unwrap();

    assert_eq!(secure_get(&dir, "k").unwrap().as_deref(), Some("hello"));
    secure_set(&dir, "k2", "world").unwrap();
    assert_eq!(secure_get(&dir, "k2").unwrap().as_deref(), Some("world"));
    assert!(secrets_bin(&dir).exists());
    let _ = fs::remove_dir_all(&dir);
  }
}
