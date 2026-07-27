"use client";

import { useLanguage, type Language } from "@/context/LanguageContext";
import { Globe, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  ];

  const currentLang = languages.find((l) => l.code === language) || languages[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all hover:bg-black/5 dark:hover:bg-white/5"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
          background: "var(--color-bg)",
        }}
        title="Switch Application Language"
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span>{currentLang.label}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-32 rounded-xl border shadow-xl p-1 z-50 animate-fade-in"
          style={{
            background: "var(--color-card-bg)",
            borderColor: "var(--color-card-border)",
          }}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all text-left ${
                language === l.code
                  ? "bg-primary text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
