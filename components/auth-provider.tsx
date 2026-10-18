"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  configured: false,
  signIn: async () => {},
  verifyCode: async () => {},
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
    if (error) {
      // GoTrue reuses over_email_send_rate_limit for both the per-address
      // cooldown and the project's mailer cap, so confirm with its message
      // before telling anyone to retry in a minute.
      const perAddressCooldown = error.code === "over_email_send_rate_limit" && /for security purposes|after \d+ seconds/i.test(error.message ?? "");
      throw new Error(
        perAddressCooldown
          ? "One email per address per minute. Wait a minute, then try again."
          : error.status === 429
            ? "This project's email limit was reached. Try again later."
            : "Could not send that email. Check the address and try again.",
      );
    }
  }

  // The same email carries a 6-digit code: typing it keeps the session in the
  // browser the user is already holding, instead of whichever app opens the link.
  async function verifyCode(email: string, code: string): Promise<void> {
    const client = getSupabase();
    if (!client) throw new Error("Sync is not configured on this device.");
    const { error } = await client.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      throw new Error(
        error.code === "otp_expired"
          ? "That code has expired. Request a new email."
          : "That code did not work. Check the email and try again.",
      );
    }
  }

  async function signOut(): Promise<void> {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    // Synced expense state is owned by ExpenseProvider, which resets on
    // auth change. Auth never touches prefs, theme, or other preferences.
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, configured, signIn, verifyCode, signOut }}>{children}</AuthContext.Provider>;
}
