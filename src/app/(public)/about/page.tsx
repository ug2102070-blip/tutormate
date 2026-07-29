import type { Metadata } from "next";
import Link from "next/link";
import { Users, Target, Heart, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "About — TutorMate",
  description: "Learn about TutorMate, the platform built to empower private tutors and coaching centers worldwide.",
};

const VALUES = [
  { icon: Target, title: "Built for Everyone", desc: "Designed with tutors and coaching centers in mind — comprehensive payment integrations, multi-language support, and flexible workflows." },
  { icon: Users, title: "Tutor-First Design", desc: "Every feature is built around making the tutor's job easier — not the other way around." },
  { icon: Heart, title: "Affordable Access", desc: "Premium software should not be a luxury. Our pricing is designed for teachers, not enterprises." },
  { icon: Globe, title: "Always Improving", desc: "We ship new features every week based on direct feedback from our tutor community." },
];

const STATS = [
  { value: "500+", label: "Active Tutors" },
  { value: "12,000+", label: "Students Managed" },
  { value: "৳2M+", label: "Fees Collected" },
  { value: "99.9%", label: "Uptime" },
];

export default function AboutPage() {
  return (
    <div className="py-16 px-6 lg:px-16 max-w-5xl mx-auto space-y-20">
      {/* Hero */}
      <section className="text-center space-y-5">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: "var(--color-primary-50)", color: "var(--color-primary)", border: "1px solid var(--color-primary-100)" }}
        >
          🌍 Built for Global Tutors
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
          Empowering Tutors Worldwide
        </h1>
        <p className="text-base max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          TutorMate was born out of frustration. Our founders were private tutors who spent hours every week
          chasing fees, tracking attendance on paper, and answering repeated student questions.
          We built the solution we always wished we had.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div
            key={s.label}
            className="rounded-2xl p-5 text-center"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <div className="text-3xl font-extrabold" style={{ color: "var(--color-primary)" }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Values */}
      <section>
        <h2 className="text-2xl font-extrabold text-center mb-10" style={{ color: "var(--color-text)" }}>Our Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {VALUES.map(v => {
            const Icon = v.icon;
            return (
              <div
                key={v.title}
                className="rounded-2xl p-6 space-y-3"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--color-primary-50)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
                </div>
                <h3 className="font-bold text-sm" style={{ color: "var(--color-text)" }}>{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-10 rounded-2xl space-y-5" style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-primary-100)" }}>
        <h2 className="text-2xl font-extrabold" style={{ color: "var(--color-text)" }}>Ready to join 500+ tutors?</h2>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-8 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))" }}
        >
          Start Free Trial
        </Link>
      </section>
    </div>
  );
}
