import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "TutorMate — Smart Tutoring Management Platform", template: "%s | TutorMate" },
  description: "TutorMate is the all-in-one platform for private tutors and coaching centers in Bangladesh. Manage students, batches, fees, attendance, and more.",
  keywords: ["tutor management", "Bangladesh tutor", "coaching center", "student management", "fee collection"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tutormate.app",
    siteName: "TutorMate",
  },
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Navigation */}
      <header
        className="h-16 sticky top-0 z-50 px-6 lg:px-16 flex items-center justify-between backdrop-blur-xl"
        style={{ background: "var(--color-header-bg)", borderBottom: "1px solid var(--color-header-border)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight" style={{ color: "var(--color-primary)" }}>TutorMate</span>
          <span
            className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-primary-50)", color: "var(--color-primary)", border: "1px solid var(--color-primary-100)" }}
          >BD</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(l => (
            <Link key={l.href} href={l.href} className="text-sm font-medium transition-colors hover:opacity-70" style={{ color: "var(--color-text-secondary)" }}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/login" className="px-4 py-2 text-sm font-semibold rounded-xl transition-all hover:bg-[var(--color-bg-secondary)]" style={{ color: "var(--color-text-secondary)" }}>
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)" }}
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }} className="py-10 px-6 lg:px-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-base font-black" style={{ color: "var(--color-primary)" }}>TutorMate</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Smart tutoring management for Bangladesh.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Product</p>
            {["/pricing", "/about"].map(h => (
              <Link key={h} href={h} className="block text-xs py-1 transition-colors hover:opacity-70" style={{ color: "var(--color-text-secondary)" }}>
                {h.replace("/", "").charAt(0).toUpperCase() + h.slice(2)}
              </Link>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Company</p>
            {["/contact"].map(h => (
              <Link key={h} href={h} className="block text-xs py-1 transition-colors hover:opacity-70" style={{ color: "var(--color-text-secondary)" }}>
                Contact
              </Link>
            ))}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-muted)" }}>Account</p>
            <Link href="/login" className="block text-xs py-1 transition-colors hover:opacity-70" style={{ color: "var(--color-text-secondary)" }}>Sign In</Link>
            <Link href="/register" className="block text-xs py-1 transition-colors hover:opacity-70" style={{ color: "var(--color-text-secondary)" }}>Register</Link>
          </div>
        </div>
        <div className="max-w-5xl mx-auto mt-8 pt-8 flex items-center justify-between" style={{ borderTop: "1px solid var(--color-border)" }}>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            &copy; {new Date().getFullYear()} TutorMate. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Made in Bangladesh 🇧🇩</p>
        </div>
      </footer>
    </div>
  );
}
