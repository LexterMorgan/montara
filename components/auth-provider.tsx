"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  configured: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const client = getSupabase();
    setConfigured(!!client);
    if (!client) {
      setLoading(false);
      return;
    }
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string): Promise<void> {
    const client = getSupabase();
    if (!client) throw new Error("Sync is not configured on this device.");
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/overview` },
    });
    if (error) throw new Error("Could not send that link. Check the address and try again.");
  }

  async function signOut(): Promise<void> {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    // Synced expense state is owned by ExpenseProvider, which resets on
    // auth change. Auth never touches prefs, theme, or other preferences.
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, configured, signIn, signOut }}>{children}</AuthContext.Provider>;
}
