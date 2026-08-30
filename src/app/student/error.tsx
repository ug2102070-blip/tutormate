"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[StudentError boundary]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div
        className="max-w-md w-full rounded-2xl border p-8 text-center space-y-5 shadow-xl"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
            Something went wrong
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            An unexpected error occurred. Your data is safe — this page failed to load.
          </p>
          {process.env.NODE_ENV === "development" && error?.message && (
            <p className="text-xs font-mono bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-left mt-3 break-all border border-rose-200 dark:border-rose-900/40">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/student/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
