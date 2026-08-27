"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Settings, ChevronDown, User, Menu, Gem, Building2, GraduationCap } from "lucide-react";
import { HeaderCalendar } from "@/components/HeaderCalendar";
import { CommandBar } from "@/components/CommandBar";
import { AcademicYearSelector } from "@/components/navigation/AcademicYearSelector";
import { NotificationBell } from "@/components/NotificationBell";
import { HeaderPersonalNote } from "@/components/navigation/HeaderPersonalNote";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { MobileDrawer } from "@/components/navigation/MobileDrawer";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Signout error:", err);
    } finally {
      setLoggingOut(false);
      router.push("/login");
    }
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const isOwnerInTutorMode = role === "owner" && pathname.startsWith("/tutor");
  const isOwnerInCenterMode = role === "owner" && pathname.startsWith("/owner");

  return (
    <>
      <header
        className="h-14 px-4 md:px-6 flex items-center justify-between shrink-0 z-20 relative sticky top-0 backdrop-blur-xl"
        style={{
          background: "var(--color-header-bg)",
          borderBottom: "1px solid var(--color-header-border)",
        }}
      >
        {/* Left: Brand (mobile) / Portal title (desktop) */}
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button (mobile only) */}
          <button
            onClick={() => setShowMobileDrawer(true)}
            className="p-1.5 rounded-xl md:hidden transition-colors active:scale-95 flex items-center justify-center"
            style={{
              color: "var(--color-text)",
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
            }}
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href={role ? `/${role}/dashboard` : "/"}
              className="text-base font-black tracking-tight"
              style={{ color: "var(--color-primary)" }}
            >
              TutorMate
            </Link>
            <span
              className="hidden sm:inline-block text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border"
              style={{
                background: "var(--color-primary-50)",
                color: "var(--color-primary)",
                borderColor: "var(--color-primary-100)",
              }}
            >
              {role}
            </span>
          </div>

          <h2
            className="hidden md:block text-sm font-bold capitalize tracking-wide"
            style={{ color: "var(--color-text)" }}
          >
            {t(`roles.${role}`)} {t("header.portal")}
          </h2>

          {/* Quick Mode Switcher for Center Owners (desktop/tablet) */}
          {isOwnerInTutorMode && (
            <Link
              href="/owner/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs border"
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                color: "rgb(217, 119, 6)",
                borderColor: "rgba(245, 158, 11, 0.3)",
              }}
              title="Return to Owner Portal"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Center Portal</span>
            </Link>
          )}

          {isOwnerInCenterMode && (
            <Link
              href="/tutor/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs border"
              style={{
                background: "var(--color-primary-50)",
                color: "var(--color-primary)",
                borderColor: "var(--color-primary-100)",
              }}
              title="Switch to Tutor Mode"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Teach Mode</span>
            </Link>
          )}
        </div>

      {/* Right: Academic Year (Owner only) + Command Bar + Calendar + Notifications + User */}
      <div className="flex items-center gap-2 relative">
        {/* Academic Session Selector — for institution owners */}
        {role === "owner" && <AcademicYearSelector />}

        {/* Global Command Bar (Ctrl+K) */}
        <CommandBar />

        {/* Calendar Widget — available everywhere */}
        {role && <HeaderCalendar role={role as "tutor" | "student"} />}

        {/* Personal Sticky Note Widget */}
        <HeaderPersonalNote />

        {/* Notification Bell */}
        <NotificationBell />

        <div ref={menuRef} className="relative">
          {/* User Avatar Button */}
          <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 p-1 rounded-xl transition-all active:scale-95"
          style={{
            border: "1px solid transparent",
          }}
          aria-expanded={showMenu}
          aria-label="User account menu"
          id="header-user-btn"
        >
          {/* Avatar Circle */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border shrink-0"
            style={{
              background: "var(--color-primary-50)",
              color: "var(--color-primary)",
              borderColor: "var(--color-primary-100)",
            }}
          >
            {initials || <User className="w-4 h-4" />}
          </div>

          {/* Name — only on larger screens */}
          <div className="hidden sm:block text-left">
            <div
              className="text-xs font-bold leading-tight"
              style={{ color: "var(--color-text)" }}
            >
              {displayName}
            </div>
            <div
              className="text-[10px] leading-tight"
              style={{ color: "var(--color-text-muted)" }}
            >
              {user?.email}
            </div>
          </div>

          <ChevronDown
            className="w-3.5 h-3.5"
            style={{
              color: "var(--color-text-muted)",
              transform: showMenu ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            {/* Menu Panel */}
            <div
              className="absolute right-0 top-11 w-60 rounded-2xl py-1.5 z-50 animate-scale-in space-y-1"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-elevated)",
              }}
            >
              {/* User info header */}
              <div
                className="px-3.5 py-2.5 border-b"
                style={{
                  borderColor: "var(--color-border)",
                }}
              >
                <div
                  className="text-xs font-bold truncate"
                  style={{ color: "var(--color-text)" }}
                >
                  {displayName}
                </div>
                <div
                  className="text-[10px] truncate font-medium mt-0.5"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {user?.email}
                </div>
              </div>

              {/* Quick Language & Theme Options */}
              <div
                className="px-3 py-2 border-b space-y-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  <span>{t("header.language")}</span>
                  <LanguageToggle />
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
                  <span>{t("header.theme")}</span>
                  <ThemeToggle />
                </div>
              </div>

              {/* Settings link (tutor only) */}
              {role === "tutor" && (
                <>
                  <Link
                    href="/tutor/settings"
                    prefetch={true}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--color-text-secondary)" }}
                    id="header-settings-link"
                  >
                    <Settings
                      className="w-4 h-4"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                    {t("header.accountSettings")}
                  </Link>

                  <Link
                    href="/tutor/subscription"
                    prefetch={true}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: "var(--color-text-secondary)" }}
                    id="header-subscription-link"
                  >
                    <div className="flex items-center gap-2.5">
                      <Gem
                        className="w-4 h-4 text-amber-500"
                      />
                      {t("header.subscriptionPlan")}
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      PRO
                    </span>
                  </Link>
                </>
              )}

              {/* Logout button */}
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleLogout();
                }}
                disabled={loggingOut}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-60"
                style={{ color: "var(--color-error)" }}
                id="header-logout-btn"
              >
                <LogOut className={`w-4 h-4 ${loggingOut ? "animate-spin" : ""}`} />
                {loggingOut ? "Signing out..." : t("header.signOut")}
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </header>

    <MobileDrawer
      role={(role as "tutor" | "student" | "owner" | "parent") || "tutor"}
      isOpen={showMobileDrawer}
      onClose={() => setShowMobileDrawer(false)}
    />
  </>
  );
}
