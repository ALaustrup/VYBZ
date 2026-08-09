/**
 * Lightweight node:test for Grok prose → observation parse.
 * Run: node --test scripts/ai-review-ingest.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGrokProse } from "./ai-review-ingest.mjs";

test("parseGrokProse extracts id, url, bodySample", () => {
  const text = `
id: home.landing-primary-cta
origin: { detector: "grok.ui-review", version: "1.0.0", sourceType: "web" }
evidence:

url: https://vybz.cloud/
bodySample: Headline and CTAs.

id: library.unauthenticated-fallback
origin: { detector: "grok.ui-review", version: "1.0.0", sourceType: "web" }
evidence:

url: https://vybz.cloud/library
bodySample: Marketing landing shell.
`;
  const obs = parseGrokProse(text);
  assert.equal(obs.length, 2);
  assert.equal(obs[0].id, "home.landing-primary-cta");
  assert.equal(obs[0].evidence.url, "https://vybz.cloud/");
  assert.match(obs[0].evidence.bodySample, /Headline/);
  assert.equal(obs[1].surface, "library");
  assert.equal(obs[1].category, "gate");
});
