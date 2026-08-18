/**
 * Declared host-signal flags for one ATC burn window.
 * These are client-observed booleans. They are not a proof of musicianship.
 */

export type DeclaredHostSignals = {
  kind: "declared";
  pointer: boolean;
  key: boolean;
  chat: boolean;
  dawStreaming: boolean;
  micTrackLive: boolean;
  focused: boolean;
};

const empty = (): Omit<DeclaredHostSignals, "kind" | "dawStreaming" | "micTrackLive" | "focused"> => ({
  pointer: false,
  key: false,
  chat: false,
});

let flags = empty();

export function notePointer(): void {
  flags.pointer = true;
}

export function noteKey(): void {
  flags.key = true;
}

export function noteChatSent(): void {
  flags.chat = true;
}

export function takeHostSignalSnapshot(input: {
  dawStreaming: boolean;
  micTrackLive: boolean;
  focused: boolean;
}): DeclaredHostSignals {
  const snap: DeclaredHostSignals = {
    kind: "declared",
    pointer: flags.pointer,
    key: flags.key,
    chat: flags.chat,
    dawStreaming: input.dawStreaming,
    micTrackLive: input.micTrackLive,
    focused: input.focused,
  };
  flags = empty();
  return snap;
}

export function resetHostSignals(): void {
  flags = empty();
}

export function peekHostSignals(): Omit<DeclaredHostSignals, "kind" | "dawStreaming" | "micTrackLive" | "focused"> {
  return { ...flags };
}
