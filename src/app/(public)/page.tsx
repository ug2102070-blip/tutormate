import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight, Users, CalendarCheck, CreditCard, HelpCircle,
  BookOpen, FileText, Award, Sparkles, Bell, ShieldCheck,
  Building2, Video, Star,
} from "lucide-react";

export const metadata: Metadata = {
  title: "TutorMate — Smart Tutoring Management Platform for Bangladesh",
  description: "Manage students, batches, attendance, fees, assignments and more. The all-in-one platform for private tutors and coaching centers in Bangladesh.",
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
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="py-20 px-6 lg:px-16 text-center max-w-4xl mx-auto space-y-7">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "var(--color-primary-50)", color: "var(--color-primary)", border: "1px solid var(--color-primary-100)" }}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Trusted by 500+ tutors across Bangladesh
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]" style={{ color: "var(--color-text)" }}>
          The Smart Way to{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent, #a855f7) 100%)" }}
          >
            Run Your Classes
          </span>
        </h1>

        <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          TutorMate handles attendance, fees, assignments, exams, and parent communication — so you can focus on teaching.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-bold text-white rounded-xl shadow-lg transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)" }}
          >
            Start Free 30-Day Trial <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold rounded-xl border transition-all hover:bg-[var(--color-bg-secondary)]"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            View Pricing
          </Link>
        </div>

        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          No credit card required. Cancel anytime.
        </p>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 lg:px-16" style={{ background: "var(--color-bg-secondary)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--color-text)" }}>
              Everything you need, nothing you don&apos;t
            </h2>
            <p style={{ color: "var(--color-text-secondary)" }} className="text-sm">
              12+ features designed for Bangladesh&apos;s tutoring industry
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-5 rounded-2xl transition-all hover:scale-[1.01] duration-200"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${f.color}18` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-bold text-sm mb-1" style={{ color: "var(--color-text)" }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6 lg:px-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-10" style={{ color: "var(--color-text)" }}>
            Loved by tutors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-2xl p-5 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>&quot;{t.text}&quot;</p>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>{t.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section
        className="py-16 px-6 lg:px-16 text-center"
        style={{ background: "var(--color-primary-50)", borderTop: "1px solid var(--color-primary-100)", borderBottom: "1px solid var(--color-primary-100)" }}
      >
        <div className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--color-text)" }}>
            Start managing smarter today
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Join hundreds of tutors who have simplified their teaching business with TutorMate.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))" }}
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
