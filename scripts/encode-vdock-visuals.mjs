/**
 * Encode Vizualz/ masters → public/vdock/visuals/<slug>/{loop.webm,loop.mp4,preview.webp}
 * and refresh src/lib/vdockVisualManifest.ts
 *
 * Usage: node scripts/encode-vdock-visuals.mjs [--force]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const srcDir = join(root, "Vizualz");
const outRoot = join(root, "public", "vdock", "visuals");
const manifestPath = join(root, "src", "lib", "vdockVisualManifest.ts");
const force = process.argv.includes("--force");

const VIDEO_EXT = new Set([".mp4", ".mov", ".webm", ".mkv", ".m4v", ".avi", ".mpg", ".mpeg"]);

function slugify(name) {
  return name
    .replace(extname(name), "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "visual";
}

function titleFromSlug(slug) {
  const m = /^vizual-(\d+)([a-z]?)$/i.exec(slug);
  if (m) return `Vizual ${m[1]}${m[2] ? m[2].toUpperCase() : ""}`.trim();
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function haveFfmpeg() {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return r.status === 0;
}

function runFfmpeg(args, label) {
  console.log(`  → ${label}`);
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], {
    encoding: "utf8",
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `ffmpeg failed: ${label}`);
    process.exit(1);
  }
}

function listMasters() {
  if (!existsSync(srcDir)) return [];
  return readdirSync(srcDir)
    .filter((f) => !f.startsWith(".") && f.toLowerCase() !== "readme.md" && f.toLowerCase() !== "backdrop")
    .filter((f) => VIDEO_EXT.has(extname(f).toLowerCase()))
    .filter((f) => {
      try { return statSync(join(srcDir, f)).isFile(); } catch { return false; }
    })
    .sort((a, b) => a.localeCompare(b));
}

function findBackdropMaster() {
  const dir = join(srcDir, "backdrop");
  if (!existsSync(dir)) return null;
  const hit = readdirSync(dir).find((f) => {
    const base = basename(f, extname(f)).toLowerCase();
    return base === "main" && VIDEO_EXT.has(extname(f).toLowerCase());
  });
  return hit ? join(dir, hit) : null;
}

function encodeSiteBackdrop() {
  const input = findBackdropMaster();
  const outDir = join(root, "public", "backdrop");
  mkdirSync(outDir, { recursive: true });
  if (!input) {
    console.log("• site backdrop — no Vizualz/backdrop/main.* yet");
    return;
  }
  const webm = join(outDir, "main.webm");
  const mp4 = join(outDir, "main.mp4");
  const poster = join(outDir, "poster.webp");
  const need = force || !existsSync(webm) || !existsSync(mp4) || !existsSync(poster);
  if (!need) {
    console.log("• site backdrop main (up to date)");
    return;
  }
  console.log(`• site backdrop ← ${basename(input)}`);
  const vf = "scale='min(1280,iw)':-2:flags=lanczos,fps=24,format=yuv420p";
  if (force || !existsSync(webm)) {
    runFfmpeg(
      ["-i", input, "-an", "-vf", vf, "-c:v", "libvpx-vp9", "-b:v", "900k", "-maxrate", "1.2M", "-bufsize", "1.8M", "-deadline", "good", "-cpu-used", "2", webm],
      "backdrop/main.webm",
    );
  }
  if (force || !existsSync(mp4)) {
    runFfmpeg(
      ["-i", input, "-an", "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "26", "-movflags", "+faststart", "-pix_fmt", "yuv420p", mp4],
      "backdrop/main.mp4",
    );
  }
  if (force || !existsSync(poster)) {
    runFfmpeg(
      ["-ss", "2", "-i", input, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2:flags=lanczos", poster],
      "backdrop/poster.webp",
    );
  }
}

function encodeOne(file) {
  const slug = slugify(file);
  const input = join(srcDir, file);
  const outDir = join(outRoot, slug);
  mkdirSync(outDir, { recursive: true });

  const webm = join(outDir, "loop.webm");
  const mp4 = join(outDir, "loop.mp4");
  const preview = join(outDir, "preview.webp");

  const needWebm = force || !existsSync(webm);
  const needMp4 = force || !existsSync(mp4);
  const needPreview = force || !existsSync(preview);

  if (!needWebm && !needMp4 && !needPreview) {
    console.log(`• ${file} → ${slug} (up to date)`);
    return { id: slug, title: titleFromSlug(slug) };
  }

  console.log(`• ${file} → ${slug}`);

  // Mute, scale to max 1280 wide, clamp ~12s for dock loops, pad even dims.
  const vf =
    "scale='min(1280,iw)':-2:flags=lanczos,fps=30,trim=duration=12,setpts=PTS-STARTPTS,format=yuv420p";

  if (needWebm) {
    runFfmpeg(
      [
        "-i", input,
        "-an",
        "-vf", vf,
        "-c:v", "libvpx-vp9",
        "-b:v", "1.2M",
        "-maxrate", "1.6M",
        "-bufsize", "2.4M",
        "-deadline", "good",
        "-cpu-used", "2",
        webm,
      ],
      "loop.webm",
    );
  }

  if (needMp4) {
    runFfmpeg(
      [
        "-i", input,
        "-an",
        "-vf", vf,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "23",
        "-movflags", "+faststart",
        "-pix_fmt", "yuv420p",
        mp4,
      ],
      "loop.mp4",
    );
  }

  if (needPreview) {
    runFfmpeg(
      [
        "-ss", "1",
        "-i", input,
        "-frames:v", "1",
        "-vf", "scale='min(640,iw)':-2:flags=lanczos",
        preview,
      ],
      "preview.webp",
    );
  }

  return { id: slug, title: titleFromSlug(slug) };
}

function writeManifest(items) {
  const body = items
    .map(
      (v) => `  {
    id: ${JSON.stringify(v.id)},
    title: ${JSON.stringify(v.title)},
    previewUrl: ${JSON.stringify(`/vdock/visuals/${v.id}/preview.webp`)},
    loopWebm: ${JSON.stringify(`/vdock/visuals/${v.id}/loop.webm`)},
    loopMp4: ${JSON.stringify(`/vdock/visuals/${v.id}/loop.mp4`)},
  }`,
    )
    .join(",\n");

  const src = `/**
 * VDock selectable visuals — generated by \`npm run visuals:encode\`.
 * Masters live in \`Vizualz/\`; encoded assets in \`public/vdock/visuals/\`.
 */

