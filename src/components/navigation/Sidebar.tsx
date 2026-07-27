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
  BookOpen,
  FileText,
  Award,
  Bell,
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
    { href: "/tutor/doubts", label: "Student Doubts", icon: HelpCircle },
    { href: "/tutor/materials", label: "Study Materials", icon: BookOpen },
    { href: "/tutor/assignments", label: "Assignments", icon: FileText },
    { href: "/tutor/exams", label: "Exams", icon: Award },
    { href: "/tutor/settings", label: "Settings", icon: Settings },
  ];

  const studentNavItems = [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/attendance", label: "My Attendance", icon: CalendarCheck },
    { href: "/student/fees", label: "Payment History", icon: CreditCard },
    { href: "/student/doubts", label: "Ask Doubts", icon: HelpCircle },
    { href: "/student/materials", label: "Study Materials", icon: BookOpen },
    { href: "/student/assignments", label: "Assignments", icon: FileText },
    { href: "/student/exams", label: "Exams", icon: Award },
  ];

  const items = role === "tutor" ? tutorNavItems : studentNavItems;

  return (
    <aside
      style={{
        background: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-sidebar-border)",
      }}
      className="hidden md:flex w-64 flex-col justify-between p-4 shrink-0"
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-3 py-2">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ color: "var(--color-primary)" }}
            >
              TutorMate
            </span>
            <span
              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border"
              style={{
                background: "var(--color-primary-50)",
                color: "var(--color-primary)",
                borderColor: "var(--color-primary-100)",
              }}
            >
              {role}
            </span>
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-150"
                style={{
                  background: isActive ? "var(--color-primary-50)" : "transparent",
                  color: isActive
                    ? "var(--color-primary)"
                    : "var(--color-text-secondary)",
                }}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
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

      {/* Footer */}
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
    </aside>
  );
}
