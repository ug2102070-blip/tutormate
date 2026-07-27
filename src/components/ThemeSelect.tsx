"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Laptop, Check } from "lucide-react";

export function ThemeSelect() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10" />
        ))}
      </div>
    );
  }

  const themes = [
    {
      id: "light",
      name: "Light Mode",
      desc: "Clean high-contrast theme for bright environments",
      icon: Sun,
      preview: {
        bg: "bg-slate-100",
        card: "bg-white border-slate-200",
        header: "bg-white border-b border-slate-200",
        lines: "bg-slate-200",
        accent: "bg-indigo-500",
      },
    },
    {
      id: "dark",
      name: "Dark Obsidian",
      desc: "Deep obsidian dark theme tailored for low-light focus",
      icon: Moon,
      preview: {
        bg: "bg-[#0b0f19]",
        card: "bg-[#131b2e] border-white/10",
        header: "bg-[#0b0f19] border-b border-white/10",
        lines: "bg-slate-700",
        accent: "bg-indigo-400",
      },
    },
    {
      id: "system",
      name: "System Preference",
      desc: "Automatically adapts to your device operating system theme",
      icon: Laptop,
      preview: {
        bg: resolvedTheme === "dark" ? "bg-[#0b0f19]" : "bg-slate-100",
        card: resolvedTheme === "dark" ? "bg-[#131b2e] border-white/10" : "bg-white border-slate-200",
        header: resolvedTheme === "dark" ? "bg-[#0b0f19] border-b border-white/10" : "bg-white border-b border-slate-200",
        lines: resolvedTheme === "dark" ? "bg-slate-700" : "bg-slate-200",
        accent: "bg-indigo-500",
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {themes.map((t) => {
          const isSelected = theme === t.id;
          const Icon = t.icon;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`relative group text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer ${
                isSelected
                  ? "border-indigo-600 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-500/10 shadow-md ring-2 ring-indigo-500/20"
                  : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] hover:border-slate-300 dark:hover:border-white/20 hover:shadow-xs"
              }`}
            >
              {/* Card Header & Preview */}
              <div className="space-y-3 w-full">
                {/* Visual Thumbnail Preview */}
                <div className={`w-full h-16 rounded-xl ${t.preview.bg} border p-1.5 flex flex-col gap-1 overflow-hidden transition-transform group-hover:scale-[1.02]`}>
                  <div className={`h-3 w-full rounded-md ${t.preview.header} flex items-center justify-between px-1.5`}>
                    <div className={`h-1.5 w-6 rounded-full ${t.preview.accent}`} />
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 rounded-full bg-slate-400/50" />
                      <div className="w-1 h-1 rounded-full bg-slate-400/50" />
                    </div>
                  </div>
                  <div className="flex gap-1 flex-1">
                    <div className={`w-1/3 rounded-md ${t.preview.card} p-1 space-y-1`}>
                      <div className={`h-1.5 w-full rounded ${t.preview.lines}`} />
                      <div className={`h-1.5 w-2/3 rounded ${t.preview.lines}`} />
                    </div>
                    <div className={`flex-1 rounded-md ${t.preview.card} p-1 space-y-1`}>
                      <div className={`h-1.5 w-3/4 rounded ${t.preview.lines}`} />
                      <div className={`h-1.5 w-1/2 rounded ${t.preview.lines}`} />
                    </div>
                  </div>
                </div>

                {/* Title & Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`} />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      {t.name}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
                  {t.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
