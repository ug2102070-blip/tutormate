import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, Users, CalendarCheck, CreditCard, HelpCircle,
  BookOpen, FileText, Award, Sparkles, Bell, ShieldCheck,
  Building2, Video, Star, CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "TutorMate — Smart Tutoring Management Platform",
  description: "Manage students, batches, attendance, fees, assignments and more. The all-in-one platform for private tutors and coaching centers worldwide.",
};

const FEATURES = [
  { icon: Users, title: "Batch Management", desc: "Organize students into batches with custom schedules and monthly fees.", color: "#6366f1" },
  { icon: CalendarCheck, title: "Attendance Tracking", desc: "1-click daily attendance with QR scan support for large classes.", color: "#22c55e" },
  { icon: CreditCard, title: "Fee Collection", desc: "Monthly fee ledger with bKash/Nagad integration. Automatic reminders.", color: "#f59e0b" },
  { icon: HelpCircle, title: "Doubt Chat", desc: "Real-time doubt resolution with image attachment support.", color: "#ec4899" },
  { icon: BookOpen, title: "Study Materials", desc: "Upload PDFs, videos, slides. Students access on any device.", color: "#14b8a6" },
  { icon: FileText, title: "Assignments", desc: "Create, publish and grade assignments. Students submit online.", color: "#8b5cf6" },
  { icon: Award, title: "Exam & Results", desc: "Mark exams, auto-compute grades and class rankings.", color: "#ef4444" },
  { icon: Sparkles, title: "AI Tutor Assistant", desc: "Generate question sets, lesson plans, parent messages with Gemini AI.", color: "#f97316" },
  { icon: Bell, title: "Notifications", desc: "Real-time alerts for exams, assignments, fees and more.", color: "#06b6d4" },
  { icon: Building2, title: "Coaching Center Mode", desc: "Multi-tutor support with owner dashboard and aggregated analytics.", color: "#a855f7" },
  { icon: Video, title: "Recorded Classes", desc: "Upload and stream class recordings. Students watch anytime.", color: "#64748b" },
  { icon: ShieldCheck, title: "Parent Portal", desc: "Read-only parent view for attendance, fees and exam results.", color: "#16a34a" },
];

const TESTIMONIALS = [
  { name: "Karim Sir", role: "HSC Physics Tutor, Dhaka", rating: 5, text: "TutorMate has completely changed how I manage my 3 batches. Fee collection alone saves me 4 hours a week!" },
  { name: "Nasrin Apa", role: "Coaching Center Owner, Chittagong", rating: 5, text: "The coaching center mode is perfect for our 5-tutor setup. I can see all their attendance and income from one dashboard." },
  { name: "Rafiq Bhai", role: "Math Tutor, Sylhet", rating: 5, text: "The AI assignment generator is incredible. What used to take 2 hours now takes 5 minutes." },
];

export default function PublicHomePage() {
  return (
    <div className="space-y-0 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative py-14 sm:py-24 px-4 sm:px-6 lg:px-16 text-center max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Deep animated background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full opacity-[0.15] sm:opacity-20 pointer-events-none blur-[100px] sm:blur-[120px] transition-all duration-1000"
          style={{ background: "radial-gradient(circle, var(--color-primary) 0%, #a855f7 40%, #06b6d4 100%)" }}
        />

        <div className="relative z-10 space-y-6">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-transform hover:scale-105"
            style={{
              background: "var(--color-primary-50)",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary-100)",
            }}
          >
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
            <span>Built for Tutors & Coaching Centers Worldwide</span>
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] sm:leading-[1.1]"
            style={{ color: "var(--color-text)" }}
          >
            Manage Your Batches & Fees{" "}
            <span
              className="bg-clip-text text-transparent block sm:inline mt-1 sm:mt-0"
              style={{
                backgroundImage: "linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 50%, #06b6d4 100%)",
              }}
            >
              Without the Stress
            </span>
          </h1>

          <p
            className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            TutorMate is the all-in-one platform for private tutors and small coaching centers. Track attendance, collect monthly fees, and answer student questions effortlessly.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto pt-2">
            <Link
              href="/register"
              className="group relative w-full sm:w-auto px-8 py-3.5 text-sm sm:text-base font-bold text-white rounded-xl shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] transition-all hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.7)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)",
              }}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl" />
              <span className="relative z-10 flex items-center gap-2">Start Free 30-Day Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
            </Link>

            <Link
              href="/pricing"
              className="w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-semibold rounded-xl border transition-all hover:bg-[var(--color-bg-secondary)] flex items-center justify-center"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
                background: "var(--color-surface)",
              }}
            >
              View Pricing
            </Link>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs font-medium pt-1" style={{ color: "var(--color-text-muted)" }}>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> No credit card required
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 1-min setup
            </span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-16" style={{ background: "var(--color-bg-secondary)" }}>
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
              Everything you need, nothing you don&apos;t
            </h2>
            <p style={{ color: "var(--color-text-secondary)" }} className="text-sm max-w-xl mx-auto">
              12+ powerful features designed specifically for the tutoring industry
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative p-6 rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300" style={{ background: f.color }} />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3.5 shadow-sm"
                    style={{ background: `${f.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-bold text-base mb-1.5" style={{ color: "var(--color-text)" }}>
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-16">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
              Loved by tutors worldwide
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              See how TutorMate transforms batch management for teachers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl p-6 space-y-4 border shadow-sm flex flex-col justify-between"
                style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed italic" style={{ color: "var(--color-text)" }}>
                    &quot;{t.text}&quot;
                  </p>
                </div>
                <div className="pt-2 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{t.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section
        className="py-14 sm:py-20 px-4 sm:px-6 lg:px-16 text-center border-t border-b"
        style={{
          background: "var(--color-primary-50)",
          borderColor: "var(--color-primary-100)",
        }}
      >
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Start managing smarter today
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: "var(--color-text-secondary)" }}>
            Join hundreds of tutors who have simplified their teaching business with TutorMate.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm sm:text-base font-bold text-white rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:opacity-95 hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))" }}
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
