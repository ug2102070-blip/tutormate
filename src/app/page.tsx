import Link from "next/link";
import { ArrowRight, BookOpen, Users, CheckCircle, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Header / Navbar */}
      <header className="h-16 border-b px-6 lg:px-12 flex items-center justify-between border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-[var(--color-primary)]">
            TutorMate
          </span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary)]">
            SaaS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all duration-200 hover:opacity-90 shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
            }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 text-center max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-primary-50)] text-[var(--color-primary)] border border-[var(--color-primary-100)]">
          <ShieldCheck className="w-3.5 h-3.5" /> Built for Tutors & Coaching Centers in Bangladesh
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--color-text)] leading-tight">
          Manage Your Batches & Fees{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)",
            }}
          >
            Without the Stress
          </span>
        </h1>

        <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl leading-relaxed">
          TutorMate is the all-in-one platform for private tutors and small coaching centers.
          Track attendance, collect monthly fees, and answer student questions effortlessly.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-white rounded-xl shadow-lg transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
            }}
          >
            Start Free 30-Day Trial <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-[var(--color-text)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg-secondary)] transition-all duration-200"
          >
            Sign In to Account
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left w-full">
          <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <Users className="w-6 h-6 text-[var(--color-primary)] mb-3" />
            <h3 className="font-semibold text-sm text-[var(--color-text)]">Batch Management</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Organize students into batches with custom schedules and monthly fees.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <CheckCircle className="w-6 h-6 text-[var(--color-success)] mb-3" />
            <h3 className="font-semibold text-sm text-[var(--color-text)]">Attendance & Fees</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Log daily attendance with 1-click and maintain a transparent fee collection ledger.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <BookOpen className="w-6 h-6 text-[var(--color-accent)] mb-3" />
            <h3 className="font-semibold text-sm text-[var(--color-text)]">Ask Your Teacher</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Direct student doubt resolution thread with image attachment support.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
        &copy; {new Date().getFullYear()} TutorMate SaaS. All rights reserved.
      </footer>
    </div>
  );
}
