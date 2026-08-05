"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  tutorNavCategories,
  studentNavCategories,
  ownerNavCategories,
  parentNavCategories,
  NavItem,
} from "./nav-data";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarProps {
  role: "tutor" | "student" | "owner" | "parent";
}

const roleBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  tutor: {
    bg: "var(--color-primary-50)",
    text: "var(--color-primary)",
    border: "var(--color-primary-100)",
  },
  owner: {
    bg: "rgba(245, 158, 11, 0.12)",
    text: "rgb(217, 119, 6)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  student: {
    bg: "rgba(16, 185, 129, 0.12)",
    text: "rgb(5, 150, 105)",
    border: "rgba(16, 185, 129, 0.3)",
  },
  parent: {
    bg: "rgba(139, 92, 246, 0.12)",
    text: "rgb(109, 40, 217)",
    border: "rgba(139, 92, 246, 0.3)",
  },
};

const navCategoriesByRole = {
  tutor: tutorNavCategories,
  student: studentNavCategories,
  owner: ownerNavCategories,
  parent: parentNavCategories,
};

const dashboardByRole: Record<string, string> = {
  tutor: "/tutor/dashboard",
  student: "/student/dashboard",
  owner: "/owner/dashboard",
  parent: "/parent/dashboard",
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const categories = navCategoriesByRole[role] ?? tutorNavCategories;
  const badgeStyle = roleBadgeStyles[role] ?? roleBadgeStyles.tutor;
  const dashboardHref = dashboardByRole[role] ?? "/";

  return (
    <aside
      style={{
        background: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-sidebar-border)",
      }}
      className="hidden md:flex w-64 flex-col justify-between p-4 shrink-0 h-screen sticky top-0 overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-2 py-1">
          <Link href={dashboardHref} className="flex items-center justify-between">
            <span
              className="text-xl font-extrabold tracking-tight"
              style={{ color: "var(--color-primary)" }}
            >
              TutorMate
            </span>
            <span
              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border"
              style={{
                background: badgeStyle.bg,
                color: badgeStyle.text,
                borderColor: badgeStyle.border,
              }}
            >
              {role === "owner" ? "Center" : t(`roles.${role}`)}
            </span>
          </Link>
        </div>

        {/* Categorized Navigation */}
        <nav className="space-y-5">
          {categories.map((catGroup) => (
            <div key={catGroup.category} className="space-y-1">
              <div
                className="px-3 text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                {(() => {
                  const rawCategoryName = catGroup.key ? t(`navCategory.${catGroup.key}`) : catGroup.category;
                  return rawCategoryName && rawCategoryName !== `navCategory.${catGroup.key}` ? rawCategoryName : catGroup.category;
                })()}
              </div>
              {catGroup.items.map((item: NavItem) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                const rawLabel = item.key ? t(`nav.${item.key}`) : item.label;
                const translatedLabel = rawLabel && rawLabel !== `nav.${item.key}` ? rawLabel : item.label;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 group"
                    style={{
                      background: isActive ? "var(--color-primary-50)" : "transparent",
                      color: isActive
                        ? "var(--color-primary)"
                        : "var(--color-text-secondary)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110"
                        style={{
                          color: isActive
                            ? "var(--color-primary)"
                            : "var(--color-text-muted)",
                        }}
                      />
                      <span className="truncate">{translatedLabel}</span>
                    </div>

                    {item.badge && (
                      <span
                        className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border shrink-0"
                        style={{
                          background:
                            item.badgeColor === "amber"
                              ? "rgba(245, 158, 11, 0.1)"
                              : "var(--color-primary-50)",
                          color:
                            item.badgeColor === "amber"
                              ? "rgb(217, 119, 6)"
                              : "var(--color-primary)",
                          borderColor:
                            item.badgeColor === "amber"
                              ? "rgba(245, 158, 11, 0.3)"
                              : "var(--color-primary-100)",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div
        className="mt-6 p-3 rounded-xl text-[11px] font-medium flex items-center justify-between"
        style={{
          background: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-muted)",
        }}
      >
        <span>TutorMate BD</span>
        <span className="text-[10px] font-mono opacity-80">v1.0.0</span>
      </div>
    </aside>
  );
}
