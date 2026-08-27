"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { onboardTutorUser } from "@/actions/authActions";
import { claimStudentInvite } from "@/actions/studentActions";
import { linkParentToStudent } from "@/actions/parentActions";
import { formatAuthError } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Phone, Mail, Sparkles, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refreshClaims } = useAuth();
  const supabase = createClient();
  const isRedirectingRef = useRef(false);

  // Auth Modes & Form States
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone Auth State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Common UX States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Onboarding modal for new users
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [onboardRole, setOnboardRole] = useState<"tutor" | "student" | "owner" | "parent">("tutor");
  const [onboardName, setOnboardName] = useState("");
  const [onboardInstitution, setOnboardInstitution] = useState("");
  const [onboardInviteCode, setOnboardInviteCode] = useState("");

  useEffect(() => {
    if (!authLoading && user && !pendingUser && !isCheckingProfile && !isRedirectingRef.current) {
      handlePostSignIn(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, pendingUser, isCheckingProfile]);

  // Read URL error param (e.g. from OAuth callback failure)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "auth_callback_error") {
      setError("Google authentication failed. Please check your Supabase dashboard settings or try again.");
    } else if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  async function handlePostSignIn(user: User) {
    if (isRedirectingRef.current) return;
    try {
      setIsCheckingProfile(true);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .maybeSingle();

      // If a DB/network error occurs (not a 'not found'), show a user-friendly error
      // and do NOT show the onboarding modal — the user may already have an account.
      if (profileError && profileError.code !== "PGRST116") {
        setError("Unable to fetch your account. Please try again.");
        setLoading(false);
        setIsCheckingProfile(false);
        return;
      }

      // Existing user — redirect straight to their dashboard or requested redirect
      if (profile) {
        isRedirectingRef.current = true;
        await refreshClaims().catch(() => {});
        const redirectParam = searchParams.get("redirect");

        let destination = "/tutor/dashboard";
        if (profile.role === "student") {
          destination = redirectParam && redirectParam.startsWith("/student") ? redirectParam : "/student/dashboard";
        } else if (profile.role === "parent") {
          destination = redirectParam && redirectParam.startsWith("/parent") ? redirectParam : "/parent/dashboard";
        } else if (profile.role === "owner" || profile.role === "admin") {
          destination = redirectParam && (redirectParam.startsWith("/owner") || redirectParam.startsWith("/tutor")) ? redirectParam : "/owner/dashboard";
        } else {
          destination = redirectParam && redirectParam.startsWith("/tutor") ? redirectParam : "/tutor/dashboard";
        }

        router.replace(destination);
        return;
      }

      // Genuinely new user — no profile exists, show onboarding
      let savedRole: "tutor" | "student" | "owner" | "parent" = "tutor";
      let savedInstitution = "";
      let savedInviteCode = "";
      try {
        const savedData = localStorage.getItem("tm_onboard_data");
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (["tutor", "student", "owner", "parent"].includes(parsed.role)) savedRole = parsed.role;
          if (parsed.institution) savedInstitution = parsed.institution;
          if (parsed.inviteCode) savedInviteCode = parsed.inviteCode;
        }
      } catch {
        // ignore localStorage errors
      }

      setPendingUser(user);
      setOnboardName(user.user_metadata?.full_name || user.user_metadata?.displayName || "");
      setOnboardRole(savedRole);
      setOnboardInstitution(savedInstitution);
      setOnboardInviteCode(savedInviteCode);

      // Clear the data after pre-filling
      localStorage.removeItem("tm_onboard_data");
    } catch {
      // Unexpected error — do not silently fall into onboarding
      setError("Something went wrong while verifying your account. Please refresh.");
      setLoading(false);
    } finally {
      setIsCheckingProfile(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) throw signInErr;
      if (data.user) {
        await handlePostSignIn(data.user);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (oauthErr) throw oauthErr;
    } catch (err: unknown) {
      setError(formatAuthError(err));
      setGoogleLoading(false);
    }
  }

  function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("880")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+88${cleaned}`;
    if (cleaned.length === 10) return `+880${cleaned}`;
    return `+${cleaned}`;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phoneNumber || phoneNumber.trim().length < 10) {
      setError("Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    try {
      const formatted = formatPhoneNumber(phoneNumber.trim());
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: formatted,
      });
      if (otpErr) throw otpErr;
      setOtpSent(true);
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!otpCode) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const formatted = formatPhoneNumber(phoneNumber.trim());
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: otpCode.trim(),
        type: "sms",
      });

      if (verifyErr) throw verifyErr;
      if (data.user) {
        await handlePostSignIn(data.user);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteOnboarding(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingUser) return;

    setError("");
    setLoading(true);

    try {
      if (onboardRole === "tutor" || onboardRole === "owner") {
        const res = await onboardTutorUser({
          data: {
            email: pendingUser.email || null,
            displayName: onboardName || "User",
            phoneNumber: pendingUser.phone || undefined,
            institution: onboardInstitution || "Independent",
            role: onboardRole as "tutor" | "owner",
          },
          uidOrToken: pendingUser.id,
        });
        if (res && !res.success && (res as any).error) {
          setError((res as any).error);
          setLoading(false);
          return;
        }
      } else if (onboardRole === "parent") {
        if (!onboardInviteCode) {
          setError("Invite code is required for parent registration.");
          setLoading(false);
          return;
        }
        const linkRes = await linkParentToStudent(onboardInviteCode);
        if (!linkRes.success && linkRes.message) {
          setError(linkRes.message);
          setLoading(false);
          return;
        }
      } else {
        if (!onboardInviteCode) {
          setError("Invite code is required for student registration.");
          setLoading(false);
          return;
        }
        const claimRes = await claimStudentInvite({ inviteCode: onboardInviteCode, uidOrToken: pendingUser.id });
        if (claimRes && !claimRes.success && claimRes.error) {
          setError(claimRes.error);
          setLoading(false);
          return;
        }
      }

      await refreshClaims().catch(() => {});
      router.push(onboardRole === "student" ? "/student/dashboard" : onboardRole === "parent" ? "/parent/dashboard" : onboardRole === "owner" ? "/owner/dashboard" : "/tutor/dashboard");
    } catch (err: unknown) {
      setError(formatAuthError(err));
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

      {(authLoading || isCheckingProfile) ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-500">
            {authLoading ? "Checking authentication..." : "Verifying account profile..."}
          </p>
        </div>
      ) : !pendingUser ? (
        <>
          <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Welcome back
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Sign in to your TutorMate account
          </p>

          {/* Auth Method Switcher Tabs */}
          <div
            className="mt-6 p-1 rounded-xl flex gap-1"
            style={{ backgroundColor: "var(--color-bg-secondary)" }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMethod("email");
                setError("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === "email" ? "shadow-sm" : ""
              }`}
              style={{
                backgroundColor:
                  authMethod === "email" ? "var(--color-surface)" : "transparent",
                color:
                  authMethod === "email"
                    ? "var(--color-primary)"
                    : "var(--color-text-secondary)",
              }}
            >
              <Mail className="w-3.5 h-3.5" />
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMethod("phone");
                setError("");
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                authMethod === "phone" ? "shadow-sm" : ""
              }`}
              style={{
                backgroundColor:
                  authMethod === "phone" ? "var(--color-surface)" : "transparent",
                color:
                  authMethod === "phone"
                    ? "var(--color-primary)"
                    : "var(--color-text-secondary)",
              }}
            >
              <Phone className="w-3.5 h-3.5" />
              Phone SMS OTP
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

          {authMethod === "email" ? (
            /* Email Login Form */
            <form onSubmit={handleEmailLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Email Address
                </label>
                <input
                  id="login-email"
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
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Password
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-xs font-medium hover:underline"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg outline-none transition-all duration-200"
                    style={{
                      backgroundColor: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 opacity-50 hover:opacity-100 transition-opacity"
                    style={{ color: "var(--color-text-muted)" }}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                {loading ? "Signing in..." : "Sign in with Email"}
              </button>
            </form>
          ) : (
            /* Phone OTP Login Form */
            <div className="mt-6 space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-phone"
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Mobile Phone Number
                    </label>
                    <input
                      id="login-phone"
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 01712345678"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg outline-none transition-all duration-200"
                      style={{
                        backgroundColor: "var(--color-bg-secondary)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                    />
                    <p className="mt-1 text-xs text-slate-400">
                      We will send a 6-digit OTP code to verify your phone number.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    {loading ? "Sending OTP..." : "Send Verification Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 text-xs text-indigo-700 flex justify-between items-center">
                    <span>Code sent to: <strong>{formatPhoneNumber(phoneNumber)}</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="underline font-semibold"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label
                      htmlFor="login-otp"
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      id="login-otp"
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3.5 py-2.5 text-center text-lg tracking-widest font-mono rounded-lg outline-none transition-all duration-200"
                      style={{
                        backgroundColor: "var(--color-bg-secondary)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Social Sign In Divider */}
          <div className="mt-6">
            <div className="relative">
              <div
                className="absolute inset-0 flex items-center"
                aria-hidden="true"
              >
                <div
                  className="w-full"
                  style={{
                    borderTop: "1px solid var(--color-border)",
                  }}
                />
              </div>
              <div className="relative flex justify-center text-xs">
                <span
                  className="px-3"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  or continue with
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              className="mt-4 w-full py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {googleLoading ? "Redirecting to Google..." : "Google"}
            </button>
          </div>

          <p
            className="mt-8 text-center text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Sign up
            </Link>
          </p>
        </>
      ) : (
        /* Onboarding View for New Social/Phone Users */
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-xl font-bold">Complete your Profile</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Welcome to TutorMate! Please choose your account type to finalize registration.
          </p>

          {error && (
            <div className="p-3 text-sm rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setOnboardRole("tutor")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all gap-1.5 ${
                onboardRole === "tutor"
                  ? "border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-sm ring-1 ring-indigo-500"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="text-xl">👨‍🏫</span>
              <span className={`font-bold text-xs sm:text-sm ${onboardRole === "tutor" ? "text-indigo-900" : ""}`}>Tutor</span>
            </button>

            <button
              type="button"
              onClick={() => setOnboardRole("student")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all gap-1.5 ${
                onboardRole === "student"
                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-sm ring-1 ring-emerald-500"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="text-xl">🎓</span>
              <span className={`font-bold text-xs sm:text-sm ${onboardRole === "student" ? "text-emerald-900" : ""}`}>Student</span>
            </button>

            <button
              type="button"
              onClick={() => setOnboardRole("parent")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all gap-1.5 ${
                onboardRole === "parent"
                  ? "border-amber-500 bg-amber-50/50 text-amber-900 shadow-sm ring-1 ring-amber-500"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="text-xl">👨‍👩‍👧</span>
              <span className={`font-bold text-xs sm:text-sm ${onboardRole === "parent" ? "text-amber-900" : ""}`}>Parent</span>
            </button>

            <button
              type="button"
              onClick={() => setOnboardRole("owner")}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all gap-1.5 ${
                onboardRole === "owner"
                  ? "border-purple-500 bg-purple-50/50 text-purple-900 shadow-sm ring-1 ring-purple-500"
                  : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
              }`}
            >
              <span className="text-xl">🏛️</span>
              <span className={`font-bold text-xs sm:text-sm ${onboardRole === "owner" ? "text-purple-900" : ""}`}>Owner</span>
            </button>
          </div>

          <form onSubmit={handleCompleteOnboarding} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                required
                value={onboardName}
                onChange={(e) => setOnboardName(e.target.value)}
                placeholder="e.g. Tanvir Hossain"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-indigo-600"
              />
            </div>

            {onboardRole === "tutor" || onboardRole === "owner" ? (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                  Institution / Coaching Name
                </label>
                <input
                  type="text"
                  value={onboardInstitution}
                  onChange={(e) => setOnboardInstitution(e.target.value)}
                  placeholder="e.g. BUET / Excellence Academy"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-indigo-600"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                  Invite Code {onboardRole === "parent" ? "(from your child)" : "(from your tutor)"}
                </label>
                <input
                  type="text"
                  required
                  value={onboardInviteCode}
                  onChange={(e) => setOnboardInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD34"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-white/10 outline-none uppercase font-mono tracking-wider focus:border-indigo-600"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Setting up account..." : "Complete & Enter Dashboard"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
