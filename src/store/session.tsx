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
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const tokenRef = useRef(0);

  const backendEnabled = !!supabase;

  const loadProfile = useCallback(async (id: string) => {
    const p = await api.getMyProfile(id);
    setProfile(p);
  }, []);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
      if (u) await loadProfile(u.id);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, sess) => {
      const u = sess?.user ?? null;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
      if (u) await loadProfile(u.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
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

  const value = useMemo<SessionState>(() => ({
    ready, userId, email, profile,
    onboarded: !!userId && !!profile?.username,
    backendEnabled,
    signUp, signIn, signOut, refreshProfile,
    toast, showToast, celebration, celebrate, clearCelebration,
  }), [ready, userId, email, profile, backendEnabled, signUp, signIn, signOut, refreshProfile, toast, showToast, celebration, celebrate, clearCelebration]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionState {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession must be used within SessionProvider");
  return c;
}
