"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import en from "@/locales/en.json";
import bn from "@/locales/bn.json";
import { createClient } from "@/lib/supabase/client";

export type Language = "en" | "bn";

const dictionaries: Record<Language, any> = { en, bn };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    // Load language preference from localStorage
    const savedLang = localStorage.getItem("tutormate_lang") as Language;
    if (savedLang === "en" || savedLang === "bn") {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("tutormate_lang", lang);

    // Optionally update user profile in Supabase
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) {
          supabase
            .from("profiles")
            .update({ preferred_language: lang, updated_at: new Date().toISOString() })
            .eq("id", data.user.id);
        }
      });
    } catch {
      // Ignore
    }
  };

  /**
   * Evaluates a dot-notated key (e.g., "nav.dashboard") against active dictionary.
   */
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let currentDict = dictionaries[language] || dictionaries.en;

    for (const k of keys) {
      if (currentDict && typeof currentDict === "object" && k in currentDict) {
        currentDict = currentDict[k];
      } else {
        // Fallback to English dictionary if key not found
        let fallback = dictionaries.en;
        for (const fk of keys) {
          if (fallback && typeof fallback === "object" && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return key; // return raw key if fallback also missing
          }
        }
        currentDict = fallback;
        break;
      }
    }

    if (typeof currentDict !== "string") {
      return key;
    }

    let result = currentDict;
    if (params) {
      Object.entries(params).forEach(([pK, pV]) => {
        result = result.replace(new RegExp(`{${pK}}`, "g"), String(pV));
      });
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
