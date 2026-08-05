"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { onboardTutorUser } from "@/actions/authActions";
import { claimStudentInvite, validateInviteCode } from "@/actions/studentActions";
import { linkParentToStudent } from "@/actions/parentActions";
import { formatAuthError } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Phone, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { refreshClaims } = useAuth();
  const supabase = createClient();

  // Registration Mode & Role
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [role, setRole] = useState<"tutor" | "student" | "owner" | "parent">("tutor");

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [institution, setInstitution] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Phone Auth State
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Common UI State
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("880")) return `+${cleaned}`;
    if (cleaned.startsWith("0")) return `+88${cleaned}`;
    if (cleaned.length === 10) return `+880${cleaned}`;
    return `+${cleaned}`;
  }

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setLoading(true);

    try {
      if (role === "student" || role === "parent") {
        if (!inviteCode) {
          setError(`Invite code is required for ${role} registration.`);
          setLoading(false);
          return;
        }

        if (role === "student") {
          const valRes = await validateInviteCode(inviteCode);
          if (valRes && !valRes.success && valRes.error) {
            setError(valRes.error);
            setLoading(false);
            return;
          }
        }
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpErr) throw signUpErr;

      const user = data.user;
      if (!user) {
        throw new Error("Registration failed.");
      }

      if (role === "tutor" || role === "owner") {
        await onboardTutorUser({
          email: user.email || email,
          displayName: fullName,
          phoneNumber: contactPhone || undefined,
          institution: institution || "Independent",
          role: role,
        }, user.id).catch(() => {});
      } else if (role === "parent") {
        const linkRes = await linkParentToStudent(inviteCode);
        if (!linkRes.success && linkRes.message) {
          setError(linkRes.message);
          setLoading(false);
          return;
        }
      } else {
        const claimRes = await claimStudentInvite(inviteCode, user.id);
        if (claimRes && !claimRes.success && claimRes.error) {
          setError(claimRes.error);
          setLoading(false);
          return;
        }
      }

      await refreshClaims(user).catch(() => {});
      router.push(
        role === "student" ? "/student/dashboard" :
        role === "parent" ? "/parent/dashboard" :
        role === "owner" ? "/owner/dashboard" :
        "/tutor/dashboard"
      );
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError("");

    if (role === "student" || role === "parent") {
      if (!inviteCode) {
        setError(`Please enter your Invite Code before signing up with Google.`);
        return;
      }
      if (role === "student") {
        const valRes = await validateInviteCode(inviteCode);
        if (valRes && !valRes.success && valRes.error) {
          setError(valRes.error);
          return;
        }
      }
    }

    setGoogleLoading(true);

    try {
      localStorage.setItem("tm_onboard_data", JSON.stringify({
        role,
        institution,
        inviteCode
      }));

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

  async function handleSendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!contactPhone || contactPhone.trim().length < 10) {
      setError("Please enter a valid contact phone number.");
      return;
    }

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (role === "student" || role === "parent") {
      if (!inviteCode) {
        setError(`Invite code is required for ${role} registration.`);
        return;
      }
      if (role === "student") {
        const valRes = await validateInviteCode(inviteCode);
        if (valRes && !valRes.success && valRes.error) {
          setError(valRes.error);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const formatted = formatPhoneNumber(contactPhone.trim());
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (otpErr) throw otpErr;
      setOtpSent(true);
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!otpCode) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);

    try {
      const formatted = formatPhoneNumber(contactPhone.trim());
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: otpCode.trim(),
        type: "sms",
      });

      if (verifyErr) throw verifyErr;
      const user = data.user;
      if (!user) throw new Error("Verification failed.");

      if (role === "tutor" || role === "owner") {
        await onboardTutorUser({
          email: user.email || null,
          displayName: fullName,
          phoneNumber: contactPhone,
          institution: institution || "Independent",
          role: role,
        }, user.id).catch(() => {});
      } else if (role === "parent") {
        const linkRes = await linkParentToStudent(inviteCode);
        if (!linkRes.success && linkRes.message) {
          setError(linkRes.message);
          setLoading(false);
          return;
        }
      } else {
        const claimRes = await claimStudentInvite(inviteCode, user.id);
        if (claimRes && !claimRes.success && claimRes.error) {
          setError(claimRes.error);
          setLoading(false);
          return;
        }
      }

      await refreshClaims(user).catch(() => {});
      router.push(role === "student" ? "/student/dashboard" : role === "parent" ? "/parent/dashboard" : role === "owner" ? "/owner/dashboard" : "/tutor/dashboard");
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

      <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
        Create an account
      </h2>
      <p
        className="mt-1 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Get started with TutorMate today
      </p>

      {/* Role Selection Grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => setRole("tutor")}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all gap-1.5 ${
            role === "tutor"
              ? "border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-sm ring-1 ring-indigo-500"
              : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          }`}
        >
          <span className="text-xl">👨‍🏫</span>
          <span className={`font-bold text-xs sm:text-sm ${role === "tutor" ? "text-indigo-900" : ""}`}>Tutor</span>
        </button>

        <button
          type="button"
          onClick={() => setRole("student")}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all gap-1.5 ${
            role === "student"
              ? "border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-sm ring-1 ring-emerald-500"
              : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          }`}
        >
          <span className="text-xl">🎓</span>
          <span className={`font-bold text-xs sm:text-sm ${role === "student" ? "text-emerald-900" : ""}`}>Student</span>
        </button>

        <button
          type="button"
          onClick={() => setRole("parent")}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all gap-1.5 ${
            role === "parent"
              ? "border-amber-500 bg-amber-50/50 text-amber-900 shadow-sm ring-1 ring-amber-500"
              : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          }`}
        >
          <span className="text-xl">👨‍👩‍👧</span>
          <span className={`font-bold text-xs sm:text-sm ${role === "parent" ? "text-amber-900" : ""}`}>Parent</span>
        </button>

        <button
          type="button"
          onClick={() => setRole("owner")}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all gap-1.5 ${
            role === "owner"
              ? "border-purple-500 bg-purple-50/50 text-purple-900 shadow-sm ring-1 ring-purple-500"
              : "border-slate-200 dark:border-white/10 hover:border-slate-300 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          }`}
        >
          <span className="text-xl">🏛️</span>
          <span className={`font-bold text-xs sm:text-sm ${role === "owner" ? "text-purple-900" : ""}`}>Owner</span>
        </button>
      </div>

      {/* Method Switcher Tabs */}
      <div className="mt-4 flex border-b border-slate-200 dark:border-white/10 text-xs font-medium text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={() => {
            setAuthMethod("email");
            setError("");
          }}
          className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
            authMethod === "email"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent hover:text-slate-700"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Email Signup
        </button>
        <button
          type="button"
          onClick={() => {
            setAuthMethod("phone");
            setError("");
          }}
          className={`pb-2 px-3 flex items-center gap-1.5 border-b-2 transition-all ${
            authMethod === "phone"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent hover:text-slate-700"
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          Phone SMS Signup
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
        <form onSubmit={handleEmailRegister} className="mt-6 space-y-4">
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
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
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

          <div>
            <label
              htmlFor="reg-confirm-password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="reg-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg outline-none transition-all duration-200"
                style={{
                  backgroundColor: "var(--color-bg-secondary)",
                  border: `1px solid ${confirmPassword && confirmPassword !== password ? "var(--color-error)" : "var(--color-border)"}`,
                  color: "var(--color-text)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-text-muted)" }}
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-error)" }}>
                Passwords do not match.
              </p>
            )}
          </div>

          {role === "tutor" || role === "owner" ? (
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
                Invite Code {role === "parent" ? "(from your child)" : "(from your tutor)"}
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
            {loading ? "Creating account..." : `Register as ${role === "student" ? "Student" : role === "owner" ? "Owner" : role === "parent" ? "Parent" : "Tutor"}`}
          </button>
        </form>
      ) : (
        /* Phone OTP Registration Form */
        <div className="mt-6 space-y-4">
          {!otpSent ? (
            <form onSubmit={handleSendPhoneOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Tanvir Hossain"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="01712345678"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-indigo-600"
                />
              </div>

              {role === "tutor" || role === "owner" ? (
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Institution / Coaching Name
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. BUET / Excellence Academy"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-indigo-600"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                    Invite Code {role === "parent" ? "(from your child)" : "(from your tutor)"}
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AB12CD34"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-white/10 outline-none uppercase font-mono tracking-wider focus:border-indigo-600"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Sending OTP..." : "Send Verification Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 text-xs text-indigo-700 flex justify-between items-center">
                <span>Code sent to: <strong>{formatPhoneNumber(contactPhone)}</strong></span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="underline font-semibold"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2.5 text-center text-lg tracking-widest font-mono rounded-lg border border-slate-200 dark:border-white/10 outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Registering..." : `Register as ${role === "tutor" ? "Tutor" : "Student"}`}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Social Sign Up Divider */}
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
          onClick={handleGoogleRegister}
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
