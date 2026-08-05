"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

// ─── SVG Illustrations ───────────────────────────────────────────────────────

const illustrations = {
  batches: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="10" y="30" width="60" height="36" rx="8" fill="currentColor" opacity="0.12" />
      <rect x="16" y="22" width="48" height="36" rx="8" fill="currentColor" opacity="0.18" />
      <rect x="22" y="14" width="36" height="36" rx="8" fill="currentColor" opacity="0.28" />
      <circle cx="40" cy="32" r="8" fill="currentColor" opacity="0.5" />
      <path d="M37 32l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  students: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="30" cy="28" r="10" fill="currentColor" opacity="0.25" />
      <circle cx="50" cy="28" r="10" fill="currentColor" opacity="0.35" />
      <path d="M10 58c0-10 9-18 20-18s20 8 20 18" fill="currentColor" opacity="0.18" />
      <path d="M30 58c0-10 9-18 20-18s20 8 20 18" fill="currentColor" opacity="0.28" />
      <circle cx="40" cy="26" r="6" fill="currentColor" opacity="0.6" />
      <path d="M22 55c0-8 8-14 18-14s18 6 18 14" fill="currentColor" opacity="0.45" />
    </svg>
  ),
  assignments: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="15" y="12" width="42" height="52" rx="6" fill="currentColor" opacity="0.12" />
      <rect x="15" y="12" width="42" height="52" rx="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M25 28h20M25 36h20M25 44h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <circle cx="57" cy="57" r="12" fill="currentColor" opacity="0.9" />
      <path d="M53 57l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  exams: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M40 8l6 18h19l-15 11 6 18-16-12-16 12 6-18L15 26h19z" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M40 14l4 13h14l-11 8 4 13-11-8-11 8 4-13-11-8h14z" fill="currentColor" opacity="0.55" />
    </svg>
  ),
  fees: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="10" y="24" width="60" height="38" rx="10" fill="currentColor" opacity="0.15" />
      <rect x="10" y="24" width="60" height="38" rx="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <rect x="10" y="34" width="60" height="8" fill="currentColor" opacity="0.2" />
      <circle cx="25" cy="48" r="4" fill="currentColor" opacity="0.5" />
      <rect x="34" y="46" width="20" height="4" rx="2" fill="currentColor" opacity="0.3" />
      <path d="M40 10v8M37 12l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  ),
  materials: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M14 20h22v44H14z" fill="currentColor" opacity="0.12" rx="4" />
      <path d="M14 20h22v44H14z" stroke="currentColor" strokeWidth="1.5" opacity="0.25" />
      <path d="M44 12h22v52H44z" fill="currentColor" opacity="0.2" rx="4" />
      <path d="M44 12h22v52H44z" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
      <path d="M20 30h10M20 37h10M20 44h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M50 24h10M50 32h10M50 40h10M50 48h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  ),
  doubts: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M12 16h42a6 6 0 016 6v24a6 6 0 01-6 6H30l-10 10V52H18a6 6 0 01-6-6V22a6 6 0 016-6z" fill="currentColor" opacity="0.18" />
      <path d="M12 16h42a6 6 0 016 6v24a6 6 0 01-6 6H30l-10 10V52H18a6 6 0 01-6-6V22a6 6 0 016-6z" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <circle cx="33" cy="30" r="7" fill="currentColor" opacity="0.5" />
      <text x="30" y="34" fill="white" fontSize="10" fontWeight="bold">?</text>
    </svg>
  ),
  notices: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M20 20h40a4 4 0 014 4v32a4 4 0 01-4 4H20a4 4 0 01-4-4V24a4 4 0 014-4z" fill="currentColor" opacity="0.12" />
      <path d="M20 20h40a4 4 0 014 4v32a4 4 0 01-4 4H20a4 4 0 01-4-4V24a4 4 0 014-4z" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <circle cx="28" cy="35" r="3" fill="currentColor" opacity="0.5" />
      <rect x="36" y="33" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      <circle cx="28" cy="46" r="3" fill="currentColor" opacity="0.3" />
      <rect x="36" y="44" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
      <path d="M58 15l4 8-4-2-4 2 4-8z" fill="currentColor" opacity="0.6" />
      <path d="M56 23l2-2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M10 18h38a6 6 0 016 6v18a6 6 0 01-6 6H28l-8 8V48H16a6 6 0 01-6-6V24a6 6 0 016-6z" fill="currentColor" opacity="0.2" />
      <path d="M32 30h28a4 4 0 014 4v14a4 4 0 01-4 4H44l6 8V52h-10a4 4 0 01-4-4V34a4 4 0 014-4z" fill="currentColor" opacity="0.35" />
      <rect x="18" y="28" width="16" height="2.5" rx="1.25" fill="white" opacity="0.7" />
      <rect x="18" y="33" width="10" height="2.5" rx="1.25" fill="white" opacity="0.5" />
    </svg>
  ),
  videos: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="8" y="20" width="46" height="32" rx="8" fill="currentColor" opacity="0.18" />
      <rect x="8" y="20" width="46" height="32" rx="8" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M54 30l16-8v28l-16-8V30z" fill="currentColor" opacity="0.35" />
      <circle cx="31" cy="36" r="8" fill="currentColor" opacity="0.4" />
      <path d="M28 33l8 3-8 3V33z" fill="white" opacity="0.9" />
    </svg>
  ),
  attendance: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="12" y="18" width="56" height="52" rx="8" fill="currentColor" opacity="0.12" />
      <rect x="12" y="18" width="56" height="52" rx="8" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <rect x="12" y="28" width="56" height="10" fill="currentColor" opacity="0.15" />
      <path d="M28 12v12M52 12v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <circle cx="30" cy="50" r="5" fill="currentColor" opacity="0.2" />
      <path d="M27.5 50l2 2 3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.15" />
      <circle cx="40" cy="60" r="5" fill="currentColor" opacity="0.1" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M40 10c-14 0-22 10-22 22v10l-6 8h56l-6-8V32c0-12-8-22-22-22z" fill="currentColor" opacity="0.18" />
      <path d="M40 10c-14 0-22 10-22 22v10l-6 8h56l-6-8V32c0-12-8-22-22-22z" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <path d="M34 62a6 6 0 0012 0" fill="currentColor" opacity="0.4" />
      <circle cx="57" cy="22" r="8" fill="currentColor" opacity="0.6" />
      <path d="M54 22l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="40" cy="40" r="28" fill="currentColor" opacity="0.1" />
      <path d="M40 20v4M40 56v4M20 40h-4M64 40h-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
      <circle cx="40" cy="40" r="12" fill="currentColor" opacity="0.25" />
      <path d="M36 36l8 8M44 36l-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  ),
} as const;

