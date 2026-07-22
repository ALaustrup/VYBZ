import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Loader2, Plus, ChevronRight } from "lucide-react";
import * as api from "@/lib/api";
import { CreateArtistSheet } from "@/components/CreateArtistSheet";
import { useSession } from "@/store/session";
import type { ArtistProfile, Drop } from "@/types";

interface ArtistRosterProps {
  userId: string;
  editable?: boolean;
  drops?: Drop[];
}

/** Official Artist Profiles linked to a user (Phase 2 · model 1A). */
export function ArtistRoster({ userId, editable = false, drops = [] }: ArtistRosterProps) {
  const navigate = useNavigate();
  const { showToast } = useSession();
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  function reload() {
    setLoading(true);
    void api.artistsForUser(userId).then((list) => {
      setArtists(list);
      setLoading(false);
    });
  }

  useEffect(() => { reload(); }, [userId]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="eyebrow">Official projects</p>
        {editable && (
          <button type="button" onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 text-[12px] font-medium text-veil-200 hover:text-white">
            <Plus className="h-3.5 w-3.5" /> Claim artist
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-veil-300" /></div>
      ) : artists.length === 0 ? (
        <p className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-[13px] text-white/45">
          {editable
            ? "Tag ≥2 drops with an artist/band name, then claim an Official Artist page at /artist/your-slug."
            : "No official artist pages linked yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {artists.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => navigate(`/artist/${a.slug}`)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition hover:bg-white/[0.05] active:scale-[0.99]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-veil-500/20 font-display text-sm font-bold text-white">
                  {a.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-white">
                    {a.displayName}
                    {a.verifiedAt && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-veil-200" />}
                  </p>
                  <p className="truncate text-[12px] text-white/40">/artist/{a.slug}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <CreateArtistSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          drops={drops}
          showToast={showToast}
          onCreated={(slug) => { reload(); navigate(`/artist/${slug}`); }}
        />
      )}
    </div>
  );
}
