"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  HelpCircle,
} from "lucide-react";

interface MobileNavProps {
  role: "tutor" | "student";
}

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();

  const tutorItems = [
    { href: "/tutor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tutor/batches", label: "Batches", icon: Users },
    { href: "/tutor/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/tutor/fees", label: "Fees", icon: CreditCard },
    { href: "/tutor/doubts", label: "Doubts", icon: HelpCircle },
  ];

  const studentItems = [
    { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/student/fees", label: "Fees", icon: CreditCard },
    { href: "/student/doubts", label: "Doubts", icon: HelpCircle },
  ];

  const items = role === "tutor" ? tutorItems : studentItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md md:hidden px-2 py-1.5 shadow-lg pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? "text-indigo-600 font-extrabold"
                  : "text-slate-500 font-semibold hover:text-slate-900"
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-colors ${
                  isActive ? "bg-indigo-50" : ""
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
