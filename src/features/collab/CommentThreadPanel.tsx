import { useEffect, useState } from "react";
import type { CommentAnchorKind, ReleaseComment } from "@vybz/domain/collab";
import {
  addReleaseComment,
  listReleaseComments,
  subscribeCollab,
} from "@/platform/collab";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function fmtTime(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CommentThreadPanel(props: {
  releaseId: string;
  authorId: string;
  authorName?: string | null;
  /** Default filter; omit to show all */
  anchorKind?: CommentAnchorKind;
  anchorRef?: string;
  /** Pre-fill waveform stamp for new comments */
  defaultTimeSec?: number;
  title?: string;
}) {
  const [rows, setRows] = useState<ReleaseComment[]>([]);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<CommentAnchorKind>(props.anchorKind ?? "metadata_field");
  const [anchorRef, setAnchorRef] = useState(props.anchorRef ?? "title");

  useEffect(() => {
    const refresh = () =>
      setRows(
        listReleaseComments(props.releaseId, {
          anchorKind: props.anchorKind,
          anchorRef: props.anchorRef,
        })
      );
    refresh();
    return subscribeCollab(props.releaseId, refresh);
  }, [props.releaseId, props.anchorKind, props.anchorRef]);

  function post() {
    const text = body.trim();
    if (!text) return;
    addReleaseComment({
      releaseId: props.releaseId,
      authorId: props.authorId,
      authorName: props.authorName,
      anchorKind: props.anchorKind ?? kind,
      anchorRef: props.anchorRef ?? anchorRef,
      timeSec: (props.anchorKind ?? kind) === "waveform_time" ? props.defaultTimeSec ?? 0 : null,
      body: text,
    });
    setBody("");
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-suite border border-white/10 bg-white/[0.03] p-4"
      data-testid="collab-comments-panel"
      aria-label={props.title ?? "Collaboration comments"}
    >
      <h2 className="text-sm font-semibold text-snow">{props.title ?? "Comments"}</h2>

      {!props.anchorKind && (
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="flex items-center gap-1 text-fog">
            Anchor
            <select
              className="rounded-suite-sm border border-white/10 bg-graphite px-2 py-1 text-snow"
              value={kind}
              data-testid="collab-comment-kind"
              onChange={(e) => setKind(e.target.value as CommentAnchorKind)}
            >
              <option value="waveform_time">Waveform</option>
              <option value="metadata_field">Metadata</option>
              <option value="credit_field">Credit</option>
            </select>
          </label>
          {kind !== "waveform_time" && (
            <Input
              value={anchorRef}
              onChange={(e) => setAnchorRef(e.target.value)}
              data-testid="collab-comment-anchor-ref"
              className="h-8 max-w-[10rem] text-xs"
              placeholder="field"
              data-collab-field="comment-anchor"
            />
          )}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          post();
        }}
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          data-testid="collab-comment-input"
          data-collab-field="comment-body"
          className="text-sm"
        />
        <Button
          type="submit"
          size="sm"
          data-testid="collab-comment-post"
          disabled={!body.trim()}
        >
          Post
        </Button>
      </form>

      <ul className="flex flex-col gap-2" data-testid="collab-comment-list">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-suite-md border border-white/8 bg-abyss/30 px-3 py-2 text-sm"
            data-testid="collab-comment-row"
          >
            <div className="flex flex-wrap items-baseline gap-2 text-[11px] text-fog">
              <span className="font-semibold text-snow">{r.authorName || r.authorId.slice(0, 6)}</span>
              <span>{r.anchorKind}</span>
              {r.anchorRef && <span>· {r.anchorRef}</span>}
              {r.timeSec != null && <span>· @{fmtTime(r.timeSec)}</span>}
            </div>
            <p className="mt-1 text-snow">{r.body}</p>
          </li>
        ))}
        {!rows.length && (
          <li className="text-xs text-fog" data-testid="collab-comments-empty">
            No comments yet.
          </li>
        )}
      </ul>
    </section>
  );
}
