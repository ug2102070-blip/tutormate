"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/navigation/Header";

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            Loading TutorMate...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-secondary)]">
      <Sidebar role="tutor" />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
