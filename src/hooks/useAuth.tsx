"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  type User,
  type IdTokenResult,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import type { UserRole, CustomClaims } from "@/types";

interface AuthState {
  user: User | null;
  claims: CustomClaims | null;
  role: UserRole | null;
  loading: boolean;
  /** Force refresh the ID token to pick up new custom claims */
  refreshClaims: () => Promise<void>;
  /** Reload Firebase Auth user & refresh local state */
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

  async function extractClaims(firebaseUser: User): Promise<CustomClaims | null> {
    try {
      const tokenResult: IdTokenResult = await firebaseUser.getIdTokenResult();
      const c = tokenResult.claims;

      if (c.role === "tutor") {
        return {
          role: "tutor",
          tutorId: (c.tutorId as string) ?? firebaseUser.uid,
        };
      }
      if (c.role === "student") {
        return {
          role: "student",
          tutorId: c.tutorId as string,
          studentDocId: c.studentDocId as string,
        };
      }
      if (c.role === "admin") {
        return { role: "admin" };
      }

      // Fallback: Fetch role from Firestore /users/{uid} document
      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userSnap.exists()) {
        const u = userSnap.data();
        if (u.role === "student") {
          return {
            role: "student",
            tutorId: u.tutorId as string,
            studentDocId: u.studentDocId as string,
          };
        }
        if (u.role === "tutor") {
          return {
            role: "tutor",
            tutorId: (u.tutorId as string) || firebaseUser.uid,
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async function refreshClaims() {
    if (!user) return;
    // Force-refresh the ID token to pick up newly set custom claims
    await user.getIdToken(true);
    const newClaims = await extractClaims(user);
    setClaims(newClaims);
  }

  async function refreshUser() {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const extractedClaims = await extractClaims(firebaseUser);
        setClaims(extractedClaims);
      } else {
        setClaims(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const role = claims?.role ?? null;

  return (
    <AuthContext.Provider value={{ user, claims, role, loading, refreshClaims, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state and custom claims.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
