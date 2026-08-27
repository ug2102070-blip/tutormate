"use client";

import { useEffect, useState, useMemo } from "react";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Quick Actions" | "Tools";
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles?: string[];
}

export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { role } = useAuth();

  const commands: CommandItem[] = useMemo(
    () => [
      // Navigation
      { id: "dash", title: "Dashboard", category: "Navigation", icon: LayoutDashboard, href: `/${role || "tutor"}/dashboard` },
      { id: "students", title: "Manage Students", category: "Navigation", icon: Users, href: "/tutor/students", roles: ["tutor", "owner"] },
      { id: "batches", title: "Batch Management", category: "Navigation", icon: BookOpen, href: "/tutor/batches", roles: ["tutor", "owner"] },
      { id: "attendance", title: "Attendance Tracker", category: "Navigation", icon: CalendarCheck, href: "/tutor/attendance", roles: ["tutor", "owner"] },
      { id: "fees", title: "Fee Ledger & Payments", category: "Navigation", icon: CreditCard, href: "/tutor/fees", roles: ["tutor", "owner"] },
      { id: "exams", title: "Exams & Marksheet", category: "Navigation", icon: FileText, href: "/tutor/exams" },
      { id: "materials", title: "Study Materials", category: "Navigation", icon: BookOpen, href: "/tutor/materials" },
      { id: "recorded", title: "Recorded Classes", category: "Navigation", icon: Video, href: "/tutor/recorded-classes" },
      { id: "doubts", title: "Student Doubts", category: "Navigation", icon: HelpCircle, href: "/tutor/doubts" },
      { id: "chat", title: "Internal Chat", category: "Navigation", icon: MessageSquare, href: "/tutor/chat" },
      { id: "notices", title: "Notice Board", category: "Navigation", icon: Bell, href: "/tutor/notices" },
      { id: "settings", title: "Account Settings", category: "Navigation", icon: Settings, href: "/settings" },
      
      // Student specific
      { id: "std-dash", title: "Student Dashboard", category: "Navigation", icon: LayoutDashboard, href: "/student/dashboard", roles: ["student"] },
      { id: "std-fees", title: "Fee Payment History", category: "Navigation", icon: CreditCard, href: "/student/fees", roles: ["student"] },

      // Quick Actions
      { id: "add-student", title: "Add New Student", category: "Quick Actions", icon: PlusCircle, href: "/tutor/students/new", roles: ["tutor", "owner"] },
      { id: "ai-assistant", title: "Ask AI Assistant", category: "Tools", icon: Sparkles, href: "/tutor/ai-assistant", roles: ["tutor", "owner"] },
      { id: "subscription", title: "Subscription Plans", category: "Tools", icon: Shield, href: "/tutor/subscription", roles: ["tutor", "owner"] },
    ],
    [role]
  );

  // Filter commands by user role and search input
  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) => {
      const matchesRole = !cmd.roles || (role && cmd.roles.includes(role));
      const matchesSearch = cmd.title.toLowerCase().includes(search.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [commands, role, search]);

  // Handle keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Reset index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setSearch("");
    router.push(href);
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredCommands[selectedIndex].href);
    }
  };

  return (
    <>
      {/* Trigger Button component for navbar */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
        aria-label="Open Command Bar (Ctrl+K)"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Search actions...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-400 font-semibold shadow-2xs">
          <Command className="w-2.5 h-2.5" /> K
        </kbd>
      </button>

      {/* Backdrop & Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 sm:pt-28 p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150 relative z-10"
            onKeyDown={handleListKeyDown}
          >
            {/* Input Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
              <Search className="w-5 h-5 text-indigo-500 shrink-0" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or search page..."
                className="w-full text-sm bg-transparent outline-hidden text-slate-900 dark:text-slate-100 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Command List */}
            <div className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/50">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No commands or pages found matching &ldquo;{search}&rdquo;
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const Icon = cmd.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      onClick={() => handleSelect(cmd.href)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-300 font-semibold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isSelected
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{cmd.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {cmd.category}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Keyboard Hints */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span>↑↓ to navigate</span>
                <span>↵ to select</span>
                <span>ESC to close</span>
              </div>
              <span>TutorMate Command Bar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
