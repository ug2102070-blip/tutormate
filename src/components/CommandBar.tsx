"use client";

import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  BookOpen,
  CalendarCheck,
  CreditCard,
  Bell,
  Sparkles,
  Video,
  FileText,
  HelpCircle,
  Settings,
  PlusCircle,
  MessageSquare,
  Shield,
  X,
  Command,
  Clock,
  ChevronRight,
  GraduationCap,
  Layers,
  Loader2,
  BookMarked,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { globalSearch, type SearchResult } from "@/actions/searchActions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  id: string;
  title: string;
  description: string;
  category: "Navigation" | "Quick Actions" | "Tools";
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles?: string[];
}

type DisplayItem =
  | ({ kind: "nav" } & NavItem)
  | ({ kind: "result" } & SearchResult);

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_KEY = "tutormate_recent_commands";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 280;

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveRecent(id: string) {
  const prev = getRecent().filter((r) => r !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)));
}

// ─── Highlight ───────────────────────────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-sm px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Style maps ──────────────────────────────────────────────────────────────

const NAV_CAT_STYLE: Record<NavItem["category"], { dot: string; label: string }> = {
  Navigation:      { dot: "bg-blue-500",    label: "Navigation" },
  "Quick Actions": { dot: "bg-emerald-500", label: "Quick Actions" },
  Tools:           { dot: "bg-violet-500",  label: "Tools" },
};

const NAV_ICON_IDLE: Record<NavItem["category"], string> = {
  Navigation:      "bg-blue-50 dark:bg-blue-500/15 text-blue-500",
  "Quick Actions": "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-500",
  Tools:           "bg-violet-50 dark:bg-violet-500/15 text-violet-500",
};
const NAV_ICON_ACTIVE: Record<NavItem["category"], string> = {
  Navigation:      "bg-blue-600 text-white",
  "Quick Actions": "bg-emerald-600 text-white",
  Tools:           "bg-violet-600 text-white",
};

const RESULT_TYPE_ICON: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  student:  GraduationCap,
  batch:    Layers,
  exam:     FileText,
  material: BookMarked,
};
const RESULT_TYPE_STYLE = {
  student:  { idle: "bg-rose-50 dark:bg-rose-500/15 text-rose-500",   active: "bg-rose-600 text-white",   dot: "bg-rose-500",    label: "Students" },
  batch:    { idle: "bg-amber-50 dark:bg-amber-500/15 text-amber-500", active: "bg-amber-600 text-white",  dot: "bg-amber-500",   label: "Batches" },
  exam:     { idle: "bg-sky-50 dark:bg-sky-500/15 text-sky-500",       active: "bg-sky-600 text-white",    dot: "bg-sky-500",     label: "Exams" },
  material: { idle: "bg-teal-50 dark:bg-teal-500/15 text-teal-500",    active: "bg-teal-600 text-white",   dot: "bg-teal-500",    label: "Materials" },
};

// ─── Nav commands (static) ────────────────────────────────────────────────────

