"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { setTutorClaims } from "@/actions/authActions";
import { claimStudentInvite } from "@/actions/studentActions";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshClaims } = useAuth();
  const [role, setRole] = useState<"tutor" | "student">("tutor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institution, setInstitution] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 2. Set Firebase Auth display name
      await updateProfile(user, { displayName: fullName });

      if (role === "tutor") {
        // Create initial /users document
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          displayName: fullName,
          phoneNumber: contactPhone || null,
          photoURL: null,
          role: "tutor",
          tutorId: user.uid,
          studentDocId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Create initial /tutors document
        await setDoc(doc(db, "tutors", user.uid), {
          id: user.uid,
          fullName,
          institution: institution || "Independent",
          contactPhone,
          bkashNumber: null,
          nagadNumber: null,
          subscription: {
            plan: "free_trial",
            status: "active",
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
            maxStudents: 50,
          },
          stats: {
            totalStudents: 0,
            activeBatches: 0,
            pendingDoubtsCount: 0,
          },
          createdAt: serverTimestamp(),
        });

        // Set custom claims via Server Action
        await setTutorClaims(user.uid);
      } else {
        // Student registration requires an invite code
        if (!inviteCode) {
          throw new Error("Invite code is required for student registration.");
        }

        // Create initial /users doc first
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email,
          displayName: fullName,
          phoneNumber: contactPhone || null,
          photoURL: null,
          role: "student",
          tutorId: null,
          studentDocId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Claim student invite via Server Action (links profile & sets claims)
        await claimStudentInvite(inviteCode, user.uid);
      }

      // Force refresh ID token so client gets new custom claims
      await refreshClaims();

      // Set cookie for middleware
      document.cookie = "__session=1; path=/; max-age=2592000; SameSite=Lax";

      router.push(role === "tutor" ? "/tutor/dashboard" : "/student/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Mobile branding */}
      <div className="lg:hidden mb-8 text-center">
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--color-primary)" }}
        >
          TutorMate
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Smart Tutor Management
        </p>
      </div>

      <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
        Create an account
      </h2>
      <p
        className="mt-1 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Get started with TutorMate today
      </p>

      {/* Role Selection Tabs */}
      <div
        className="mt-6 p-1 rounded-xl flex gap-1"
        style={{ backgroundColor: "var(--color-bg-secondary)" }}
      >
        <button
          type="button"
          onClick={() => setRole("tutor")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            role === "tutor" ? "shadow-sm" : ""
          }`}
          style={{
            backgroundColor:
              role === "tutor" ? "var(--color-surface)" : "transparent",
            color:
              role === "tutor"
                ? "var(--color-primary)"
                : "var(--color-text-secondary)",
          }}
        >
          👨‍🏫 I am a Tutor
        </button>
        <button
          type="button"
          onClick={() => setRole("student")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
            role === "student" ? "shadow-sm" : ""
          }`}
          style={{
            backgroundColor:
              role === "student" ? "var(--color-surface)" : "transparent",
            color:
              role === "student"
                ? "var(--color-primary)"
                : "var(--color-text-secondary)",
          }}
        >
          🎓 I am a Student
        </button>
      </div>

      {error && (
        <div
          className="mt-4 p-3 text-sm rounded-lg"
          style={{
            backgroundColor: "rgb(239 68 68 / 0.1)",
            color: "var(--color-error)",
            border: "1px solid rgb(239 68 68 / 0.2)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="reg-name"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Full Name
          </label>
          <input
            id="reg-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Tanvir Hossain"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all duration-200"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="reg-email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Email Address
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all duration-200"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="reg-password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all duration-200"
            style={{
              backgroundColor: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
        </div>

        {role === "tutor" ? (
          <>
            <div>
              <label
                htmlFor="reg-institution"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Institution / Coaching Name
              </label>
              <input
                id="reg-institution"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. BUET / Excellence Coaching"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all duration-200"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="reg-phone"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Contact Phone
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="01712345678"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all duration-200"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
              />
            </div>
          </>
        ) : (
          <div>
            <label
              htmlFor="reg-invite"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Invite Code (from your tutor)
            </label>
            <input
              id="reg-invite"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB12CD34"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none tracking-wider uppercase font-mono transition-all duration-200"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {loading ? "Creating account..." : `Register as ${role === "tutor" ? "Tutor" : "Student"}`}
        </button>
      </form>

      <p
        className="mt-8 text-center text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
