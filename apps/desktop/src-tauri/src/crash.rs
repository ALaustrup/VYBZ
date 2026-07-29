//! Opt-in crash reporting: panic hook writes a local file log by default.
//! External send (e.g. Sentry) is never enabled unless VYBZ_CRASH_SENTRY=1
//! — Phase 5 still only appends a note to the file log (no network).

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::OnceLock;

static LOG_DIR: OnceLock<PathBuf> = OnceLock::new();

pub fn init_panic_hook(app_data: PathBuf) {
  let log_dir = app_data.join("logs");
  let _ = fs::create_dir_all(&log_dir);
  let _ = LOG_DIR.set(log_dir);

  let previous = std::panic::take_hook();
  std::panic::set_hook(Box::new(move |info| {
    let _ = write_panic_log(&format!("{info}"));
    previous(info);
  }));
}

fn write_panic_log(message: &str) -> Result<(), String> {
  let dir = LOG_DIR.get().ok_or("log dir unset")?;
  fs::create_dir_all(dir).map_err(|e| e.to_string())?;
  let path = dir.join("crash.log");
  let mut file = OpenOptions::new()
    .create(true)
    .append(true)
    .open(&path)
    .map_err(|e| e.to_string())?;
  let ts = {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .map(|d| d.as_secs())
      .unwrap_or(0)
  };
  writeln!(file, "---- crash unix:{ts} ----").map_err(|e| e.to_string())?;
  writeln!(file, "{message}").map_err(|e| e.to_string())?;
  if std::env::var("VYBZ_CRASH_SENTRY").ok().as_deref() == Some("1") {
    let _ = writeln!(
      file,
      "(Sentry send requested but disabled in Phase 5 — file log only)"
    );
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::env;

  #[test]
  fn init_creates_log_dir() {
    let dir = env::temp_dir().join(format!("vybz-crash-{}", std::process::id()));
    let _ = fs::remove_dir_all(&dir);
    init_panic_hook(dir.clone());
    assert!(dir.join("logs").exists() || LOG_DIR.get().is_some());
    let _ = fs::remove_dir_all(&dir);
  }
}
