"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole, CustomClaims } from "@/types";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  claims: CustomClaims | null;
  role: UserRole | null;
  loading: boolean;
  refreshClaims: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  claims: null,
  role: null,
  loading: true,
  refreshClaims: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function fetchUserClaims(supabaseUser: User): Promise<CustomClaims | null> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .single();

      if (profile) {
        if (profile.role === "tutor") {
          return {
            role: "tutor",
            tutorId: profile.tutor_id || supabaseUser.id,
          };
        }
        if (profile.role === "student") {
          return {
            role: "student",
            tutorId: profile.tutor_id || "",
            studentDocId: profile.student_doc_id || "",
          };
        }
        if (profile.role === "admin") {
          return { role: "admin" };
        }
      }
      // If no profile exists, return null so they are forced to onboard
      return null;
    } catch {
      return null;
    }
  }

  async function refreshClaims() {
    if (!user) return;
    const newClaims = await fetchUserClaims(user);
    setClaims(newClaims);
  }

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user ?? null;
    setUser(currentUser);
    if (currentUser) {
      const newClaims = await fetchUserClaims(currentUser);
      setClaims(newClaims);
    }
  }

  useEffect(() => {
    async function initAuth() {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const initialClaims = await fetchUserClaims(currentUser);
        setClaims(initialClaims);
      }
      setLoading(false);
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const newClaims = await fetchUserClaims(currentUser);
          setClaims(newClaims);
        } else {
          setClaims(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const role = claims?.role ?? null;

  return (
    <AuthContext.Provider
      value={{ user, claims, role, loading, refreshClaims, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
