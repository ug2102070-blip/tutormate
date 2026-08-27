"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useAcademicYear } from "@/context/AcademicYearContext";
import {
  Clock,
  Printer,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Download,
  BookOpen,
  User,
  MapPin,
  Sparkles,
  Layers,
  Calendar,
  X,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Info,
  Database,
  Terminal,
  ExternalLink,
} from "lucide-react";
import {
  getTimetableData,
  saveTimetableSlot,
  deleteTimetableSlot,
  saveTimetableSettings,
  bulkSaveTimetable,
  copyTimetable,
  clearTimetable,
  type TimetableSlot,
  type TimetableResponse,
} from "@/actions/timetableActions";

// Preset Color Palettes for Subject Cards
const COLOR_VARIANTS: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    dot: string;
  }
> = {
  blue: {
    bg: "bg-blue-50/90 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900/60",
    text: "text-blue-700 dark:text-blue-300",
    badgeBg: "bg-blue-100/70 dark:bg-blue-900/50",
    dot: "bg-blue-500",
  },
  emerald: {
    bg: "bg-emerald-50/90 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900/60",
    text: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-100/70 dark:bg-emerald-900/50",
    dot: "bg-emerald-500",
  },
  purple: {
    bg: "bg-purple-50/90 dark:bg-purple-950/40",
    border: "border-purple-200 dark:border-purple-900/60",
    text: "text-purple-700 dark:text-purple-300",
    badgeBg: "bg-purple-100/70 dark:bg-purple-900/50",
    dot: "bg-purple-500",
  },
  amber: {
    bg: "bg-amber-50/90 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900/60",
    text: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-100/70 dark:bg-amber-900/50",
    dot: "bg-amber-500",
  },
  rose: {
    bg: "bg-rose-50/90 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-900/60",
    text: "text-rose-700 dark:text-rose-300",
    badgeBg: "bg-rose-100/70 dark:bg-rose-900/50",
    dot: "bg-rose-500",
  },
  cyan: {
    bg: "bg-cyan-50/90 dark:bg-cyan-950/40",
    border: "border-cyan-200 dark:border-cyan-900/60",
    text: "text-cyan-700 dark:text-cyan-300",
    badgeBg: "bg-cyan-100/70 dark:bg-cyan-900/50",
    dot: "bg-cyan-500",
  },
  indigo: {
    bg: "bg-indigo-50/90 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-900/60",
    text: "text-indigo-700 dark:text-indigo-300",
    badgeBg: "bg-indigo-100/70 dark:bg-indigo-900/50",
    dot: "bg-indigo-500",
  },
  teal: {
    bg: "bg-teal-50/90 dark:bg-teal-950/40",
    border: "border-teal-200 dark:border-teal-900/60",
    text: "text-teal-700 dark:text-teal-300",
    badgeBg: "bg-teal-100/70 dark:bg-teal-900/50",
    dot: "bg-teal-500",
  },
};

const SUGGESTED_SUBJECTS = [
  "Mathematics",
  "English",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Social Studies",
  "Islamic Studies",
  "Bangla",
  "Urdu",
  "Accounting",
  "Economics",
  "Physical Education",
  "Library / Activity",
];

