"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  HelpCircle,
  Video,
  Building2,
  Bell,
  BookOpen,
} from "lucide-react";

interface MobileNavProps {
  role: "tutor" | "student" | "owner" | "parent";
}

const navItemsByRole: Record<string, { href: string; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[]> = {
  tutor: [
    { href: "/tutor/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/tutor/batches", label: "Batches", icon: Users },
    { href: "/tutor/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/tutor/fees", label: "Fees", icon: CreditCard },
    { href: "/tutor/doubts", label: "Doubts", icon: HelpCircle },
  ],
  student: [
    { href: "/student/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/student/recorded-classes", label: "Classes", icon: Video },
    { href: "/student/fees", label: "Fees", icon: CreditCard },
    { href: "/student/doubts", label: "Doubts", icon: HelpCircle },
  ],
  owner: [
    { href: "/owner/dashboard", label: "Center", icon: Building2 },
    { href: "/owner/tutors", label: "Tutors", icon: Users },
    { href: "/owner/batches", label: "Batches", icon: BookOpen },
    { href: "/owner/fees", label: "Fees", icon: CreditCard },
    { href: "/tutor/dashboard", label: "Teach", icon: LayoutDashboard },
  ],
  parent: [
    { href: "/parent/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/parent/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/parent/fees", label: "Fees", icon: CreditCard },
    { href: "/parent/notifications", label: "Alerts", icon: Bell },
  ],
};

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const items = navItemsByRole[role] ?? navItemsByRole.tutor;

  return (
    <nav
      style={{
        background: "var(--color-nav-bg)",
        borderTop: "1px solid var(--color-nav-border)",
        boxShadow: "var(--shadow-nav)",
      }}
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden backdrop-blur-xl"
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-safe">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 py-1 transition-all duration-200 active:scale-90"
            >
              {/* Icon Container */}
              <div
                className="relative flex items-center justify-center w-10 h-7 rounded-2xl transition-all duration-200"
                style={{
                  backgroundColor: isActive
                    ? "var(--color-nav-active-bg)"
                    : "transparent",
                }}
              >
                <Icon
                  className="w-5 h-5 transition-all duration-200"
                  style={{
                    color: isActive
                      ? "var(--color-nav-active)"
                      : "var(--color-nav-inactive)",
                    strokeWidth: isActive ? 2.5 : 1.8,
                    transform: isActive ? "scale(1.05)" : "scale(1)",
                  }}
                />
              </div>

              {/* Label */}
              <span
                className="text-[10px] font-semibold tracking-tight transition-all duration-200"
                style={{
                  color: isActive
                    ? "var(--color-nav-active)"
                    : "var(--color-nav-inactive)",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {item.label}
              </span>

              {/* Active Dot Indicator */}
              {isActive && (
                <div
                  className="absolute bottom-0 w-1 h-1 rounded-full"
                  style={{ backgroundColor: "var(--color-nav-active)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
