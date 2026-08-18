/** Hand off local camera / display / DAW MediaStream from GoLiveSheet → LiveWatchPage. */

let handoff: MediaStream | null = null;

export function setLivePreviewHandoff(stream: MediaStream | null) {
  if (handoff && handoff !== stream) {
    handoff.getTracks().forEach((t) => t.stop());
  }
  handoff = stream;
}

export function takeLivePreviewHandoff(): MediaStream | null {
  const s = handoff;
  handoff = null;
  return s;
}
