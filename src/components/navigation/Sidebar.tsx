"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  HelpCircle,
  Settings,
} from "lucide-react";

interface SidebarProps {
  role: "tutor" | "student";
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const tutorNavItems = [
    { href: "/tutor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tutor/batches", label: "Batches", icon: Users },
    { href: "/tutor/students", label: "Students", icon: GraduationCap },
    { href: "/tutor/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/tutor/fees", label: "Fee Ledger", icon: CreditCard },
    { href: "/tutor/doubts", label: "Ask Your Teacher", icon: HelpCircle },
    { href: "/tutor/settings", label: "Settings", icon: Settings },
  ];

  const studentNavItems = [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/attendance", label: "My Attendance", icon: CalendarCheck },
    { href: "/student/fees", label: "Payment History", icon: CreditCard },
    { href: "/student/doubts", label: "Ask Doubts", icon: HelpCircle },
  ];

  const items = role === "tutor" ? tutorNavItems : studentNavItems;

  return (
    <aside
      className="hidden md:flex w-64 flex-col justify-between border-r p-4 shrink-0 transition-colors duration-200"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="space-y-6">
        {/* Brand */}
        <div className="px-3 py-2">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: "var(--color-primary)" }}
            >
              TutorMate
            </span>
            <span
              className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--color-primary-50)",
                color: "var(--color-primary)",
              }}
            >
              {role}
            </span>
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150"
                style={{
                  backgroundColor: isActive
                    ? "var(--color-primary-50)"
                    : "transparent",
                  color: isActive
                    ? "var(--color-primary-dark)"
                    : "var(--color-text-secondary)",
                }}
              >
                <Icon
                  className="w-4 h-4"
                  style={{
                    color: isActive
                      ? "var(--color-primary)"
                      : "var(--color-text-muted)",
                  }}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div
        className="p-3 rounded-lg text-xs"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          color: "var(--color-text-muted)",
        }}
      >
        TutorMate BD v1.0.0
      </div>
    </aside>
  );
}
