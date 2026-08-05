"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

// Created once at module level — not inside AuthProvider — to prevent duplicate instances
const supabase = createClient();
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

  async function fetchUserClaims(supabaseUser: User, forceDbCheck = false): Promise<CustomClaims | null> {
    // 1. Fast Path: Check user_metadata (no DB queries needed!)
    const meta = supabaseUser.user_metadata;
    if (!forceDbCheck && meta?.role) {
      if (meta.role === "tutor") {
        return {
          role: "tutor",
          tutorId: meta.tutorId || supabaseUser.id,
        };
      }
      if (meta.role === "student") {
        return {
          role: "student",
          tutorId: meta.tutorId || "",
          studentDocId: meta.studentDocId || "",
        };
      }
      if (meta.role === "admin") {
        return { role: "admin" };
      }
      if (meta.role === "owner") {
        return { role: "owner" };
      }
      if (meta.role === "parent") {
        return {
          role: "parent",
          studentId: meta.studentId || meta.studentDocId || "",
          studentAuthUid: meta.studentAuthUid || "",
          tutorId: meta.tutorId || "",
        };
      }
    }

    // 2. Fallback Path: Query database if metadata isn't synced yet
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

        let metaDataToSync: Record<string, any> | null = null;
        let claimsObj: CustomClaims | null = null;

        if (role === "tutor") {
          claimsObj = { role: "tutor", tutorId: resolvedTutorId };
          metaDataToSync = { role: "tutor", tutorId: resolvedTutorId };
        } else if (role === "student") {
          claimsObj = {
            role: "student",
            tutorId: profile?.tutor_id || "",
            studentDocId: profile?.student_doc_id || "",
          };
          metaDataToSync = {
            role: "student",
            tutorId: profile?.tutor_id || "",
            studentDocId: profile?.student_doc_id || "",
          };
        } else if (role === "admin") {
          claimsObj = { role: "admin" };
          metaDataToSync = { role: "admin" };
        } else if (role === "owner") {
          claimsObj = { role: "owner" };
          metaDataToSync = { role: "owner" };
        } else if (role === "parent") {
          claimsObj = {
            role: "parent",
            studentId: profile?.student_doc_id || "",
            studentAuthUid: "",
            tutorId: profile?.tutor_id || "",
          };
          metaDataToSync = {
            role: "parent",
            studentId: profile?.student_doc_id || "",
            studentAuthUid: "",
            tutorId: profile?.tutor_id || "",
          };
        }

        if (metaDataToSync) {
          // Asynchronously sync to Supabase Auth user_metadata so future loads use fast-path
          supabase.auth.updateUser({ data: metaDataToSync }).catch(() => {});
        }

        return claimsObj;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function refreshClaims(forUser?: User, forceDbCheck = false) {
    const targetUser = forUser ?? user;
    if (!targetUser) return;
    const newClaims = await fetchUserClaims(targetUser, forceDbCheck);
    setClaims(newClaims);
  }

  async function refreshUser(forceDbCheck = false) {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user ?? null;
    if (currentUser) {
      const newClaims = await fetchUserClaims(currentUser, forceDbCheck);
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
