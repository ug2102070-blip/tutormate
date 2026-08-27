"use client";

import { useState, useRef, useEffect } from "react";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { CalendarDays, ChevronDown, Check, Lock } from "lucide-react";

export function AcademicYearSelector() {
  const { selectedYear, allYears, setSelectedYearById } = useAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500"
        style={{
          background: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
        }}
        title="Active Academic Year Session"
      >
        <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
        <span className="font-bold whitespace-nowrap">
          Academic Year {selectedYear.name}
        </span>
        {selectedYear.isLocked && (
          <span title="Locked Session">
            <Lock className="w-3 h-3 text-amber-500" />
          </span>
        )}
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-10 w-56 rounded-2xl py-1.5 z-50 animate-scale-in border shadow-xl space-y-1"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
            Switch Academic Session
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {allYears.map((ay) => {
              const isSelected = ay.id === selectedYear.id;
              return (
                <button
                  key={ay.id}
                  onClick={() => {
                    setSelectedYearById(ay.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors text-left ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{ay.name}</span>
                    {ay.isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
                        Current
                      </span>
                    )}
                    {ay.isLocked && (
                      <Lock className="w-3 h-3 text-amber-500" />
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
