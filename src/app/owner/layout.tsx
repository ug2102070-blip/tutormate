"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/navigation/Header";
import { MobileNav } from "@/components/navigation/MobileNav";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user || !role) {
        router.push("/login");
      } else if (role === "student") {
        router.push("/student/dashboard");
      } else if (role === "parent") {
        router.push("/parent/dashboard");
      } else if (role === "tutor") {
        // Regular tutors cannot access owner portal
        router.push("/tutor/dashboard");
      }
      // Only "owner" and "admin" pass through
    }
  }, [loading, user, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "rgb(245,158,11)", borderTopColor: "transparent" }}
          />
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Loading Center Portal...
          </span>
        </div>
      </div>
    );
  }

  if (!user || (role !== "owner" && role !== "admin")) {
    return null;
  }

  return (
    <div className="flex min-h-screen relative" style={{ background: "var(--color-bg-secondary)" }}>
      <Sidebar role="owner" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-[calc(4.5rem+max(env(safe-area-inset-bottom),8px))] md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav role="owner" />
    </div>
  );
}
