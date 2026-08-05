"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, LogIn, ArrowRight, Loader2, QrCode } from "lucide-react";

// ─── Inner component that uses useSearchParams ─────────────────────────────────

function JoinContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") ?? "";

  const [code, setCode] = useState(codeFromUrl.toUpperCase());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (codeFromUrl) setCode(codeFromUrl.toUpperCase());

    // Detect auth by calling a lightweight /api/auth/me endpoint (no body needed)
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => setIsLoggedIn(r.ok))
      .catch(() => setIsLoggedIn(false));
  }, [codeFromUrl]);

  const safeCode = encodeURIComponent(code);
  const loginUrl = `/login?redirect=/tutor/coaching&joinCode=${safeCode}`;
  const registerUrl = `/register?redirect=/tutor/coaching&joinCode=${safeCode}`;
  const coachingUrl = `/tutor/coaching?joinCode=${safeCode}`;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--color-bg, #0f172a)" }}
    >
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
            style={{ background: "linear-gradient(135deg, rgb(245,158,11) 0%, rgb(180,83,9) 100%)" }}
          >
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "var(--color-text, #f8fafc)" }}>
              Join a Coaching Center
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              You've been invited to join a coaching center on TutorMate.
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div
          className="rounded-2xl p-6 space-y-5 shadow-xl"
          style={{
            background: "var(--color-surface, #1e293b)",
            border: "1px solid var(--color-border, rgba(255,255,255,0.1))",
          }}
        >
          {/* Code Display (from URL) or Input */}
          {codeFromUrl ? (
            <div
              className="p-5 rounded-xl text-center space-y-1.5"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgb(217,119,6)" }}>
                Your Invite Code
              </p>
              <p
                className="text-3xl font-black font-mono tracking-widest"
                style={{ color: "rgb(245,158,11)" }}
              >
                {code}
              </p>
            </div>
          ) : (
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--color-text-secondary, #cbd5e1)" }}
              >
                Enter Center Join Code *
              </label>
              <input
                type="text"
                maxLength={9}
                placeholder="e.g. CC-8A9F2K"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 text-sm font-mono font-bold tracking-widest text-center rounded-xl border outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                style={{
                  background: "var(--color-bg-secondary, #0f172a)",
                  borderColor: "var(--color-border, rgba(255,255,255,0.1))",
                  color: "var(--color-text, #f8fafc)",
                }}
              />
            </div>
          )}

          {/* Auth-aware CTA */}
          {isLoggedIn === null ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "rgb(245,158,11)" }} />
            </div>
          ) : isLoggedIn ? (
            /* Already logged in */
            <div className="space-y-2">
              <Link
                href={coachingUrl}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, rgb(245,158,11) 0%, rgb(180,83,9) 100%)" }}
              >
                <Building2 className="w-4 h-4" />
                Join Center Now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-center text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
                This will link your tutor account to the coaching center.
              </p>
            </div>
          ) : (
            /* Not logged in */
            <div className="space-y-3">
              <Link
                href={loginUrl}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, rgb(245,158,11) 0%, rgb(180,83,9) 100%)" }}
              >
                <LogIn className="w-4 h-4" />
                Log In to Join Center
              </Link>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "var(--color-border, rgba(255,255,255,0.1))" }} />
                <span className="text-xs" style={{ color: "var(--color-text-muted, #64748b)" }}>
                  or
                </span>
                <div className="flex-1 h-px" style={{ background: "var(--color-border, rgba(255,255,255,0.1))" }} />
              </div>

              <Link
                href={registerUrl}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 hover:opacity-80"
                style={{
                  borderColor: "var(--color-border, rgba(255,255,255,0.15))",
                  color: "var(--color-text, #f8fafc)",
                  background: "transparent",
                }}
              >
                Create Free Account & Join
              </Link>
            </div>
          )}
        </div>

        {/* How it works */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--color-surface, #1e293b)",
            border: "1px solid var(--color-border, rgba(255,255,255,0.08))",
          }}
        >
          <p className="text-xs font-bold" style={{ color: "var(--color-text, #f8fafc)" }}>
            How it works
          </p>
          {[
            "Log in or create a TutorMate account",
            "Click \"Join Center Now\" with the code above",
            "Your tutor account will be linked to the coaching center",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: "rgba(245,158,11,0.15)", color: "rgb(245,158,11)" }}
              >
                {i + 1}
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
                {step}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px]" style={{ color: "var(--color-text-muted, #64748b)" }}>
          Powered by{" "}
          <Link href="/" className="font-bold" style={{ color: "rgb(245,158,11)" }}>
            TutorMate
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Page export with Suspense (required for useSearchParams in Next.js App Router) ─

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f172a" }}>
          <div
            className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "rgb(245,158,11)", borderTopColor: "transparent" }}
          />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
