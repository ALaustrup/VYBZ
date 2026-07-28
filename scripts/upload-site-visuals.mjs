#!/usr/bin/env node
/**
 * Upload encoded backdrop + VDock loops to the public `site-visuals` bucket.
 *
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # Dashboard → Settings → API
 *   npm run visuals:upload
 *
 * Does NOT upload vizualz/ masters (source only).
 */
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const BUCKET = "site-visuals";
const URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://xixmneooyufbeftdfpcm.supabase.co";

const DIRS = [
  { local: "public/backdrop", remote: "backdrop" },
  { local: "public/vdock/visuals", remote: "vdock/visuals" },
];

function walkFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkFiles(p));
    else if (/\.(webm|mp4|webp)$/i.test(name)) out.push(p);
  }
  return out;
}

async function uploadViaServiceRole(key) {
  const sb = createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const { local, remote } of DIRS) {
    const abs = join(ROOT, local);
    for (const file of walkFiles(abs)) {
      const rel = relative(abs, file).replace(/\\/g, "/");
      const objectPath = `${remote}/${rel}`;
      const body = readFileSync(file);
      const contentType = file.endsWith(".webm")
        ? "video/webm"
        : file.endsWith(".mp4")
          ? "video/mp4"
          : "image/webp";
      process.stdout.write(`  ${objectPath} … `);
      const { error } = await sb.storage.from(BUCKET).upload(objectPath, body, {
        contentType,
        upsert: true,
        cacheControl: "public, max-age=31536000, immutable",
      });
      if (error) throw new Error(`${objectPath}: ${error.message}`);
      console.log("ok");
    }
  }
}

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
try {
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  console.log(`Uploading via service role → ${URL} / ${BUCKET}`);
  await uploadViaServiceRole(key);
  console.log("\nDone. Public base:");
  console.log(`${URL}/storage/v1/object/public/${BUCKET}/`);
} catch (e) {
  console.error(e.message || e);
  console.error(`
1. Open https://supabase.com/dashboard/project/xixmneooyufbeftdfpcm/settings/api
2. Copy **service_role** (secret)
3. PowerShell:
     $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
     npm run visuals:upload
`);
  process.exit(1);
}
