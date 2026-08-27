"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2026-27"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isLocked: boolean;
  status: "active" | "inactive";
  classesCount: number;
  studentsCount: number;
}

const DEFAULT_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: "ay-2026-27",
    name: "2026-27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    isCurrent: true,
    isLocked: false,
    status: "active",
    classesCount: 6,
    studentsCount: 12,
  },
  {
    id: "ay-2025-26",
    name: "2025-26",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    isCurrent: false,
    isLocked: true,
    status: "inactive",
    classesCount: 5,
    studentsCount: 10,
  },
  {
    id: "ay-2027-28",
    name: "2027-28",
    startDate: "2027-04-01",
    endDate: "2028-03-31",
    isCurrent: false,
    isLocked: false,
    status: "inactive",
    classesCount: 0,
    studentsCount: 0,
  },
];

interface AcademicYearContextType {
  selectedYear: AcademicYear;
  allYears: AcademicYear[];
  setSelectedYearById: (id: string) => void;
  addAcademicYear: (year: Omit<AcademicYear, "id" | "classesCount" | "studentsCount">) => void;
  toggleLockYear: (id: string) => void;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const [allYears, setAllYears] = useState<AcademicYear[]>(DEFAULT_ACADEMIC_YEARS);
  const [selectedYearId, setSelectedYearId] = useState<string>("ay-2026-27");

  useEffect(() => {
    const saved = localStorage.getItem("tutormate_selected_ay");
    if (saved && allYears.some((y) => y.id === saved)) {
      setSelectedYearId(saved);
    }
  }, [allYears]);

  const setSelectedYearById = (id: string) => {
    setSelectedYearId(id);
    localStorage.setItem("tutormate_selected_ay", id);
  };

  const addAcademicYear = (newYearData: Omit<AcademicYear, "id" | "classesCount" | "studentsCount">) => {
    const newYear: AcademicYear = {
      ...newYearData,
      id: `ay-${Date.now()}`,
      classesCount: 0,
      studentsCount: 0,
    };
    setAllYears((prev) => [newYear, ...prev]);
  };

  const toggleLockYear = (id: string) => {
    setAllYears((prev) =>
      prev.map((y) => (y.id === id ? { ...y, isLocked: !y.isLocked } : y))
    );
  };

  const selectedYear =
    allYears.find((y) => y.id === selectedYearId) || allYears[0] || DEFAULT_ACADEMIC_YEARS[0];

  return (
    <AcademicYearContext.Provider
      value={{
        selectedYear,
        allYears,
        setSelectedYearById,
        addAcademicYear,
        toggleLockYear,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error("useAcademicYear must be used within an AcademicYearProvider");
  }
  return context;
}
