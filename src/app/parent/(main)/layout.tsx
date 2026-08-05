"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/navigation/Header";
import { MobileNav } from "@/components/navigation/MobileNav";
import { FeedbackWidget } from "@/components/FeedbackWidget";

export default function ParentMainLayout({
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
      } else if (role !== "parent") {
        // Redirect tutors, admins, owners, students away from parent portal
        if (role === "tutor" || role === "admin" || role === "owner") {
          router.push("/tutor/dashboard");
        } else if (role === "student") {
          router.push("/student/dashboard");
        } else {
          router.push("/login");
        }
      }
    }
  }, [loading, user, role, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Loading Parent Portal...
          </span>
        </div>
      </div>
    );
  }

  if (!user || role !== "parent") {
    return null;
  }

  return (
    <div className="flex min-h-screen relative" style={{ background: "var(--color-bg-secondary)" }}>
      <Sidebar role="parent" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto pb-[calc(4.5rem+max(env(safe-area-inset-bottom),8px))] md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav role="parent" />
      {user && <FeedbackWidget userId={user.id} userRole="parent" />}
    </div>
  );
}

