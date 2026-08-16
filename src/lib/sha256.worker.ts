/**
 * SHA-256 of a Blob, off the main thread.
 *
 * SubtleCrypto has no streaming digest, so the whole file is resident in memory
 * while it hashes. Doing that on the main thread froze the uploader after the
 * bytes had already been sent; here it competes with nothing the user can see.
 */

export type Sha256WorkerRequest = {
  type: "sha256";
  requestId: string;
  blob: Blob;
};

export type Sha256WorkerResponse =
  | { type: "sha256-result"; requestId: string; ok: true; hex: string }
  | { type: "sha256-result"; requestId: string; ok: false; error: string };

function toHex(digest: ArrayBuffer): string {
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

self.onmessage = (ev: MessageEvent<Sha256WorkerRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== "sha256") return;
  const reply = (payload: Sha256WorkerResponse) => {
    self.postMessage(payload);
  };
  void (async () => {
    try {
      const bytes = await msg.blob.arrayBuffer();
      reply({
        type: "sha256-result",
        requestId: msg.requestId,
        ok: true,
        hex: toHex(await crypto.subtle.digest("SHA-256", bytes)),
      });
    } catch (err) {
      reply({
        type: "sha256-result",
        requestId: msg.requestId,
        ok: false,
        error: err instanceof Error ? err.message : "Hash failed",
      });
    }
  })();
};
