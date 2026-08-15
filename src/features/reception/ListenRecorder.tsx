import { useEffect, useRef } from "react";
import { getSnapshot, subscribe } from "@/lib/audioBus";
import { useSession } from "@/store/session";
import { recordListen } from "./listenApi";

/** How often an in-progress listen is checkpointed. */
const CHECKPOINT_MS = 15_000;
/** Ignore a tap-and-skip; it tells an artist nothing. */
const MIN_MEANINGFUL_SEC = 5;

type Session = {
  id: string;
  dropId: string;
  reachedSec: number;
  durationSec: number | null;
  completed: boolean;
  written: boolean;
};

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Records how far a listener actually got.
 *
 * A play count says nothing — this is the difference between "4,300 views" and
 * "22 people finished it". One row per session, checkpointed while playing and
 * flushed when the track changes or the page goes away.
 *
 * `completed` is set only when the audio element reports the end. We never infer
 * completion from a position, and a listener who stops is recorded as stopping
 * there, never as having lost interest.
 */
export function ListenRecorder() {
  const { userId } = useSession();
  const sessionRef = useRef<Session | null>(null);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (!userId) return;

    function flush(reason: "checkpoint" | "final") {
      const s = sessionRef.current;
      if (!s) return;
      if (s.reachedSec < MIN_MEANINGFUL_SEC && !s.completed) return;
      if (reason === "checkpoint" && Date.now() - lastWriteRef.current < CHECKPOINT_MS) return;
      lastWriteRef.current = Date.now();
      s.written = true;
      void recordListen({
        sessionId: s.id,
        dropId: s.dropId,
        reachedSec: s.reachedSec,
        durationSec: s.durationSec,
        completed: s.completed,
      });
    }

    function onChange() {
      const snap = getSnapshot();
      const trackId = snap.track?.id ?? null;
      const active = sessionRef.current;

      // Track changed — close the old session before opening a new one.
      if (active && active.dropId !== trackId) {
        flush("final");
        sessionRef.current = null;
      }

      if (!trackId) return;

      if (!sessionRef.current) {
        sessionRef.current = {
          id: newSessionId(),
          dropId: trackId,
          reachedSec: snap.currentTime,
          durationSec: snap.duration > 0 ? snap.duration : null,
          completed: false,
          written: false,
        };
        lastWriteRef.current = 0;
      }

      const s = sessionRef.current;
      s.reachedSec = Math.max(s.reachedSec, snap.currentTime);
      if (snap.duration > 0) s.durationSec = snap.duration;

      // The bus parks the clock at the end when a track finishes naturally.
      const dur = s.durationSec;
      if (!snap.playing && dur && snap.currentTime >= dur - 0.75) {
        s.completed = true;
        flush("final");
        return;
      }
      if (snap.playing) flush("checkpoint");
    }

    const unsub = subscribe(onChange);
    const onHide = () => flush("final");
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      flush("final");
      unsub();
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [userId]);

  return null;
}
