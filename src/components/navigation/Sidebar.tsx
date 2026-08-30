"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

const MORE_EXPANDED_KEY = "tutormate_sidebar_more_expanded";

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const categories = navCategoriesByRole[role] ?? tutorNavCategories;
  const badgeStyle = roleBadgeStyles[role] ?? roleBadgeStyles.tutor;
  const dashboardHref = dashboardByRole[role] ?? "/";

  // Collapsible "More" section — persisted in localStorage
  const [moreExpanded, setMoreExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MORE_EXPANDED_KEY);
      if (saved === "true") setMoreExpanded(true);
    } catch {}
  }, []);

  const toggleMore = () => {
    setMoreExpanded((prev) => {
      const next = !prev;
      try { localStorage.setItem(MORE_EXPANDED_KEY, String(next)); } catch {}
      return next;
    });
  };

  // Determine if any "more" item is currently active (so we auto-expand if so)
  useEffect(() => {
    const allItems = categories.flatMap((c) => c.items);
    const secondaryItems = allItems.filter((i) => i.isPrimary === false);
    const isSecondaryActive = secondaryItems.some(
      (i) => pathname === i.href || pathname.startsWith(i.href + "/")
    );
    if (isSecondaryActive) setMoreExpanded(true);
  }, [pathname, categories]);

  const handlePrefetch = (href: string) => {
    try { router.prefetch(href); } catch {}
  };

  // Separate all items into primary and secondary
  const allItems = categories.flatMap((c) => c.items);
  const hasPrimaryFlag = allItems.some((i) => i.isPrimary !== undefined);

  // Build primary & secondary item lists (only for tutor; others show all)
  const primaryItems = hasPrimaryFlag
    ? allItems.filter((i) => i.isPrimary !== false)
    : allItems;
  const secondaryItems = hasPrimaryFlag
    ? allItems.filter((i) => i.isPrimary === false)
    : [];

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const rawLabel = item.key ? t(`nav.${item.key}`) : item.label;
    const translatedLabel = rawLabel && rawLabel !== `nav.${item.key}` ? rawLabel : item.label;

    return (
      <Link
        key={item.href}
        href={item.href}
        prefetch={true}
        onMouseEnter={() => handlePrefetch(item.href)}
        onFocus={() => handlePrefetch(item.href)}
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 group active:scale-[0.98]"
        style={{
          background: isActive ? "var(--color-primary-50)" : "transparent",
          color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon
            className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110"
            style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-muted)" }}
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
                  : item.badgeColor === "emerald"
                  ? "rgba(16, 185, 129, 0.1)"
                  : "var(--color-primary-50)",
              color:
                item.badgeColor === "amber"
                  ? "rgb(217, 119, 6)"
                  : item.badgeColor === "emerald"
                  ? "rgb(5, 150, 105)"
                  : "var(--color-primary)",
              borderColor:
                item.badgeColor === "amber"
                  ? "rgba(245, 158, 11, 0.3)"
                  : item.badgeColor === "emerald"
                  ? "rgba(16, 185, 129, 0.3)"
                  : "var(--color-primary-100)",
            }}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      style={{
        background: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-sidebar-border)",
      }}
      className="hidden md:flex w-64 flex-col justify-between p-4 shrink-0 h-screen sticky top-0 overflow-y-auto"
    >
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="px-2 py-1">
          <Link
            href={dashboardHref}
            prefetch={true}
            onMouseEnter={() => handlePrefetch(dashboardHref)}
            className="flex items-center justify-between"
          >
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

        {/* Primary Navigation (always visible) */}
        <nav className="space-y-1">
          {hasPrimaryFlag ? (
            // Flat list for tutor (primary items only)
            primaryItems.map(renderNavItem)
          ) : (
            // Categorized list for other roles
            categories.map((catGroup) => (
              <div key={catGroup.category} className="space-y-1">
                <div
                  className="px-3 text-[10px] font-bold uppercase tracking-wider mb-1 mt-3"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {(() => {
                    const rawCategoryName = catGroup.key ? t(`navCategory.${catGroup.key}`) : catGroup.category;
                    return rawCategoryName && rawCategoryName !== `navCategory.${catGroup.key}` ? rawCategoryName : catGroup.category;
                  })()}
                </div>
                {catGroup.items.map(renderNavItem)}
              </div>
            ))
          )}
        </nav>

        {/* "More" Collapsible Section (secondary items, tutor only) */}
        {secondaryItems.length > 0 && (
          <div className="space-y-1">
            <div
              className="h-px mx-3"
              style={{ background: "var(--color-border)" }}
            />

            <button
              type="button"
              onClick={toggleMore}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span>More features</span>
              {moreExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {moreExpanded && (
              <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {secondaryItems.map(renderNavItem)}
              </div>
            )}
          </div>
        )}
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
