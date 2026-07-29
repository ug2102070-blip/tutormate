"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 px-4 sm:px-8 lg:px-16 h-16 flex items-center justify-between backdrop-blur-xl transition-all"
      style={{
        background: "var(--color-header-bg)",
        borderBottom: "1px solid var(--color-header-border)",
      }}
    >
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-indigo-500 flex items-center justify-center text-white font-extrabold text-base shadow-sm group-hover:scale-105 transition-transform">
          T
        </div>
        <span className="text-xl font-black tracking-tight" style={{ color: "var(--color-text)" }}>
          Tutor<span style={{ color: "var(--color-primary)" }}>Mate</span>
        </span>
        <span
          className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full tracking-wider"
          style={{
            background: "var(--color-primary-50)",
            color: "var(--color-primary)",
            border: "1px solid var(--color-primary-100)",
          }}
        >
          BD
        </span>
      </Link>

      {/* Desktop Navigation Links */}
      <nav className="hidden md:flex items-center gap-7">
        {NAV_LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-medium transition-colors hover:text-[var(--color-primary)]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Desktop Right Action Buttons */}
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-semibold rounded-xl transition-all hover:bg-[var(--color-bg-secondary)]"
          style={{ color: "var(--color-text)" }}
        >
          Sign In
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition-all hover:opacity-90 hover:shadow-indigo-500/20 active:scale-95"
          style={{
            background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
          }}
        >
          Get Started
        </Link>
      </div>

      {/* Mobile Hamburger Toggle Button */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 rounded-xl transition-colors hover:bg-[var(--color-bg-secondary)] focus:outline-none"
        aria-label="Toggle navigation menu"
        style={{ color: "var(--color-text)" }}
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div
          className="absolute top-16 left-0 w-full border-b shadow-2xl p-5 flex flex-col gap-4 md:hidden animate-in slide-in-from-top-2 duration-200"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-[var(--color-bg-secondary)]"
                style={{ color: "var(--color-text)" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div
            className="pt-3 border-t flex flex-col gap-2.5"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold rounded-xl border transition-all"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-text)",
              }}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)",
              }}
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
