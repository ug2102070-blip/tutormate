"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getLinkedStudent } from "@/actions/parentActions";
import {
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  Award,
  FileText,
  LogOut,
  Users,
  ChevronRight,
  Loader2,
  Bell,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/notifications", label: "Notifications", icon: Bell },
  { href: "/parent/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/parent/fees", label: "Fees", icon: CreditCard },
  { href: "/parent/results", label: "Results", icon: Award },
  { href: "/parent/assignments", label: "Assignments", icon: FileText },
  { href: "/parent/settings", label: "Settings", icon: Settings },
];

export default function ParentMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [childName, setChildName] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/parent/login"); return; }

      // Check parent_links
      const { data: link } = await supabase
        .from("parent_links")
        .select("id")
        .eq("parent_uid", user.id)
        .limit(1)
        .single();

      if (!link) { router.push("/parent/login"); return; }

      try {
        const student = await getLinkedStudent(user.id);
        setChildName(student.fullName);
      } catch {
        setChildName("Child");
      }
      setChecking(false);
    }
    check();
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Signout error:", err);
    }
    window.location.href = "/parent/login";
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-primary)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
            Loading Parent Portal...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg-secondary)" }}>
      {/* Top Header */}
      <header
        className="h-14 px-4 md:px-6 flex items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-xl"
        style={{
          background: "var(--color-header-bg)",
          borderBottom: "1px solid var(--color-header-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <Link href="/parent/dashboard" className="text-base font-black tracking-tight"
            style={{ color: "var(--color-primary)" }}>
            TutorMate
          </Link>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border"
            style={{
              background: "var(--color-primary-50)",
              color: "var(--color-primary)",
              borderColor: "var(--color-primary-100)",
            }}>
            Parent
          </span>
        </div>

        {/* Child info + logout */}
        <div className="flex items-center gap-3">
          {childName && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
              <Users className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
              <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                {childName}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={{ color: "var(--color-error, #ef4444)" }}
            id="parent-logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <aside
          className="hidden md:flex w-56 flex-col p-4 gap-1 shrink-0"
          style={{
            background: "var(--color-sidebar-bg)",
            borderRight: "1px solid var(--color-sidebar-border)",
          }}
        >
          {/* Child Info */}
          <div
            className="p-3 rounded-xl mb-4"
            style={{ background: "var(--color-primary-50)", border: "1px solid var(--color-primary-100)" }}
          >
            <p className="text-[10px] uppercase font-bold tracking-wider mb-1"
              style={{ color: "var(--color-primary)" }}>
              Monitoring
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
              {childName}
            </p>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all"
                style={{
                  background: isActive ? "var(--color-primary-50)" : "transparent",
                  color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                }}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-muted)" }}
                />
                {item.label}
              </Link>
            );
          })}

          <div className="mt-auto pt-4">
            <div
              className="p-3 rounded-xl text-xs font-medium"
              style={{
                background: "var(--color-bg-secondary)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
              }}
            >
              TutorMate BD v1.0.0
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto"
          style={{ paddingBottom: "calc(4.5rem + max(env(safe-area-inset-bottom), 8px))" }}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-xl"
        style={{
          background: "var(--color-nav-bg)",
          borderTop: "1px solid var(--color-nav-border)",
          boxShadow: "var(--shadow-nav)",
        }}
      >
        <div className="flex items-center justify-around px-2 pt-2 pb-safe">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 gap-0.5 py-1 transition-all active:scale-90"
              >
                <div
                  className="flex items-center justify-center w-10 h-7 rounded-2xl transition-all"
                  style={{ backgroundColor: isActive ? "var(--color-nav-active-bg)" : "transparent" }}
                >
                  <Icon
                    className="w-5 h-5 transition-all"
                    style={{
                      color: isActive ? "var(--color-nav-active)" : "var(--color-nav-inactive)",
                      strokeWidth: isActive ? 2.5 : 1.8,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-semibold"
                  style={{
                    color: isActive ? "var(--color-nav-active)" : "var(--color-nav-inactive)",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