export interface VdockVisual {
  id: string;
  title: string;
  previewUrl: string;
  loopWebm: string;
  loopMp4: string;
}

export const VDOCK_VISUALS: VdockVisual[] = [
${body || "  // Drop masters in Vizualz/ then run: npm run visuals:encode"}
];

export function vdockVisual(id: string | undefined | null): VdockVisual | undefined {
  if (!id) return undefined;
  return VDOCK_VISUALS.find((v) => v.id === id);
}
`;
  writeFileSync(manifestPath, src, "utf8");
  console.log(`\nManifest → ${manifestPath} (${items.length} visual${items.length === 1 ? "" : "s"})`);
}

function main() {
  if (!haveFfmpeg()) {
    console.error("ffmpeg not found on PATH. Install ffmpeg, then re-run.");
    process.exit(1);
  }
  encodeSiteBackdrop();
  mkdirSync(outRoot, { recursive: true });
  const masters = listMasters();
  if (!masters.length) {
    console.log(`No VDock visual masters in ${srcDir} yet — drop files there, then re-run.`);
    writeManifest([]);
    return;
  }
  const items = masters.map(encodeOne);
  const byId = new Map();
  for (const it of items) {
    if (byId.has(it.id)) console.warn(`  warn: duplicate slug "${it.id}" — later file wins`);
    byId.set(it.id, it);
  }
  writeManifest([...byId.values()]);
}

main();
