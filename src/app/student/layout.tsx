"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/navigation/Header";
import { MobileNav } from "@/components/navigation/MobileNav";
import { FeedbackWidget } from "@/components/FeedbackWidget";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (role === "tutor") {
        router.push("/tutor/dashboard");
      }
    }
  }, [loading, user, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            Loading Student Portal...
          </span>
        </div>
      </div>
    );
  }

  if (!user || role === "tutor") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-secondary)] relative">
      <Sidebar role="student" />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">{children}</main>
      </div>
      <MobileNav role="student" />
      {user && <FeedbackWidget userId={user.id} userRole="student" />}
    </div>
  );
}
