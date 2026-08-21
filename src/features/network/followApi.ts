import { supabase } from "@/lib/supabase";

export async function listFollowedCreatorIds(): Promise<string[]> {
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("creator_follows")
    .select("creator_id")
    .eq("follower_id", uid)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((r) => String(r.creator_id));
}

export async function isFollowingCreator(creatorId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid || uid === creatorId) return false;
  const { data, error } = await supabase
    .from("creator_follows")
    .select("creator_id")
    .eq("follower_id", uid)
    .eq("creator_id", creatorId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function followCreator(creatorId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid || uid === creatorId) return false;
  const { error } = await supabase
    .from("creator_follows")
    .upsert({ follower_id: uid, creator_id: creatorId }, { onConflict: "follower_id,creator_id" });
  return !error;
}

export async function unfollowCreator(creatorId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;
  const { error } = await supabase
    .from("creator_follows")
    .delete()
    .eq("follower_id", uid)
    .eq("creator_id", creatorId);
  return !error;
}
