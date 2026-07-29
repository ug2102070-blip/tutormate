"use client";

import { useLanguage, type Language } from "@/context/LanguageContext";
import { Check, Globe } from "lucide-react";

export function LanguageSelect() {
  const { language, setLanguage } = useLanguage();

  const languages: {
    id: Language;
    name: string;
    nativeName: string;
    flag: string;
    desc: string;
  }[] = [
    {
      id: "en",
      name: "English",
      nativeName: "English (US)",
      flag: "🇬🇧",
      desc: "Standard global interface language for TutorMate",
    },
    {
      id: "bn",
      name: "Bengali",
      nativeName: "বাংলা (বাংলাদেশ)",
      flag: "🇧🇩",
      desc: "বাংলাদেশের কোচিং শিক্ষার্থী ও টিউটরদের জন্য স্বাচ্ছন্দ্যময় বাংলা ইন্টারফেস",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {languages.map((l) => {
        const isSelected = language === l.id;

        return (
          <button
            key={l.id}
            type="button"
            onClick={() => setLanguage(l.id)}
            className={`relative group text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
              isSelected
                ? "border-indigo-600 dark:border-indigo-400 bg-indigo-50/40 dark:bg-indigo-500/10 shadow-xs ring-2 ring-indigo-500/20"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-[#131b2e] hover:border-slate-300 dark:hover:border-white/20 hover:shadow-xs"
            }`}
          >
            <div className="flex items-start justify-between gap-3 w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xl shrink-0">
                  {l.flag}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {l.nativeName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {l.name}
                  </p>
                </div>
              </div>

              {isSelected ? (
                <div className="w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-400 text-white dark:text-slate-950 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-white/20 group-hover:border-slate-400 dark:group-hover:border-white/40 shrink-0" />
              )}
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {l.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
