import Link from "next/link";
import type { Metadata } from "next";
import { PublicHeader } from "./PublicHeader";

export const metadata: Metadata = {
  title: { default: "TutorMate — Smart Tutoring Management Platform", template: "%s | TutorMate" },
  description: "TutorMate is the all-in-one platform for private tutors and coaching centers worldwide. Manage students, batches, fees, attendance, and more.",
  keywords: ["tutor management", "global tutor", "coaching center", "student management", "fee collection"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tutormate.app",
    siteName: "TutorMate",
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Navigation Header */}
      <PublicHeader />

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }} className="py-10 px-6 lg:px-16">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-base font-black" style={{ color: "var(--color-primary)" }}>TutorMate</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Smart tutoring management for modern educators.
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
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Made for Tutors 🌍</p>
        </div>
      </footer>
    </div>
  );
}
