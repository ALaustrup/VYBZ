import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { fetchAtcAbuseReview, type AtcAbuseRow } from "./atcApi";

export function AirtimeReviewTab() {
  const [rows, setRows] = useState<AtcAbuseRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchAtcAbuseReview().then((list) => {
      if (!list) setErr("Couldn't load Airtime review");
      else setRows(list);
    });
  }, []);

  if (err) return <p className="text-sm text-white/50">{err}</p>;
  if (!rows) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-veil-300" />
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="text-sm text-white/45">No listen-earn events in the last 24 hours.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-white/40">Last 24 hours of listen-earn. Counts are measured ledger rows.</p>
      {rows.map((r) => (
        <div key={r.listenerId} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px]">
          <p className="font-mono text-white/80">{r.listenerId.slice(0, 8)}</p>
          <p className="text-white/45">
            {r.atc24h} ATC · {r.events24h} events · {r.hosts24h} hosts
            {r.rateLimited ? " · rate limited" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
