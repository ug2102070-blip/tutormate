"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Eye, EyeOff, Link2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { linkParentToStudent } from "@/actions/parentActions";

type Step = "auth" | "link" | "done";

export default function ParentLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("auth");
  const [mode, setMode] = useState<"login" | "register">("login");

  // Auth form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Link form
  const [inviteCode, setInviteCode] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [linkedName, setLinkedName] = useState("");

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Check if parent already has a linked student → go straight to dashboard
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingLink } = await supabase
          .from("parent_links")
          .select("id")
          .eq("parent_uid", user.id)
          .limit(1)
          .single();

        if (existingLink) {
          router.push("/parent/dashboard");
          return;
        }
      }
      setStep("link");
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkError("");
    setLinkLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired. Please log in again.");

      const result = await linkParentToStudent(inviteCode, user.id);

      if (!result.success) {
        setLinkError(result.message || "Failed to link account");
        return;
      }

      setLinkedName(result.studentName || "your child");
      setStep("done");
      setTimeout(() => router.push("/parent/dashboard"), 2000);
    } catch (err: any) {
      setLinkError(err.message || "Failed to link account");
    } finally {
      setLinkLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl"
            style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-primary-100)" }}
          >
            <Users className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
              Parent Portal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-text)" }}>
            TutorMate
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Monitor your child's academic progress
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 justify-center">
          {["auth", "link", "done"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: step === s
                    ? "var(--color-primary)"
                    : (["auth", "link", "done"].indexOf(step) > i ? "var(--color-primary)" : "var(--color-border)"),
                  color: step === s || ["auth", "link", "done"].indexOf(step) > i ? "#fff" : "var(--color-text-muted)",
                }}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className="w-8 h-0.5"
                  style={{
                    background: ["auth", "link", "done"].indexOf(step) > i
                      ? "var(--color-primary)"
                      : "var(--color-border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: Auth */}
        {step === "auth" && (
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
          >
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                {mode === "login" ? "Sign In" : "Create Account"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {mode === "login"
                  ? "Sign in to your parent account"
                  : "Create a new parent account"}
              </p>
            </div>

            {authError && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-xs font-medium"
                style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #ef4444)", border: "1px solid var(--color-error-border, #fecaca)" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="parent@example.com"
                  id="parent-email"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "var(--color-input-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    id="parent-password"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all pr-10"
                    style={{
                      background: "var(--color-input-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showPw
                      ? <EyeOff className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                      : <Eye className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                    }
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                id="parent-auth-submit"
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "var(--color-primary)", color: "#fff" }}
              >
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setAuthError(""); }}
                className="text-xs font-semibold"
                style={{ color: "var(--color-primary)" }}
              >
                {mode === "login"
                  ? "Don't have an account? Register"
                  : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Link Student */}
        {step === "link" && (
          <div
            className="rounded-2xl p-6 space-y-5"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "var(--color-primary-50)" }}
              >
                <Link2 className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                  Link Your Child
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  Enter the invite code shared by your child's tutor
                </p>
              </div>
            </div>

            {linkError && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-xs font-medium"
                style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #ef4444)", border: "1px solid var(--color-error-border, #fecaca)" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {linkError}
              </div>
            )}

            <form onSubmit={handleLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}>
                  Student Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. TM-ABC123"
                  id="parent-invite-code"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all font-mono tracking-widest"
                  style={{
                    background: "var(--color-input-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  maxLength={20}
                />
                <p className="text-[11px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                  Ask your child's tutor for this code
                </p>
              </div>

              <button
                type="submit"
                disabled={linkLoading || !inviteCode.trim()}
                id="parent-link-submit"
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "var(--color-primary)", color: "#fff" }}
              >
                {linkLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Link Account
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === "done" && (
          <div
            className="rounded-2xl p-8 text-center space-y-4"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: "var(--color-success-bg, #f0fdf4)" }}
            >
              <CheckCircle2 className="w-8 h-8" style={{ color: "var(--color-success, #22c55e)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                Account Linked! 🎉
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                You are now linked to <strong>{linkedName}</strong>. Redirecting to your dashboard...
              </p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--color-primary)" }} />
          </div>
        )}

        <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
          Are you a tutor or student?{" "}
          <Link href="/login" className="font-semibold" style={{ color: "var(--color-primary)" }}>
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
