import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import * as api from "@/lib/api";
import type { Profile } from "@/types";

interface ToastState { text: string; token: number }
interface CelebrationState { label: string; token: number }

interface SessionState {
  ready: boolean;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  /** True once signed in AND a username has been chosen. */
  onboarded: boolean;
  backendEnabled: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toast: ToastState | null;
  showToast: (text: string) => void;
  celebration: CelebrationState | null;
  celebrate: (label: string) => void;
  clearCelebration: () => void;
  /** Unread notification count (live). */
  unread: number;
  refreshUnread: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [unread, setUnread] = useState(0);
  const tokenRef = useRef(0);

  const backendEnabled = !!supabase;

  const loadProfile = useCallback(async (id: string) => {
    const p = await api.getMyProfile(id);
    setProfile(p);
    if (p?.username) {
      void (async () => {
        await api.ensureVcSignupGrant().catch(() => 0);
        void api.awardSocialVc("daily_login", "presence", new Date().toISOString().slice(0, 10)).catch(() => undefined);
        const next = await api.getMyProfile(id);
        if (next) setProfile(next);
      })();
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    const client = supabase;
    let cancelled = false;
    const boot = async () => {
      try {
        const { data } = await client.auth.getSession();
        if (cancelled) return;
        const u = data.session?.user ?? null;
        setUserId(u?.id ?? null);
        setEmail(u?.email ?? null);
        // Unblock the UI immediately — profile can arrive a beat later.
        setReady(true);
        if (u) void loadProfile(u.id);
      } catch {
        if (!cancelled) setReady(true);
      }
    };
    void boot();
    // Safety: never leave the app on the boot spinner forever.
    const failsafe = window.setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 8000);
    const { data: sub } = client.auth.onAuthStateChange(async (_e, sess) => {
      const u = sess?.user ?? null;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
      if (u) void loadProfile(u.id);
      else setProfile(null);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const showToast = useCallback((text: string) => {
    setToast({ text, token: ++tokenRef.current });
    const t = tokenRef.current;
    window.setTimeout(() => setToast((cur) => (cur?.token === t ? null : cur)), 3200);
  }, []);
  const celebrate = useCallback((label: string) => {
    setCelebration({ label, token: ++tokenRef.current });
  }, []);
  const clearCelebration = useCallback(() => setCelebration(null), []);

  const signUp = useCallback(async (e: string, p: string) => {
    try { await api.signUp(e, p); return {}; }
    catch (err) { return { error: (err as Error).message }; }
  }, []);
  const signIn = useCallback(async (e: string, p: string) => {
    try { await api.signIn(e, p); return {}; }
    catch (err) { return { error: (err as Error).message }; }
  }, []);
  const signOut = useCallback(async () => { await api.signOut(); setProfile(null); }, []);
  const refreshProfile = useCallback(async () => { if (userId) await loadProfile(userId); }, [userId, loadProfile]);
  const refreshUnread = useCallback(async () => {
    if (!userId) { setUnread(0); return; }
    try { setUnread(await api.unreadNotificationCount()); } catch { /* ignore */ }
  }, [userId]);
  const markNotificationsRead = useCallback(async () => {
    await api.markNotificationsRead();
    setUnread(0);
  }, []);

  // Live unread badge: fetch + subscribe to the user's notification inserts.
  useEffect(() => {
    if (!userId) { setUnread(0); return; }
    void refreshUnread();
    const ch = api.subscribeInserts("notifications", `user_id=eq.${userId}`, () => void refreshUnread());
    return () => api.unsubscribe(ch);
  }, [userId, refreshUnread]);

  const value = useMemo<SessionState>(() => ({
    ready, userId, email, profile,
    onboarded: !!userId && !!profile?.username,
    backendEnabled,
    signUp, signIn, signOut, refreshProfile,
    toast, showToast, celebration, celebrate, clearCelebration,
    unread, refreshUnread, markNotificationsRead,
  }), [ready, userId, email, profile, backendEnabled, signUp, signIn, signOut, refreshProfile, toast, showToast, celebration, celebrate, clearCelebration, unread, refreshUnread, markNotificationsRead]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession must be used within SessionProvider");
  return c;
}
