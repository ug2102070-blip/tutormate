"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
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
    bg: "bg-blue-100 dark:bg-blue-900/60",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800/60",
  },
  owner: {
    bg: "bg-amber-100 dark:bg-amber-900/60",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800/60",
  },
  student: {
    bg: "bg-emerald-100 dark:bg-emerald-900/60",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800/60",
  },
  parent: {
    bg: "bg-purple-100 dark:bg-purple-900/60",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800/60",
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
        className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 group active:scale-[0.98] ${
          isActive
            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-100/50 dark:border-blue-900/50"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 relative">
          {isActive && (
            <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
          )}
          <Icon
            className={`w-4 h-4 shrink-0 transition-all duration-200 ${
              isActive
                ? "text-blue-600 dark:text-blue-400 scale-110"
                : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 group-hover:scale-110"
            }`}
          />
          <span className="truncate tracking-wide">{translatedLabel}</span>
        </div>

        {item.badge && (
          <span
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border shrink-0 transition-colors ${
              item.badgeColor === "amber"
                ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60"
                : item.badgeColor === "emerald"
                ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                : "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
            }`}
          >
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex w-64 flex-col justify-between p-4 shrink-0 h-screen sticky top-0 overflow-y-auto bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/60 shadow-[4px_0_24px_rgba(0,0,0,0.01)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] transition-all z-20">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-3 py-2">
          <Link
            href={dashboardHref}
            prefetch={true}
            onMouseEnter={() => handlePrefetch(dashboardHref)}
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow shrink-0">
                <span className="text-white font-black text-lg">T</span>
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
                Tutor<span className="text-blue-600 dark:text-blue-400">Mate</span>
              </span>
            </div>
            <span
              className={`text-[8px] sm:text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} shadow-sm shrink-0 ml-1`}
            >
              {role === "owner" ? "Center" : t(`roles.${role}`)}
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5 px-1">
          {hasPrimaryFlag ? (
            // Flat list for tutor (primary items only)
            primaryItems.map(renderNavItem)
          ) : (
            // Categorized list for other roles
            categories.map((catGroup) => (
              <div key={catGroup.category} className="space-y-1 mb-6">
                <div className="px-3 text-[10px] font-black uppercase tracking-widest mb-2 mt-4 text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  {(() => {
                    const rawCategoryName = catGroup.key ? t(`navCategory.${catGroup.key}`) : catGroup.category;
                    return rawCategoryName && rawCategoryName !== `navCategory.${catGroup.key}` ? rawCategoryName : catGroup.category;
                  })()}
                  <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                </div>
                {catGroup.items.map(renderNavItem)}
              </div>
            ))
          )}
        </nav>

        {/* "More" Collapsible Section (secondary items, tutor only) */}
        {secondaryItems.length > 0 && (
          <div className="space-y-1.5 px-1">
            <div className="h-px mx-3 my-4 bg-slate-200/60 dark:bg-slate-800/60" />

            <button
              type="button"
              onClick={toggleMore}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer text-slate-500 dark:text-slate-400 group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
            >
              <span className="group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">More features</span>
              {moreExpanded ? (
                <ChevronUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
              ) : (
                <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              )}
            </button>

            {moreExpanded && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200 pt-1">
                {secondaryItems.map(renderNavItem)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer System Info */}
      <div className="mt-8 px-1 pb-2">
        <div className="p-3.5 rounded-2xl flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 shadow-inner group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">TutorMate BD</span>
          </div>
          <span className="text-[9px] font-black font-mono text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md group-hover:text-blue-500 transition-colors">
            v1.0.0
          </span>
        </div>
      </div>
    </aside>
  );
}
