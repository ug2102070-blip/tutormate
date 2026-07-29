"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { tutorNavCategories, studentNavCategories, NavItem } from "./nav-data";
import { useLanguage } from "@/context/LanguageContext";

interface MobileDrawerProps {
  role: "tutor" | "student";
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ role, isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const categories = role === "tutor" ? tutorNavCategories : studentNavCategories;

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className="relative w-72 max-w-[82vw] h-full flex flex-col justify-between p-4 shadow-2xl overflow-y-auto z-10 animate-slide-in-left"
        style={{
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
        }}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1 border-b pb-3" style={{ borderColor: "var(--color-border)" }}>
            <Link href={role ? `/${role}/dashboard` : "/"} onClick={onClose} className="flex items-center gap-2">
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
                {t(`roles.${role}`)}
              </span>
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl transition-colors active:scale-95"
              style={{
                color: "var(--color-text-muted)",
                background: "var(--color-bg-secondary)",
              }}
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Categorized Navigation */}
          <nav className="space-y-5">
            {categories.map((catGroup) => (
              <div key={catGroup.category} className="space-y-1">
                <div
                  className="px-3 text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {catGroup.key ? t(`navCategory.${catGroup.key}`) : catGroup.category}
                </div>
                {catGroup.items.map((item: NavItem) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const translatedLabel = item.key ? t(`nav.${item.key}`) : item.label;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 active:scale-98"
                      style={{
                        background: isActive ? "var(--color-primary-50)" : "transparent",
                        color: isActive
                          ? "var(--color-primary)"
                          : "var(--color-text-secondary)",
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className="w-4 h-4 shrink-0 transition-transform duration-150"
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
    </div>
  );
}
