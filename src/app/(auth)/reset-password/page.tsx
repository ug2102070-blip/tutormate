"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) throw resetErr;
      setMessage("Password reset link sent! Check your inbox.");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to send password reset email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
        Reset your password
      </h2>
      <p
        className="mt-1 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      {message && (
        <div
          className="mt-4 p-3 text-sm rounded-lg"
          style={{
            backgroundColor: "rgb(16 185 129 / 0.1)",
            color: "var(--color-success)",
            border: "1px solid rgb(16 185 129 / 0.2)",
          }}
          role="status"
        >
          {message}
        </div>
      )}

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

      <form onSubmit={handleReset} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="reset-email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Email Address
          </label>
          <input
            id="reset-email"
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
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p
        className="mt-8 text-center text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: "var(--color-primary)" }}
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
