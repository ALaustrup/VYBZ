import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, ImagePlus } from "lucide-react";
import { useSession } from "@/store/session";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { PackUploader } from "@/features/storefront/PackUploader";
import { PackCopyPanel } from "@/features/storefront/PackCopyPanel";
import {
  MIN_PRICE_CENTS,
  MAX_PRICE_CENTS,
  previewPublicUrl,
  defaultCoverUrl,
  type StorefrontPack,
} from "@/features/storefront/types";
import { uniqueSlug } from "@/features/storefront/slug";
import { cx } from "@/lib/utils";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

export function StorefrontEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { userId, showToast } = useSession();
  const [pack, setPack] = useState<StorefrontPack | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [artBusy, setArtBusy] = useState(false);
  const [keywords, setKeywords] = useState("");

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [priceDollars, setPriceDollars] = useState("9.99");
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [zipPath, setZipPath] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [slug, setSlug] = useState("");

  useRegisterAppBar({ title: isNew ? "New pack" : "Edit pack" }, [isNew]);

  const hydrate = useCallback((p: StorefrontPack) => {
    setPack(p);
    setTitle(p.title);
    setGenre(p.genre);
    setDescription(p.description);
    setFeaturesText((p.features ?? []).join("\n"));
    setPriceDollars((p.price_cents / 100).toFixed(2));
    setPreviewPath(p.preview_path);
    setZipPath(p.zip_path);
    setCoverPath(p.cover_path);
    setStatus(p.status);
    setSlug(p.slug);
    setKeywords(p.genre || p.title);
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await api.getMyStorefrontPack(id);
        if (!cancelled && p) hydrate(p);
        else if (!cancelled) showToast("Pack not found");
      } catch (e) {
        if (!cancelled) showToast((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isNew, hydrate, showToast]);

  if (!FLAGS.storefront) return <Navigate to="/" replace />;

  function parsePriceCents(): number | null {
    const n = Math.round(Number(priceDollars) * 100);
    if (!Number.isFinite(n) || n < MIN_PRICE_CENTS || n > MAX_PRICE_CENTS) return null;
    return n;
  }

  function featuresFromText(): string[] {
    return featuresText
      .split("\n")
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  async function save(opts?: { publish?: boolean }): Promise<StorefrontPack | null> {
    if (!userId) return null;
    const price_cents = parsePriceCents();
    if (price_cents == null) {
      showToast("Price must be between $1.00 and $5,000.");
      return null;
    }
    const nextTitle = title.trim() || "Untitled pack";
    const nextStatus = opts?.publish ? "published" : status;
    if (nextStatus === "published") {
      if (!zipPath) { showToast("Upload a ZIP before publishing."); return null; }
    }

    setSaving(true);
    try {
      const payload = {
        title: nextTitle,
        slug: slug || uniqueSlug(nextTitle),
        description: description.trim(),
        features: featuresFromText(),
        genre: genre.trim(),
        price_cents,
        preview_path: previewPath,
        zip_path: zipPath,
        cover_path: coverPath,
        status: nextStatus as "draft" | "published",
      };

      let saved: StorefrontPack | null;
      if (isNew || !pack) {
        saved = await api.createStorefrontPack(payload);
        if (saved) {
          showToast(opts?.publish ? "Published" : "Draft saved");
          navigate(`/tools/packs/${saved.id}/edit`, { replace: true });
        }
      } else {
        saved = await api.updateStorefrontPack(pack.id, payload);
        if (saved) {
          hydrate(saved);
          showToast(opts?.publish ? "Published" : "Saved");
        }
      }
      return saved;
    } catch (e) {
      showToast((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function uploadPreview(file: File) {
    if (!userId) throw new Error("Sign in required");
    const path = await api.uploadStorefrontPreview(userId, file);
    setPreviewPath(path);
    showToast("Preview uploaded");
  }

  async function uploadZip(file: File) {
    if (!userId) throw new Error("Sign in required");
    const path = await api.uploadStorefrontZip(userId, file);
    setZipPath(path);
    showToast("ZIP uploaded");
  }

  async function generateArt() {
    if (!title.trim()) {
      showToast("Add a title before generating cover art.");
      return;
    }
    setArtBusy(true);
    try {
      const path = await api.generateStorefrontPackArt({
        title: title.trim(),
        genre: genre.trim() || undefined,
        packId: pack?.id,
      });
      if (!path) {
        showToast("Cover generation failed — using default.");
        return;
      }
      setCoverPath(path);
      showToast("Cover art ready");
    } catch (e) {
      showToast((e as Error).message || "Cover generation failed");
    } finally {
      setArtBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
      </div>
    );
  }

  const coverUrl = previewPublicUrl(coverPath, SUPABASE_URL) ?? defaultCoverUrl();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 pb-28">
      <Link to="/tools/packs" className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80">
        <ArrowLeft className="h-3.5 w-3.5" /> All packs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">{isNew ? "New sample pack" : "Edit pack"}</h1>
          <p className="mt-1 text-sm text-white/45">Draft locally, publish when ZIP is ready. Fans pay VYBZ; you settle manually.</p>
        </div>
        <PackCopyPanel
          keywords={keywords || title || genre}
          genre={genre}
          disabled={saving}
          onGenerated={(copy) => {
            setTitle(copy.title);
            setDescription(copy.description);
            setFeaturesText(copy.features.join("\n"));
            showToast("Copy filled — edit freely");
          }}
          onError={(m) => showToast(m)}
        />
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs text-white/45">Keywords for AI (optional)</span>
        <input
          className="input w-full"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Dark Trap Melodies, 808s, cinematic"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs text-white/45">Title</span>
        <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pack title" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs text-white/45">Genre</span>
          <input className="input w-full" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Lo-Fi, Trap…" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-white/45">Price (USD)</span>
          <input
            className="input w-full"
            type="number"
            min={1}
            max={5000}
            step={0.01}
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs text-white/45">Description</span>
        <textarea
          className="input min-h-[120px] w-full resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Premium marketing copy for your pack"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs text-white/45">Features (one per line)</span>
        <textarea
          className="input min-h-[90px] w-full resize-y"
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
          placeholder={"40+ royalty-free loops\nKeyed to minor vibes\nReady for FL / Ableton"}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <PackUploader
          kind="preview"
          label="Preview audio"
          hint="MP3 or WAV · public stream"
          accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav"
          currentName={previewPath ? previewPath.split("/").pop() : null}
          onUpload={uploadPreview}
        />
        <PackUploader
          kind="zip"
          label="Pack ZIP"
          hint="Private · delivered after purchase"
          accept="application/zip,.zip"
          currentName={zipPath ? zipPath.split("/").pop() : null}
          onUpload={uploadZip}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-white/45">Cover art</span>
          <button
            type="button"
            disabled={artBusy}
            onClick={() => void generateArt()}
            className="btn btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          >
            {artBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Generate box art
          </button>
        </div>
        <img
          src={coverUrl}
          alt=""
          className="aspect-square w-full max-w-[220px] rounded-xl object-cover ring-1 ring-white/10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className={cx("btn btn-ghost px-4 py-2 text-sm", saving && "opacity-60")}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save draft"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save({ publish: true })}
          className="btn btn-primary px-4 py-2 text-sm"
        >
          Publish storefront
        </button>
        {status === "published" && slug && (
          <Link to={`/pack/${slug}`} className="btn btn-ghost px-4 py-2 text-sm">
            View storefront
          </Link>
        )}
      </div>
    </div>
  );
}
