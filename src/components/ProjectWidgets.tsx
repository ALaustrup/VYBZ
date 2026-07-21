import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Lock, Plus, Puzzle, Trash2, X, Unplug } from "lucide-react";
import { WIDGET_KINDS, SECONDARY_WIDGET_IDS, WIDGET_LABEL, embedSrc, embedHeight, type WidgetKind } from "@/lib/widgets";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { ProjectWidget } from "@/types";
import type { OAuthConnection } from "@/lib/api";

function hostOf(url?: string): string {
  if (!url) return "link";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/** Renders a single widget: live embed, link card, or OAuth connector card. */
export function WidgetCard({ widget, onRemove, oauth }: {
  widget: ProjectWidget;
  onRemove?: () => void;
  oauth?: OAuthConnection | null;
}) {
  const kind = WIDGET_KINDS.find((k) => k.id === widget.kind);
  const url = widget.config?.url as string | undefined;
  const src = kind?.embed ? embedSrc(widget.kind, url) : null;
  const isConnector = kind && !kind.embed;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Puzzle className="h-3.5 w-3.5 text-veil-200" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/80">{widget.title || WIDGET_LABEL[widget.kind] || widget.kind}</span>
        {onRemove && (
          <button onClick={onRemove} aria-label="Remove widget" className="rounded-full p-1 text-white/40 hover:text-wild active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
        )}
      </div>
      {isConnector ? (
        oauth ? (
          <div className="px-3 py-4 text-[12px] text-white/70">
            <p className="font-semibold text-white">{String(oauth.meta.display_name ?? "Connected")}</p>
            {oauth.meta.followers != null && <p className="mt-0.5 text-white/45">{Number(oauth.meta.followers).toLocaleString()} followers</p>}
            {typeof oauth.meta.external_url === "string" && (
              <a href={oauth.meta.external_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-veil-100 hover:text-white">
                <ExternalLink className="h-3.5 w-3.5" /> Open on Spotify
              </a>
            )}
          </div>
        ) : kind?.gated ? (
          <div className="flex items-center gap-2 px-3 py-4 text-[12px] text-white/50">
            <Lock className="h-4 w-4 shrink-0 text-amber-300" />
            <span>{WIDGET_LABEL[widget.kind]} connector — needs API setup.</span>
          </div>
        ) : (
          <div className="px-3 py-4 text-[12px] text-white/50">Connect your account from Add widget.</div>
        )
      ) : src ? (
        <iframe
          src={src}
          title={widget.title || widget.kind}
          loading="lazy"
          className="w-full"
          style={{ height: embedHeight(widget.kind, src), border: 0 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-4 text-[13px] text-veil-100 hover:text-white">
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{hostOf(url)}</span>
        </a>
      )}
    </div>
  );
}

/** Modal: pick a widget kind, then paste a URL or start OAuth. */
export function WidgetPicker({ onAdd, onClose, projectId }: {
  onAdd: (kind: string, config: Record<string, unknown>, title?: string) => Promise<void>;
  onClose: () => void;
  projectId?: string;
}) {
  const [chosen, setChosen] = useState<WidgetKind | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [connections, setConnections] = useState<OAuthConnection[]>([]);

  useEffect(() => {
    void api.listOAuth().then(setConnections).catch(() => setConnections([]));
  }, []);

  async function add() {
    if (!chosen || chosen.gated) return;
    setErr(null);
    if (!chosen.embed) {
      setBusy(true);
      try {
        const existing = connections.find((c) => c.provider === chosen.id);
        if (existing) {
          await onAdd(chosen.id, {
            oauth: true,
            externalId: existing.externalId,
            displayName: existing.meta.display_name ?? null,
          }, title.trim() || undefined);
          onClose();
          return;
        }
        const authUrl = await api.startOAuth(chosen.id, projectId);
        window.location.href = authUrl;
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!url.trim()) return;
    setBusy(true);
    try { await onAdd(chosen.id, { url: url.trim() }, title.trim() || undefined); onClose(); }
    finally { setBusy(false); }
  }

  async function disconnect(provider: string) {
    setBusy(true);
    try {
      await api.disconnectOAuth(provider);
      setConnections(await api.listOAuth());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900/95 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:rounded-3xl sm:border">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-gradient"><Puzzle className="h-4 w-4 text-veil-200" /> Add a widget</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full glass"><X className="h-4 w-4" /></button>
        </div>

        {!chosen ? (
          <>
            <p className="mb-3 text-[12px] text-white/50">Music &amp; video embeds first — other crafts are optional.</p>
            <div className="grid grid-cols-2 gap-2">
              {WIDGET_KINDS.filter((k) => !SECONDARY_WIDGET_IDS.has(k.id)).map((k) => {
                const connected = !k.embed && connections.some((c) => c.provider === k.id);
                return (
                  <button key={k.id} onClick={() => !k.gated && setChosen(k)} disabled={k.gated}
                    className={cx("flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition active:scale-[0.98]",
                      k.gated ? "cursor-not-allowed border-white/8 bg-white/[0.02] opacity-70" : "border-white/10 bg-white/[0.04] hover:border-veil-400/50")}>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      {k.label}
                      {k.gated && <Lock className="h-3 w-3 text-amber-300" />}
                      {connected && <span className="rounded bg-feel/20 px-1 text-[9px] uppercase text-feel">on</span>}
                    </span>
                    <span className="text-[11px] text-white/45">
                      {k.gated ? (k.hint ? `${k.hint} · soon` : "Coming soon") : k.embed ? "Embed" : (FLAGS.oauthSpotify && k.id === "spotify_artist" ? "Connect account" : "Connect")}
                    </span>
                  </button>
                );
              })}
            </div>
            {showSecondary ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {WIDGET_KINDS.filter((k) => SECONDARY_WIDGET_IDS.has(k.id)).map((k) => (
                  <button key={k.id} onClick={() => setChosen(k)}
                    className="flex flex-col items-start gap-0.5 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-veil-400/50 active:scale-[0.98]">
                    <span className="text-sm font-semibold text-white">{k.label}</span>
                    <span className="text-[11px] text-white/45">{k.hint ?? "Embed"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setShowSecondary(true)}
                className="mt-3 w-full rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-left text-[12px] text-white/40 hover:border-white/20 hover:text-white/60">
                Art, games &amp; other crafts…
              </button>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setChosen(null)} className="mb-3 text-[12px] text-white/50 hover:text-white/80">← All widgets</button>
            <p className="mb-2 text-sm font-semibold text-white">{chosen.label}</p>
            {chosen.embed ? (
              <>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={chosen.placeholder}
                  className="mb-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
                <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="Label (optional)"
                  className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
              </>
            ) : (
              <div className="mb-3 space-y-2">
                <p className="text-[12px] text-white/50">{chosen.hint ?? "Connect your account to show live stats on this project."}</p>
                {connections.some((c) => c.provider === chosen.id) && (
                  <button type="button" onClick={() => disconnect(chosen.id)} disabled={busy}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50 hover:text-wild">
                    <Unplug className="h-3.5 w-3.5" /> Disconnect account
                  </button>
                )}
                <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 60))} placeholder="Label (optional)"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none" />
              </div>
            )}
            {err && <p className="mb-2 text-[12px] text-wild">{err}</p>}
            <button onClick={add} disabled={busy || (chosen.embed && !url.trim())} className="btn btn-primary w-full py-3 disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : chosen.embed
                ? <><Plus className="h-4 w-4" /> Add widget</>
                : <><Plus className="h-4 w-4" /> {connections.some((c) => c.provider === chosen.id) ? "Add to project" : "Connect & add"}</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** A project's widget dashboard section (editable for the owner). */
export function ProjectWidgets({ widgets, editable, onAdd, onRemove, projectId }: {
  widgets: ProjectWidget[];
  editable?: boolean;
  onAdd?: (kind: string, config: Record<string, unknown>, title?: string) => Promise<void>;
  onRemove?: (id: string) => void;
  projectId?: string;
}) {
  const [picking, setPicking] = useState(false);
  const [oauth, setOauth] = useState<OAuthConnection[]>([]);

  useEffect(() => {
    if (!editable) return;
    void api.listOAuth().then(setOauth).catch(() => setOauth([]));
  }, [editable, widgets.length]);

  return (
    <div>
      {widgets.length === 0 ? (
        editable ? (
          <p className="rounded-2xl border border-white/8 bg-white/[0.02] px-3.5 py-3 text-xs text-white/45">No widgets yet. Add your Spotify, YouTube, SoundCloud and more to showcase this project.</p>
        ) : null
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {widgets.map((w) => (
            <WidgetCard
              key={w.id}
              widget={w}
              oauth={oauth.find((c) => c.provider === w.kind) ?? null}
              onRemove={editable && onRemove ? () => onRemove(w.id) : undefined}
            />
          ))}
        </div>
      )}
      {editable && (
        <button onClick={() => setPicking(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-veil-400/40 bg-veil-500/[0.06] py-2.5 text-sm font-semibold text-veil-100 active:scale-[0.99]">
          <Plus className="h-4 w-4" /> Add widget
        </button>
      )}
      {picking && onAdd && <WidgetPicker onAdd={onAdd} onClose={() => setPicking(false)} projectId={projectId} />}
    </div>
  );
}
