"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";

import { HeaderCalendar } from "@/components/HeaderCalendar";

export function Header() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    document.cookie = "__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-4 md:px-6 flex items-center justify-between shrink-0 shadow-xs z-20 relative">
      <div className="flex items-center gap-3">
        {/* Mobile Brand Title */}
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/" className="text-lg font-black tracking-tight text-indigo-600">
            TutorMate
          </Link>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
            {role}
          </span>
        </div>

        {/* Desktop Title */}
        <h2 className="hidden md:block text-sm font-bold text-slate-800 capitalize tracking-wide">
          {role} Portal
        </h2>
      </div>

      <div className="flex items-center gap-3 relative">
        {/* Calendar Widget */}
        {role && <HeaderCalendar role={role as "tutor" | "student"} />}

        {/* User Info Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          aria-expanded={showMenu}
          aria-label="User account menu"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-extrabold border border-indigo-200 shrink-0">
            {displayName ? (
              displayName.charAt(0).toUpperCase()
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">
              {displayName}
            </div>
            <div className="text-[11px] text-slate-500 font-medium leading-tight">
              {user?.email}
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* Account Dropdown Menu */}
        {showMenu && (
          <div
            className="absolute right-0 top-12 w-48 bg-white rounded-2xl border border-slate-200 shadow-lg py-1.5 z-50 animate-fade-in"
            onMouseLeave={() => setShowMenu(false)}
          >
            <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
              <div className="text-xs font-bold text-slate-900">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-500 truncate font-medium">
                {user?.email}
              </div>
            </div>

            {role === "tutor" && (
              <Link
                href="/tutor/settings"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Account Settings
              </Link>
            )}

            <button
              onClick={() => {
                setShowMenu(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
