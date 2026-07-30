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
  refreshClaims: (forUser?: User) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  claims: null,
  role: null,
  loading: true,
  refreshClaims: async (_forUser?: User) => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<CustomClaims | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function fetchUserClaims(supabaseUser: User): Promise<CustomClaims | null> {
    try {
      const { data: tutor } = await supabase
        .from("tutors")
        .select("id")
        .or(`user_id.eq.${supabaseUser.id},id.eq.${supabaseUser.id}`)
        .limit(1)
        .maybeSingle();

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      if (tutor || profile) {
        const role = profile?.role || (tutor ? "tutor" : null);
        const resolvedTutorId = tutor?.id || profile?.tutor_id || supabaseUser.id;

        if (role === "tutor") {
          return {
            role: "tutor",
            tutorId: resolvedTutorId,
          };
        }
        if (role === "student") {
          return {
            role: "student",
            tutorId: profile?.tutor_id || "",
            studentDocId: profile?.student_doc_id || "",
          };
        }
        if (role === "admin") {
          return { role: "admin" };
        }
        if (role === "owner") {
          return { role: "owner" };
        }
        if (role === "parent") {
          return {
            role: "parent",
            studentId: profile?.student_doc_id || "",
            studentAuthUid: "",
            tutorId: profile?.tutor_id || "",
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async function refreshClaims(forUser?: User) {
    const targetUser = forUser ?? user;
    if (!targetUser) return;
    const newClaims = await fetchUserClaims(targetUser);
    setClaims(newClaims);
  }

  async function refreshUser() {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user ?? null;
    if (currentUser) {
      const newClaims = await fetchUserClaims(currentUser);
      setUser(currentUser);
      setClaims(newClaims);
    } else {
      setUser(null);
      setClaims(null);
    }
  }

  useEffect(() => {
    async function initAuth() {
      try {
        const { data } = await supabase.auth.getUser();
        const currentUser = data?.user ?? null;
        if (currentUser) {
          const initialClaims = await fetchUserClaims(currentUser);
          setUser(currentUser);
          setClaims(initialClaims);
        } else {
          setUser(null);
          setClaims(null);
        }
      } catch (err) {
        console.error("initAuth error:", err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        if (currentUser) {
          const newClaims = await fetchUserClaims(currentUser);
          setUser(currentUser);
          setClaims(newClaims);
        } else {
          setUser(null);
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