function useNavCommands(role: string | null): NavItem[] {
  return useMemo(
    () => [
      { id: "dash",         title: "Dashboard",             description: "Overview of your activity",         category: "Navigation",     icon: LayoutDashboard, href: `/${role || "tutor"}/dashboard` },
      { id: "students",     title: "Manage Students",       description: "View and manage enrolled students",  category: "Navigation",     icon: Users,           href: "/tutor/students",           roles: ["tutor", "owner"] },
      { id: "batches",      title: "Batch Management",      description: "Create and manage class batches",    category: "Navigation",     icon: BookOpen,        href: "/tutor/batches",            roles: ["tutor", "owner"] },
      { id: "attendance",   title: "Attendance Tracker",    description: "Mark and review attendance",        category: "Navigation",     icon: CalendarCheck,   href: "/tutor/attendance",         roles: ["tutor", "owner"] },
      { id: "fees",         title: "Fee Ledger & Payments", description: "Track payments and dues",           category: "Navigation",     icon: CreditCard,      href: "/tutor/fees",               roles: ["tutor", "owner"] },
      { id: "exams",        title: "Exams & Marksheet",     description: "Schedule exams and view results",   category: "Navigation",     icon: FileText,        href: "/tutor/exams" },
      { id: "materials",    title: "Study Materials",       description: "Upload and share resources",        category: "Navigation",     icon: BookOpen,        href: "/tutor/materials" },
      { id: "recorded",     title: "Recorded Classes",      description: "Access recorded video sessions",    category: "Navigation",     icon: Video,           href: "/tutor/recorded-classes" },
      { id: "doubts",       title: "Student Doubts",        description: "Answer student questions",          category: "Navigation",     icon: HelpCircle,      href: "/tutor/doubts" },
      { id: "chat",         title: "Internal Chat",         description: "Communicate with your team",        category: "Navigation",     icon: MessageSquare,   href: "/tutor/chat" },
      { id: "notices",      title: "Notice Board",          description: "Post announcements",                category: "Navigation",     icon: Bell,            href: "/tutor/notices" },
      { id: "settings",     title: "Account Settings",      description: "Manage your profile",               category: "Navigation",     icon: Settings,        href: "/settings" },
      { id: "std-dash",     title: "Student Dashboard",     description: "Your personal dashboard",           category: "Navigation",     icon: LayoutDashboard, href: "/student/dashboard",        roles: ["student"] },
      { id: "std-fees",     title: "Fee Payment History",   description: "View your payment history",         category: "Navigation",     icon: CreditCard,      href: "/student/fees",             roles: ["student"] },
      { id: "add-student",  title: "Add New Student",       description: "Enroll a new student quickly",      category: "Quick Actions",  icon: PlusCircle,      href: "/tutor/students/new",       roles: ["tutor", "owner"] },
      { id: "ai-assistant", title: "Ask AI Assistant",      description: "Get AI-powered help",               category: "Tools",          icon: Sparkles,        href: "/tutor/ai-assistant",       roles: ["tutor", "owner"] },
      { id: "subscription", title: "Subscription Plans",    description: "Manage your plan",                  category: "Tools",          icon: Shield,          href: "/tutor/subscription",       roles: ["tutor", "owner"] },
    ],
    [role]
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [liveResults, setLiveResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  const router = useRouter();
  const { role } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navCommands = useNavCommands(role);

  // ── Filter nav commands by role + query
  const filteredNav = useMemo(() => {
    return navCommands.filter((cmd) => {
      const matchesRole = !cmd.roles || (role && cmd.roles.includes(role));
      if (!matchesRole) return false;
      if (!search.trim()) return true;
      return (
        cmd.title.toLowerCase().includes(search.toLowerCase()) ||
        cmd.description.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [navCommands, role, search]);

  // ── Build grouped display sections
  const sections: { label: string; dotColor: string; items: DisplayItem[] }[] = useMemo(() => {
    const s: { label: string; dotColor: string; items: DisplayItem[] }[] = [];

    if (!search.trim()) {
      // Empty state: show Recent + all nav grouped by category
      const recentNavItems = recentIds
        .map((id) => navCommands.find((c) => c.id === id))
        .filter(Boolean) as NavItem[];

      if (recentNavItems.length > 0) {
        s.push({
          label: "Recent",
          dotColor: "",
          items: recentNavItems.map((n) => ({ kind: "nav" as const, ...n })),
        });
      }

      const grouped: Partial<Record<NavItem["category"], NavItem[]>> = {};
      filteredNav
        .filter((n) => !recentIds.includes(n.id))
        .forEach((n) => {
          if (!grouped[n.category]) grouped[n.category] = [];
          grouped[n.category]!.push(n);
        });

      for (const [cat, items] of Object.entries(grouped) as [NavItem["category"], NavItem[]][]) {
        s.push({
          label: NAV_CAT_STYLE[cat].label,
          dotColor: NAV_CAT_STYLE[cat].dot,
          items: items.map((n) => ({ kind: "nav" as const, ...n })),
        });
      }
    } else {
      // Search mode: live DB results first, then filtered nav
      const byType: Partial<Record<SearchResult["type"], SearchResult[]>> = {};
      liveResults.forEach((r) => {
        if (!byType[r.type]) byType[r.type] = [];
        byType[r.type]!.push(r);
      });

      for (const [type, items] of Object.entries(byType) as [SearchResult["type"], SearchResult[]][]) {
        const style = RESULT_TYPE_STYLE[type];
        s.push({
          label: style.label,
          dotColor: style.dot,
          items: items.map((r) => ({ kind: "result" as const, ...r })),
        });
      }

      if (filteredNav.length > 0) {
        s.push({
          label: "Pages & Actions",
          dotColor: "bg-slate-400",
          items: filteredNav.map((n) => ({ kind: "nav" as const, ...n })),
        });
      }
    }

    return s;
  }, [search, liveResults, filteredNav, recentIds, navCommands]);

  // Flat list for keyboard nav
  const flatList = useMemo(
    () => sections.flatMap((s) => s.items),
    [sections]
  );

  // ── Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim() || search.trim().length < 2) {
      setLiveResults([]);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setHasSearched(false);
      startTransition(async () => {
        const results = await globalSearch(search.trim());
        setLiveResults(results);
        setHasSearched(true);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // ── Open / Close
  const open = useCallback(() => {
    setRecentIds(getRecent());
    setIsOpen(true);
    setSearch("");
    setLiveResults([]);
    setHasSearched(false);
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    setLiveResults([]);
    setHasSearched(false);
  }, []);

  // ── Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            setRecentIds(getRecent());
            setSearch("");
            setLiveResults([]);
            setHasSearched(false);
            setSelectedIndex(0);
          }
          return !prev;
        });
      } else if (e.key === "Escape" && isOpen) {
        close();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close]);

  // ── Reset selection on search change
  useEffect(() => { setSelectedIndex(0); }, [search]);

  // ── Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current
      .querySelector("[data-selected='true']")
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // ── Select handler
  const handleSelect = (item: DisplayItem) => {
    if (item.kind === "nav") saveRecent(item.id);
    close();
    router.push(item.href);
  };

  // ── Keyboard nav inside list
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((p) => (p + 1) % Math.max(1, flatList.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((p) => (p - 1 + flatList.length) % Math.max(1, flatList.length));
    } else if (e.key === "Enter" && flatList[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatList[selectedIndex]);
    }
  };

  // ── Empty state logic
  const showEmpty =
    search.trim().length >= 2 && !isPending && hasSearched && flatList.length === 0;

  const isLoading = isPending && search.trim().length >= 2;

  return (
    <>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={open}
        className="group flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-700 transition-all duration-150 cursor-pointer"
        aria-label="Open Command Bar (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5 shrink-0 group-hover:text-indigo-500 transition-colors" />
        <span className="hidden sm:inline whitespace-nowrap">Search anything...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-400 font-semibold">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* ── Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-16"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            className="w-full max-w-[580px] bg-white dark:bg-slate-900 rounded-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.35)] border border-slate-200/80 dark:border-slate-700/60 overflow-hidden flex flex-col"
            style={{
              maxHeight: "min(72vh, 600px)",
              animation: "cmdbar-in 0.15s cubic-bezier(0.16,1,0.3,1) both",
            }}
            onKeyDown={handleListKeyDown}
          >
            {/* ── Input ── */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-indigo-500 shrink-0 animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-indigo-500 shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students, batches, exams, pages..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 min-w-0"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setLiveResults([]); setHasSearched(false); }}
                  className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ── Results list ── */}
            <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-0.5">
              {/* Empty state */}
              {showEmpty && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    No results for &ldquo;{search}&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Try a student name, batch subject, or page name
                  </p>
                </div>
              )}

              {/* Sections */}
              {!showEmpty &&
                sections.map((section) => (
                  <div key={section.label} className="mb-1">
                    {/* Section header */}
                    <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                      {section.label === "Recent" ? (
                        <Clock className="w-3 h-3 text-slate-400" />
                      ) : section.dotColor ? (
                        <span className={`w-1.5 h-1.5 rounded-full ${section.dotColor}`} />
                      ) : null}
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {section.label}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const globalIdx = flatList.indexOf(item);
                        const isSelected = globalIdx === selectedIndex;

                        if (item.kind === "nav") {
                          const Icon = item.icon;
                          const catStyle = NAV_CAT_STYLE[item.category] || NAV_CAT_STYLE.Navigation;
                          const iconIdle = NAV_ICON_IDLE[item.category] || NAV_ICON_IDLE.Navigation;
                          const iconActive = NAV_ICON_ACTIVE[item.category] || NAV_ICON_ACTIVE.Navigation;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              data-selected={isSelected || undefined}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all duration-100 cursor-pointer group/item ${
                                isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-500/10"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? iconActive : iconIdle}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${isSelected ? "text-indigo-900 dark:text-indigo-200" : "text-slate-800 dark:text-slate-200"}`}>
                                  <HighlightMatch text={item.title} query={search} />
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                  {item.description}
                                </p>
                              </div>
                              {/* Category pill - only in search mode */}
                              {search.trim() && (
                                <span className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-md ${catStyle.dot.replace("bg-", "text-").replace("-500", "-600")} bg-slate-100 dark:bg-slate-800`}>
                                  {catStyle.label}
                                </span>
                              )}
                              <ChevronRight className={`w-4 h-4 shrink-0 transition-all ${isSelected ? "text-indigo-400 translate-x-0.5" : "text-slate-300 dark:text-slate-600 opacity-0 group-hover/item:opacity-100"}`} />
                            </button>
                          );
                        }

                        // Live result (student / batch / exam / material)
                        const style = RESULT_TYPE_STYLE[item.type];
                        const Icon = RESULT_TYPE_ICON[item.type];

                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-selected={isSelected || undefined}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-all duration-100 cursor-pointer group/item ${
                              isSelected
                                ? "bg-indigo-50 dark:bg-indigo-500/10"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? style.active : style.idle}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isSelected ? "text-indigo-900 dark:text-indigo-200" : "text-slate-800 dark:text-slate-200"}`}>
                                <HighlightMatch text={item.title} query={search} />
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                {item.subtitle}
                              </p>
                            </div>
                            {item.meta && (
                              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {item.meta}
                              </span>
                            )}
                            <ChevronRight className={`w-4 h-4 shrink-0 transition-all ${isSelected ? "text-indigo-400 translate-x-0.5" : "text-slate-300 dark:text-slate-600 opacity-0 group-hover/item:opacity-100"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {(["↑↓", "↵", "esc"] as const).map((key, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] text-slate-400">
                    <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px] shadow-sm text-slate-500">
                      {key}
                    </kbd>
                    <span>{["navigate", "open", "close"][i]}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>
                  {isLoading
                    ? "Searching..."
                    : flatList.length > 0
                    ? `${flatList.length} result${flatList.length !== 1 ? "s" : ""}`
                    : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cmdbar-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </>
  );
}
