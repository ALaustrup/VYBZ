/**
 * Vite plugin: GET /e2e/ai-review → MACHINE manifest JSON (read-only).
 *
 * Local `vite` / `vite preview` only. Production Vercel never runs this middleware.
 */
import type { Connect, Plugin } from "vite";
import {
  AI_REVIEW_MANIFEST,
  AI_REVIEW_MANIFEST_ENDPOINT,
} from "../src/app/aiReview/machineManifest";

function isManifestPath(url: string | undefined): boolean {
  if (!url) return false;
  const pathOnly = url.split("?")[0];
  return (
    pathOnly === AI_REVIEW_MANIFEST_ENDPOINT ||
    pathOnly === `${AI_REVIEW_MANIFEST_ENDPOINT}/`
  );
}

const manifestMiddleware: Connect.NextHandleFunction = (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  if (!isManifestPath(req.url)) {
    next();
    return;
  }

  const body = JSON.stringify(AI_REVIEW_MANIFEST, null, 2);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-VYBZ-AI-Review", "manifest");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
};

export function aiReviewManifestPlugin(): Plugin {
  return {
    name: "vybz-ai-review-manifest-json",
    configureServer(server) {
      server.middlewares.use(manifestMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(manifestMiddleware);
    },
  };
}