const ALL_WEEK_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SQL_MIGRATION_SCRIPT = `-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026-27',
  day TEXT NOT NULL,
  period_index INT NOT NULL,
  period_time TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher TEXT,
  room TEXT,
  note TEXT,
  color TEXT DEFAULT 'blue',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  academic_year TEXT NOT NULL DEFAULT '2026-27',
  days JSONB NOT NULL DEFAULT '["Sunday","Monday","Tuesday","Wednesday","Thursday"]'::jsonb,
  periods JSONB NOT NULL DEFAULT '["08:00 - 08:45 AM","08:45 - 09:30 AM","09:45 - 10:30 AM","10:30 - 11:15 AM","11:30 - 12:15 PM"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tutor_id, class_id, academic_year)
);

ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timetables_tutor_all" ON public.timetables FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "timetable_settings_tutor_all" ON public.timetable_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;

export default function TimetableManagementPage() {
  const { selectedYear } = useAcademicYear();
  const [selectedClass, setSelectedClass] = useState("class-1-a");
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDismissedSqlBanner, setIsDismissedSqlBanner] = useState(false);
  const [isCopiedSql, setIsCopiedSql] = useState(false);

  // Local storage cache for offline/pending-migration seamless persistence
  const [localSlots, setLocalSlots] = useState<Record<string, TimetableSlot>>({});

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Active Slot Being Edited or Created
  const [editingSlot, setEditingSlot] = useState<{
    id?: string;
    day: string;
    periodIndex: number;
    periodTime: string;
    subject: string;
    teacher: string;
    room: string;
    note: string;
    color: string;
  } | null>(null);

  // Settings Draft State
  const [settingsDraft, setSettingsDraft] = useState<{
    days: string[];
    periods: string[];
  }>({
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    periods: [
      "08:00 - 08:45 AM",
      "08:45 - 09:30 AM",
      "09:45 - 10:30 AM",
      "10:30 - 11:15 AM",
      "11:30 - 12:15 PM",
    ],
  });

  // Copy Draft State
  const [copySourceClass, setCopySourceClass] = useState("class-1-a");

  // Load client-side local storage backup
  const storageKey = `tutormate_tt_${selectedClass}_${selectedYear.name}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setLocalSlots(JSON.parse(saved));
      } else {
        setLocalSlots({});
      }
    } catch (e) {
      console.warn("Could not read from local storage", e);
    }
  }, [storageKey]);

  // Sync to local storage
  const saveToLocalStorage = (updatedSlots: Record<string, TimetableSlot>) => {
    setLocalSlots(updatedSlots);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedSlots));
    } catch (e) {
      console.warn("Could not save to local storage", e);
    }
  };

  // Fetch timetable data via SWR
  const swrKey = `timetable-${selectedClass}-${selectedYear.name}`;
  const {
    data,
    isLoading,
    mutate,
  } = useSWR<TimetableResponse>(
    swrKey,
    () => getTimetableData(selectedClass, selectedYear.name),
    {
      revalidateOnFocus: false,
      dedupingInterval: 15_000,
    }
  );

  const days = data?.settings?.days || settingsDraft.days;
  const periods = data?.settings?.periods || settingsDraft.periods;
  const serverSlots = data?.slots || [];
  const availableClasses = data?.availableClasses || [
    { id: "class-1-a", name: "Class 1-A (Room A-101)", type: "class" },
    { id: "class-2-a", name: "Class 2-A (Room A-102)", type: "class" },
    { id: "class-3-a", name: "Class 3-A (Room A-103)", type: "class" },
  ];
  const conflicts = data?.conflicts || [];
  const tableExists = data?.tableExists !== false;

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Merge server slots with any local slots
  const slotMap = useMemo(() => {
    const map: Record<string, TimetableSlot> = {};
    for (const slot of serverSlots) {
      map[`${slot.day}-${slot.periodIndex}`] = slot;
    }
    // Overlay any local changes
    for (const key of Object.keys(localSlots)) {
      if (localSlots[key]) {
        map[key] = localSlots[key];
      } else {
        delete map[key];
      }
    }
    return map;
  }, [serverSlots, localSlots]);

  const slotsList = useMemo(() => Object.values(slotMap), [slotMap]);

  // Build conflict map
  const conflictMap = useMemo(() => {
    const map: Record<string, (typeof conflicts)[0]> = {};
    for (const c of conflicts) {
      map[`${c.day}-${c.periodIndex}`] = c;
    }
    return map;
  }, [conflicts]);

  // Statistics calculation
  const totalSlotsScheduled = slotsList.length;
  const uniqueSubjects = useMemo(() => {
    const set = new Set(slotsList.map((s) => s.subject).filter(Boolean));
    return set.size;
  }, [slotsList]);
  const activeTeachers = useMemo(() => {
    const set = new Set(slotsList.map((s) => s.teacher).filter(Boolean));
    return set.size;
  }, [slotsList]);

  // Handle open add / edit modal
  const handleOpenSlotModal = (
    day: string,
    periodIndex: number,
    periodTime: string,
    existingSlot?: TimetableSlot
  ) => {
    if (existingSlot) {
      setEditingSlot({
        id: existingSlot.id,
        day: existingSlot.day,
        periodIndex: existingSlot.periodIndex,
        periodTime: existingSlot.periodTime,
        subject: existingSlot.subject,
        teacher: existingSlot.teacher || "",
        room: existingSlot.room || "",
        note: existingSlot.note || "",
        color: existingSlot.color || "blue",
      });
    } else {
      setEditingSlot({
        day,
        periodIndex,
        periodTime,
        subject: "",
        teacher: "",
        room: selectedClass.startsWith("class-")
          ? `Room A-${100 + parseInt(selectedClass.replace(/\D/g, "") || "1")}`
          : "Room A-101",
        note: "",
        color: "blue",
      });
    }
    setIsEditModalOpen(true);
  };

  // Handle save slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !editingSlot.subject.trim()) return;

    const newSlot: TimetableSlot = {
      id: editingSlot.id || `slot-${Date.now()}`,
      classId: selectedClass,
      academicYear: selectedYear.name,
      day: editingSlot.day,
      periodIndex: editingSlot.periodIndex,
      periodTime: editingSlot.periodTime,
      subject: editingSlot.subject.trim(),
      teacher: editingSlot.teacher.trim(),
      room: editingSlot.room.trim(),
      note: editingSlot.note.trim(),
      color: editingSlot.color,
    };

    // Instant optimistic update
    const nextMap = { ...localSlots, [`${editingSlot.day}-${editingSlot.periodIndex}`]: newSlot };
    saveToLocalStorage(nextMap);

    setIsEditModalOpen(false);
    showToast("Period slot saved successfully!");

    startTransition(async () => {
      try {
        const res = await saveTimetableSlot({
          id: editingSlot.id,
          classId: selectedClass,
          academicYear: selectedYear.name,
          day: editingSlot.day,
          periodIndex: editingSlot.periodIndex,
          periodTime: editingSlot.periodTime,
          subject: editingSlot.subject.trim(),
          teacher: editingSlot.teacher.trim(),
          room: editingSlot.room.trim(),
          note: editingSlot.note.trim(),
          color: editingSlot.color,
        });

        if (res.isLocalFallback) {
          showToast("Saved locally (Run Supabase SQL migration for permanent cloud sync)");
        }
        mutate();
      } catch (err: any) {
        console.warn("Could not save to Supabase, retained in local storage:", err);
      }
    });
  };

  // Handle delete slot
  const handleDeleteSlot = async (
    slotId: string,
    day: string,
    periodIndex: number
  ) => {
    if (!confirm("Are you sure you want to clear this period slot?")) return;

    // Remove from local storage
    const nextMap = { ...localSlots };
    delete nextMap[`${day}-${periodIndex}`];
    saveToLocalStorage(nextMap);
    showToast("Period slot cleared!");

    startTransition(async () => {
      try {
        await deleteTimetableSlot(
          slotId || "",
          selectedClass,
          selectedYear.name,
          day,
          periodIndex
        );
        mutate();
      } catch (err: any) {
        console.warn("Delete server action error:", err);
      }
    });
  };

  // Handle duplicate slot to next period
  const handleQuickDuplicateSlot = async (slot: TimetableSlot) => {
    const nextPeriodIndex = (slot.periodIndex + 1) % periods.length;
    const duplicatedSlot: TimetableSlot = {
      ...slot,
      id: `slot-dup-${Date.now()}`,
      periodIndex: nextPeriodIndex,
      periodTime: periods[nextPeriodIndex],
    };

    const nextMap = {
      ...localSlots,
      [`${slot.day}-${nextPeriodIndex}`]: duplicatedSlot,
    };
    saveToLocalStorage(nextMap);
    showToast(`Duplicated to Period ${nextPeriodIndex + 1}!`);

    startTransition(async () => {
      try {
        await saveTimetableSlot({
          classId: selectedClass,
          academicYear: selectedYear.name,
          day: slot.day,
          periodIndex: nextPeriodIndex,
          periodTime: periods[nextPeriodIndex],
          subject: slot.subject,
          teacher: slot.teacher || "",
          room: slot.room || "",
          note: slot.note || "",
          color: slot.color || "blue",
        });
        mutate();
      } catch (err: any) {
        console.warn("Duplicate server action error:", err);
      }
    });
  };

  // Handle open Settings modal
  const handleOpenSettings = () => {
    setSettingsDraft({
      days: [...days],
      periods: [...periods],
    });
    setIsSettingsModalOpen(true);
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    if (settingsDraft.days.length === 0) {
      alert("Please select at least one active day.");
      return;
    }
    if (settingsDraft.periods.length === 0) {
      alert("Please specify at least one period.");
      return;
    }

    setIsSettingsModalOpen(false);
    showToast("Timetable settings updated!");

    startTransition(async () => {
      try {
        await saveTimetableSettings({
          classId: selectedClass,
          academicYear: selectedYear.name,
          days: settingsDraft.days,
          periods: settingsDraft.periods,
        });
        mutate();
      } catch (err: any) {
        console.warn("Save settings server error:", err);
      }
    });
  };

  // Handle copy routine from another class
  const handleCopyFromClass = async () => {
    if (copySourceClass === selectedClass) {
      alert("Please select a different class to copy from.");
      return;
    }
    if (
      !confirm(
        `This will replace current routine with the timetable from ${
          availableClasses.find((c) => c.id === copySourceClass)?.name ||
          copySourceClass
        }. Proceed?`
      )
    ) {
      return;
    }

    setIsCopyModalOpen(false);
    showToast("Timetable copied!");

    startTransition(async () => {
      try {
        await copyTimetable(copySourceClass, selectedClass, selectedYear.name);
        mutate();
      } catch (err: any) {
        console.warn("Copy timetable error:", err);
      }
    });
  };

  // Handle Preset Template Application
  const handleApplyPresetTemplate = async (type: "school" | "coaching" | "weekend") => {
    if (!confirm(`Apply the ${type.toUpperCase()} preset template to ${selectedClass}? This will replace current slots.`)) {
      return;
    }

    let presetDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    let presetPeriods = [
      "08:00 - 08:45 AM",
      "08:45 - 09:30 AM",
      "09:45 - 10:30 AM",
      "10:30 - 11:15 AM",
      "11:30 - 12:15 PM",
    ];
    let presetSlots: TimetableSlot[] = [];

    if (type === "school") {
      const schoolSubjects = ["Mathematics", "English", "Science", "Social Studies", "Islamic Studies"];
      presetDays.forEach((day, dIdx) => {
        presetPeriods.forEach((pTime, pIdx) => {
          const sub = schoolSubjects[(dIdx + pIdx) % schoolSubjects.length];
          presetSlots.push({
            id: `seed-${day}-${pIdx}`,
            classId: selectedClass,
            academicYear: selectedYear.name,
            day,
            periodIndex: pIdx,
            periodTime: pTime,
            subject: sub,
            teacher: sub === "Mathematics" ? "Fatima Noor" : sub === "English" ? "Ahmed Raza" : "Sana Malik",
            room: "Room A-101",
            color: sub === "Mathematics" ? "blue" : sub === "English" ? "purple" : "emerald",
            note: "",
          });
        });
      });
    } else if (type === "coaching") {
      presetPeriods = ["04:00 - 05:00 PM", "05:15 - 06:15 PM", "06:30 - 07:30 PM"];
      const coachingSubjects = ["Physics Intensive", "Higher Math Masterclass", "Chemistry Theory"];
      presetDays.forEach((day, dIdx) => {
        presetPeriods.forEach((pTime, pIdx) => {
          const sub = coachingSubjects[(dIdx + pIdx) % coachingSubjects.length];
          presetSlots.push({
            id: `seed-${day}-${pIdx}`,
            classId: selectedClass,
            academicYear: selectedYear.name,
            day,
            periodIndex: pIdx,
            periodTime: pTime,
            subject: sub,
            teacher: "Senior Instructor",
            room: "Main Auditorium",
            color: pIdx === 0 ? "rose" : pIdx === 1 ? "indigo" : "cyan",
            note: "Problem solving session",
          });
        });
      });
    } else if (type === "weekend") {
      presetDays = ["Friday", "Saturday"];
      presetPeriods = ["09:00 - 10:30 AM", "10:45 - 12:15 PM", "02:30 - 04:00 PM"];
      const weekendSubjects = ["Model Test & Review", "Special Olympiad Math", "Creative ICT Lab"];
      presetDays.forEach((day) => {
        presetPeriods.forEach((pTime, pIdx) => {
          presetSlots.push({
            id: `seed-${day}-${pIdx}`,
            classId: selectedClass,
            academicYear: selectedYear.name,
            day,
            periodIndex: pIdx,
            periodTime: pTime,
            subject: weekendSubjects[pIdx],
            teacher: "Lead Mentor",
            room: "Lab-1",
            color: "amber",
            note: "Bring workbook",
          });
        });
      });
    }

    // Save to local storage
    const newMap: Record<string, TimetableSlot> = {};
    presetSlots.forEach((s) => {
      newMap[`${s.day}-${s.periodIndex}`] = s;
    });
    saveToLocalStorage(newMap);

    setIsTemplateModalOpen(false);
    showToast("Preset template applied successfully!");

    startTransition(async () => {
      try {
        await bulkSaveTimetable(
          selectedClass,
          selectedYear.name,
          presetSlots.map((s) => ({
            ...s,
            note: s.note || "",
            color: s.color || "blue",
          })),
          { days: presetDays, periods: presetPeriods }
        );
        mutate();
      } catch (err: any) {
        console.warn("Preset template save error:", err);
      }
    });
  };

  // Handle Clear All Slots
  const handleClearAll = async () => {
    if (!confirm(`Are you sure you want to clear ALL slots for ${selectedClass}? This cannot be undone.`)) {
      return;
    }
    saveToLocalStorage({});
    showToast("Timetable cleared!");

    startTransition(async () => {
      try {
        await clearTimetable(selectedClass, selectedYear.name);
        mutate();
      } catch (err: any) {
        console.warn("Clear timetable error:", err);
      }
    });
  };

  // Handle Export to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Class,${availableClasses.find((c) => c.id === selectedClass)?.name || selectedClass}\n`;
    csvContent += `Academic Year,${selectedYear.name}\n\n`;

    // Header row
    csvContent += ["Day", ...periods.map((p, idx) => `Period ${idx + 1} (${p})`)].join(",") + "\n";

    // Data rows
    days.forEach((day) => {
      const row = [day];
      periods.forEach((_, pIdx) => {
        const slot = slotMap[`${day}-${pIdx}`];
        if (slot) {
          const detail = `"${slot.subject} | ${slot.teacher || "N/A"} | ${slot.room || "N/A"}"`;
          row.push(detail);
        } else {
          row.push('""');
        }
      });
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timetable_${selectedClass}_${selectedYear.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV timetable exported!");
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_MIGRATION_SCRIPT);
    setIsCopiedSql(true);
    showToast("Supabase SQL script copied to clipboard!");
    setTimeout(() => setIsCopiedSql(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentClassName =
    availableClasses.find((c) => c.id === selectedClass)?.name || selectedClass;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-white/10 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Supabase Database Setup Helper Banner (Shown if table not run in Supabase yet) */}
      {!tableExists && !isDismissedSqlBanner && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs print:hidden animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>Supabase Table Migration Pending</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                  Local Mode Active
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                Your timetable edits are currently saved in your browser local storage. Run the SQL script in your Supabase SQL Editor to enable permanent cloud sync across all devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              onClick={handleCopySql}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isCopiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopiedSql ? "Copied!" : "Copy SQL Script"}</span>
            </button>
            <button
              onClick={() => setIsDismissedSqlBanner(true)}
              className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link
              href="/tutor/dashboard"
              className="hover:text-blue-600 transition-colors"
            >
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">
              Timetable
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              Timetable Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
              {selectedYear.name}
            </span>
          </div>
          <p
            className="text-xs sm:text-sm mt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            Design, edit, and organize weekly conflict-free schedules for all classes & coaching batches.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Templates */}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Load preset routine template"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {/* Copy from another class */}
          <button
            onClick={() => setIsCopyModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Copy timetable from another class"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Copy Routine</span>
          </button>

          {/* Settings: Configure Periods & Days */}
          <button
            onClick={handleOpenSettings}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Configure active days and period timings"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Customize Slots</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Export as CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">CSV</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Timetable</span>
          </button>
        </div>
      </div>

      {/* KPI & Class Selection Bar */}
      <div
        className="p-4 sm:p-5 rounded-2xl border flex flex-col lg:flex-row lg:items-center justify-between gap-5 print:hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Class Selector Dropdown */}
        <div className="w-full lg:w-80">
          <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>Active Class / Batch</span>
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-100 outline-hidden font-bold transition-colors cursor-pointer hover:border-blue-400"
            style={{ borderColor: "var(--color-border)" }}
          >
            <optgroup label="Standard School Classes">
              {availableClasses
                .filter((c) => c.type === "class")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
            {availableClasses.some((c) => c.type === "batch") && (
              <optgroup label="Custom Coaching Batches">
                {availableClasses
                  .filter((c) => c.type === "batch")
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Live Summary Metrics */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-black text-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">Total Periods</div>
              <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                {totalSlotsScheduled} <span className="text-[10px] font-normal text-slate-400">classes/wk</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-black text-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">Subjects</div>
              <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                {uniqueSubjects} <span className="text-[10px] font-normal text-slate-400">distinct</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-black text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400">Teachers</div>
              <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                {activeTeachers} <span className="text-[10px] font-normal text-slate-400">assigned</span>
              </div>
            </div>
          </div>

          {/* Conflict Warning Indicator */}
          {conflicts.length > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-[11px] font-bold">
                {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""} Detected
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-bold">Conflict-Free</span>
            </div>
          )}
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h2 className="text-2xl font-black tracking-tight">TutorMate Academic Routine</h2>
        <div className="text-sm font-bold text-slate-700 mt-1">
          Class: {currentClassName} | Academic Year: {selectedYear.name}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          Generated on {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
        </div>
      </div>

      {/* Weekly Schedule Grid Table */}
      <div
        className="rounded-2xl border overflow-hidden transition-all"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {isLoading ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Loading weekly routine...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-4 w-32 border-r border-slate-100 dark:border-slate-800">
                    Day
                  </th>
                  {periods.map((p, idx) => (
                    <th
                      key={p + idx}
                      className="px-4 py-3.5 min-w-[170px] border-r border-slate-100 dark:border-slate-800 last:border-r-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-800 dark:text-slate-200 font-black">
                          Period {idx + 1}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {p.split("-")[0]?.trim()}
                        </span>
                      </div>
                      <span className="block text-[9px] font-medium text-slate-400 mt-0.5">
                        {p}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {days.map((day) => (
                  <tr
                    key={day}
                    className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-5 py-4 font-black text-slate-800 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span>{day}</span>
                      </div>
                    </td>

                    {periods.map((pTime, pIdx) => {
                      const slot = slotMap[`${day}-${pIdx}`];
                      const conflict = conflictMap[`${day}-${pIdx}`];
                      const colorTheme =
                        COLOR_VARIANTS[slot?.color || "blue"] || COLOR_VARIANTS.blue;

                      return (
                        <td
                          key={pIdx}
                          className="px-3 py-3 border-r border-slate-100 dark:border-slate-800 last:border-r-0 align-top"
                        >
                          {slot ? (
                            <div
                              className={`p-3 rounded-xl border relative group transition-all hover:shadow-md ${colorTheme.bg} ${colorTheme.border} ${
                                conflict
                                  ? "ring-2 ring-amber-400 dark:ring-amber-500 border-amber-300"
                                  : ""
                              }`}
                            >
                              {/* Conflict Badge */}
                              {conflict && (
                                <div
                                  className="mb-1.5 px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 text-[9px] font-black flex items-center gap-1 cursor-help"
                                  title={`Double booking warning: ${
                                    conflict.teacher
                                      ? `Teacher ${conflict.teacher}`
                                      : `Room ${conflict.room}`
                                  } is also assigned to ${conflict.conflictingClassName}!`}
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span className="truncate">Conflict: {conflict.conflictingClassName}</span>
                                </div>
                              )}

                              {/* Subject Header */}
                              <div className="flex items-start justify-between gap-1">
                                <div
                                  className={`font-black text-xs truncate ${colorTheme.text}`}
                                >
                                  {slot.subject}
                                </div>
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 mt-1 ${colorTheme.dot}`}
                                />
                              </div>

                              {/* Teacher Info */}
                              {slot.teacher && (
                                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-1 truncate">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{slot.teacher}</span>
                                </div>
                              )}

                              {/* Room & Note */}
                              <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400 font-mono mt-1">
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                  {slot.room || "Room A-101"}
                                </span>
                                {slot.note && (
                                  <span
                                    className="text-[9px] font-sans text-blue-500 cursor-pointer"
                                    title={slot.note}
                                  >
                                    <Info className="w-3 h-3" />
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons Overlay (Hidden during print) */}
                              <div className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 p-1 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 print:hidden z-10">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenSlotModal(day, pIdx, pTime, slot)
                                  }
                                  className="p-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                  title="Edit slot"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickDuplicateSlot(slot)}
                                  className="p-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                  title="Duplicate to next slot"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteSlot(slot.id, day, pIdx)
                                  }
                                  className="p-1 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                                  title="Clear slot"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Empty Slot Placeholder */
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSlotModal(day, pIdx, pTime)
                              }
                              className="w-full h-24 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 text-slate-300 dark:text-slate-700 hover:text-blue-600 dark:hover:text-blue-400 flex flex-col items-center justify-center gap-1 transition-all group cursor-pointer print:hidden"
                              title="Click to assign class"
                            >
                              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform text-slate-400" />
                              <span className="text-[10px] font-bold">
                                Add Class
                              </span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info inside table card */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Hover on any populated period to edit, clone, or delete.</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleClearAll}
              className="text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Entire Routine</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODAL: ADD / EDIT PERIOD SLOT */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 relative space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                {editingSlot.day} • Period {editingSlot.periodIndex + 1} ({editingSlot.periodTime})
              </div>
              <h2 className="text-xl font-black tracking-tight mt-0.5" style={{ color: "var(--color-text)" }}>
                {editingSlot.id ? "Edit Period Slot" : "Assign Class Period"}
              </h2>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              {/* Subject Input + Quick Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Subject Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, Science, English..."
                  value={editingSlot.subject}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, subject: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-100 outline-hidden font-bold focus:border-blue-500"
                  style={{ borderColor: "var(--color-border)" }}
                />
                {/* Quick Subject Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUGGESTED_SUBJECTS.slice(0, 8).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setEditingSlot({ ...editingSlot, subject: sub })}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Teacher & Room Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Teacher / Faculty
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fatima Noor"
                    value={editingSlot.teacher}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, teacher: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-100 outline-hidden font-medium focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Room / Lab Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room A-101 or Lab-1"
                    value={editingSlot.room}
                    onChange={(e) =>
                      setEditingSlot({ ...editingSlot, room: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-100 outline-hidden font-medium focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  Card Color Theme
                </label>
                <div className="flex items-center gap-2">
                  {Object.keys(COLOR_VARIANTS).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setEditingSlot({ ...editingSlot, color: col })}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                        COLOR_VARIANTS[col].bg
                      } ${COLOR_VARIANTS[col].border} border-2 ${
                        editingSlot.color === col
                          ? "ring-2 ring-blue-500 scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      {editingSlot.color === col && (
                        <Check className={`w-3.5 h-3.5 ${COLOR_VARIANTS[col].text}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Topic or Special Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bring scientific calculator / Chapter 4 Test"
                  value={editingSlot.note}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, note: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-100 outline-hidden font-medium"
                  style={{ borderColor: "var(--color-border)" }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isPending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Save Period</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODAL: CUSTOMIZE PERIOD TIMINGS & ACTIVE DAYS */}
      {/* ========================================================================= */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 relative space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <button
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--color-text)" }}>
                Customize Routine Structure
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure active days of the week and customize period timing ranges for {currentClassName}.
              </p>
            </div>

            {/* Active Working Days */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                Active Working Days
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ALL_WEEK_DAYS.map((day) => {
                  const isChecked = settingsDraft.days.includes(day);
                  return (
                    <label
                      key={day}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isChecked
                          ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 text-blue-700 dark:text-blue-300"
                          : "border-slate-200 dark:border-slate-800 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSettingsDraft({
                              ...settingsDraft,
                              days: settingsDraft.days.filter((d) => d !== day),
                            });
                          } else {
                            setSettingsDraft({
                              ...settingsDraft,
                              days: [...settingsDraft.days, day],
                            });
                          }
                        }}
                        className="rounded text-blue-600"
                      />
                      <span>{day}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Periods Timings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                  Periods & Timing Slots ({settingsDraft.periods.length})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsDraft({
                      ...settingsDraft,
                      periods: [...settingsDraft.periods, "12:30 - 01:15 PM"],
                    });
                  }}
                  className="text-[11px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Period</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {settingsDraft.periods.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-16 text-[11px] font-bold text-slate-400 shrink-0">
                      Period {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={p}
                      onChange={(e) => {
                        const newPeriods = [...settingsDraft.periods];
                        newPeriods[idx] = e.target.value;
                        setSettingsDraft({ ...settingsDraft, periods: newPeriods });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-100 outline-hidden font-mono font-medium"
                      style={{ borderColor: "var(--color-border)" }}
                    />
                    {settingsDraft.periods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettingsDraft({
                            ...settingsDraft,
                            periods: settingsDraft.periods.filter((_, i) => i !== idx),
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Remove period"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Apply Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL: COPY TIMETABLE FROM ANOTHER CLASS */}
      {/* ========================================================================= */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6 relative space-y-5 animate-in zoom-in-95 duration-200"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <button
              onClick={() => setIsCopyModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--color-text)" }}>
                Copy Timetable
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Duplicate all slots and period structures from another class into <strong>{currentClassName}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Source Class to Copy From:
              </label>
              <select
                value={copySourceClass}
                onChange={(e) => setCopySourceClass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-800 dark:text-slate-100 outline-hidden font-bold"
                style={{ borderColor: "var(--color-border)" }}
              >
                {availableClasses
                  .filter((c) => c.id !== selectedClass)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                Note: This will overwrite any existing periods in {currentClassName}.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCopyFromClass}
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>Copy Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: PRESET TEMPLATES */}
      {/* ========================================================================= */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 relative space-y-5 animate-in zoom-in-95 duration-200"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <button
              onClick={() => setIsTemplateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--color-text)" }}>
                Load Routine Template
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Instantly populate {currentClassName} with a balanced, pre-configured academic schedule.
              </p>
            </div>

            <div className="space-y-3">
              {/* Template 1 */}
              <div
                onClick={() => handleApplyPresetTemplate("school")}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span>Standard Primary / High School</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    5 Daily Periods (08:00 AM - 12:15 PM) • Sun-Thu • Core Science & Math subjects
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Template 2 */}
              <div
                onClick={() => handleApplyPresetTemplate("coaching")}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>Evening Coaching Intensive</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    3 Intensive Slots (04:00 PM - 07:30 PM) • Problem-solving & masterclasses
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Template 3 */}
              <div
                onClick={() => handleApplyPresetTemplate("weekend")}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 group-hover:text-amber-600 transition-colors flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>Weekend Olympiad & Model Test</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Friday & Saturday special slots • Lab & assessment focused
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
