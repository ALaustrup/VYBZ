/**
 * K6 load — public pack shell + storefront-checkout Edge (expects 4xx without pack).
 * Threshold: http_req_duration p(95) < 800ms
 *
 * Env:
 *   BASE_URL          default https://vybz.cloud
 *   FUNCTIONS_URL     default https://xixmneooyufbeftdfpcm.supabase.co/functions/v1
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "https://vybz.cloud";
const FUNCTIONS = __ENV.FUNCTIONS_URL || "https://xixmneooyufbeftdfpcm.supabase.co/functions/v1";

export const options = {
  stages: [
    { duration: "20s", target: 100 },
    { duration: "40s", target: 100 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    // Primary gate: latency under load (CDN / Edge).
    http_req_duration: ["p(95)<800"],
  },
};

export default function () {
  const pack = http.get(`${BASE}/pack/demo-test-slug?audit=1`, {
    tags: { name: "pack_page" },
    redirects: 5,
  });
  check(pack, {
    "pack got a response": (r) => typeof r.status === "number" && r.status > 0,
  });

  const checkout = http.post(
    `${FUNCTIONS}/storefront-checkout`,
    JSON.stringify({ packId: "00000000-0000-0000-0000-000000000000" }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "storefront_checkout" },
    },
  );
  check(checkout, {
    "checkout responds": (r) => r.status >= 200 && r.status < 600,
  });

  sleep(0.3);
}
