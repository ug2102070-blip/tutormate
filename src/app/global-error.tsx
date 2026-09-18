"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

/**
 * Global root error boundary.
 * Next.js App Router renders this whenever an error is thrown in any route
 * that does NOT have its own segment-level error.tsx.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
          <div
            className="max-w-md w-full rounded-2xl border p-8 text-center space-y-5 shadow-xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
          >
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-lg font-extrabold text-gray-900 dark:text-white">
                Something went wrong
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                An unexpected error occurred. Your data is safe — please try again or return home.
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
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all hover:bg-slate-50 dark:hover:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