export type EmptyStateVariant = keyof typeof illustrations;

const variantColors: Record<EmptyStateVariant, { color: string; bg: string; glow: string }> = {
  batches:       { color: "#6366f1", bg: "rgba(99,102,241,0.08)",   glow: "rgba(99,102,241,0.15)" },
  students:      { color: "#10b981", bg: "rgba(16,185,129,0.08)",   glow: "rgba(16,185,129,0.15)" },
  assignments:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",   glow: "rgba(245,158,11,0.15)" },
  exams:         { color: "#8b5cf6", bg: "rgba(139,92,246,0.08)",   glow: "rgba(139,92,246,0.15)" },
  fees:          { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",   glow: "rgba(59,130,246,0.15)" },
  materials:     { color: "#14b8a6", bg: "rgba(20,184,166,0.08)",   glow: "rgba(20,184,166,0.15)" },
  doubts:        { color: "#f97316", bg: "rgba(249,115,22,0.08)",   glow: "rgba(249,115,22,0.15)" },
  notices:       { color: "#ef4444", bg: "rgba(239,68,68,0.08)",    glow: "rgba(239,68,68,0.15)"  },
  chat:          { color: "#6366f1", bg: "rgba(99,102,241,0.08)",   glow: "rgba(99,102,241,0.15)" },
  videos:        { color: "#7c3aed", bg: "rgba(124,58,237,0.08)",   glow: "rgba(124,58,237,0.15)" },
  attendance:    { color: "#22c55e", bg: "rgba(34,197,94,0.08)",    glow: "rgba(34,197,94,0.15)"  },
  notifications: { color: "#64748b", bg: "rgba(100,116,139,0.08)",  glow: "rgba(100,116,139,0.12)" },
  generic:       { color: "#94a3b8", bg: "rgba(148,163,184,0.08)",  glow: "rgba(148,163,184,0.12)" },
};

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: typeof Plus;
}

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** "sm" = compact (inside panels), "md" = default, "lg" = full-page */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function EmptyState({
  variant = "generic",
  title,
  description,
  action,
  size = "md",
  className = "",
}: EmptyStateProps) {
  const c = variantColors[variant];
  const illustration = illustrations[variant];

  const iconSizes = { sm: "w-12 h-12", md: "w-20 h-20", lg: "w-24 h-24" };
  const paddingMap = { sm: "py-8 px-4", md: "py-12 px-6", lg: "py-16 px-8" };
  const titleSize = { sm: "text-sm", md: "text-base", lg: "text-lg" };
  const descSize  = { sm: "text-xs",  md: "text-sm",   lg: "text-sm"  };

  const ActionIcon = action?.icon ?? Plus;

  return (
    <div
      className={`relative flex flex-col items-center text-center overflow-hidden rounded-2xl ${paddingMap[size]} ${className}`}
      style={{
        background: "var(--color-surface)",
        border: "1.5px dashed var(--color-border)",
      }}
    >
      {/* Subtle radial glow blob */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 30%, ${c.glow}, transparent 70%)`,
        }}
      />

      {/* Illustration box */}
      <div
        className={`relative z-10 ${iconSizes[size]} rounded-2xl flex items-center justify-center mb-4 shrink-0`}
        style={{ background: c.bg, color: c.color }}
      >
        {illustration}
      </div>

      {/* Text */}
      <h3
        className={`relative z-10 font-bold ${titleSize[size]}`}
        style={{ color: "var(--color-text)" }}
      >
        {title}
      </h3>
      {description && (
        <p
          className={`relative z-10 mt-1.5 max-w-xs leading-relaxed ${descSize[size]}`}
          style={{ color: "var(--color-text-muted)" }}
        >
          {description}
        </p>
      )}

      {/* CTA */}
      {action && (
        <div className="relative z-10 mt-5">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ background: c.color, color: "#fff" }}
            >
              <ActionIcon className="w-3.5 h-3.5" />
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ background: c.color, color: "#fff" }}
            >
              <ActionIcon className="w-3.5 h-3.5" />
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
