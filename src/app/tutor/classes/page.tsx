"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAcademicYear } from "@/context/AcademicYearContext";
import {
  Layers,
  Search,
  Plus,
  Edit2,
  ExternalLink,
  Trash2,
  Link as LinkIcon,
  ShieldCheck,
  Building,
  Users,
  X,
} from "lucide-react";

export interface ClassItem {
  id: string;
  name: string;
  section: string;
  room: string;
  academicYear: string;
  studentsCount: number;
  capacity: number;
  teachersCount: number;
  status: "active" | "inactive";
}

const INITIAL_CLASSES: ClassItem[] = [
  {
    id: "class-1-a",
    name: "Class 1-A",
    section: "A",
    room: "Room A-101",
    academicYear: "2026-27",
    studentsCount: 2,
    capacity: 40,
    teachersCount: 1,
    status: "active",
  },
  {
    id: "class-2-a",
    name: "Class 2-A",
    section: "A",
    room: "Room A-102",
    academicYear: "2026-27",
    studentsCount: 2,
    capacity: 40,
    teachersCount: 1,
    status: "active",
  },
  {
    id: "class-3-a",
    name: "Class 3-A",
    section: "A",
    room: "Room A-103",
    academicYear: "2026-27",
    studentsCount: 2,
    capacity: 40,
    teachersCount: 1,
    status: "active",
  },
  {
    id: "class-4-a",
    name: "Class 4-A",
    section: "A",
    room: "Room B-201",
    academicYear: "2026-27",
    studentsCount: 2,
    capacity: 40,
    teachersCount: 1,
    status: "active",
  },
  {
    id: "class-5-a",
    name: "Class 5-A",
    section: "A",
    room: "Room B-202",
    academicYear: "2026-27",
    studentsCount: 2,
    capacity: 40,
    teachersCount: 1,
    status: "active",
  },
  {
    id: "class-6-a",
    name: "Class 6-A",
    section: "A",
    room: "Room B-203",
    academicYear: "2026-27",
    studentsCount: 2,
    capacity: 40,
    teachersCount: 1,
    status: "active",
  },
];

export default function ClassesPage() {
  const { selectedYear } = useAcademicYear();
  const [classes, setClasses] = useState<ClassItem[]>(INITIAL_CLASSES);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [newClassName, setNewClassName] = useState("");
  const [newSection, setNewSection] = useState("A");
  const [newRoom, setNewRoom] = useState("");
  const [newCapacity, setNewCapacity] = useState(40);

  const filteredClasses = classes.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.room.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName) return;

    const newClass: ClassItem = {
      id: `class-${Date.now()}`,
      name: `${newClassName}-${newSection}`,
      section: newSection,
      room: newRoom || `Room A-${Math.floor(100 + Math.random() * 900)}`,
      academicYear: selectedYear.name,
      studentsCount: 0,
      capacity: Number(newCapacity) || 40,
      teachersCount: 1,
      status: "active",
    };

    setClasses((prev) => [...prev, newClass]);
    setShowAddModal(false);
    setNewClassName("");
    setNewSection("A");
    setNewRoom("");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/tutor/dashboard" className="hover:text-blue-600 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Classes & Sections</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            Classes & Sections
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Manage class offerings for the selected academic year ({selectedYear.name}).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class & Section</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search class, section or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border outline-hidden focus:border-blue-500 text-slate-800 dark:text-slate-200"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border text-slate-700 dark:text-slate-300 outline-hidden"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Classes Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Class & Section</th>
                <th className="px-5 py-3.5">Academic Year</th>
                <th className="px-5 py-3.5">Students / Capacity</th>
                <th className="px-5 py-3.5">Teachers</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredClasses.map((c, index) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 font-black flex items-center justify-center text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <Link
                          href={`/tutor/classes/${c.id}`}
                          className="font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 transition-colors"
                        >
                          {c.name}
                        </Link>
                        <div className="text-[11px] text-slate-400">{c.room}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-semibold">
                    {c.academicYear}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {c.studentsCount} / {c.capacity}
                      </span>
                      <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (c.studentsCount / c.capacity) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold">
                    {c.teachersCount}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-slate-400">
                      <Link
                        href={`/tutor/classes/${c.id}`}
                        className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        title="Open Class Hub"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        title="Edit Class"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                        title="Copy Link"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safe Record Management Banner */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100">
            Safe record management.
          </span>{" "}
          Classes with enrollments, teacher assignments, or exams cannot be deleted. Deactivation keeps history intact.
        </div>
      </div>

      {/* Add Class & Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-scale-in space-y-4"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
                Add Class & Section
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class Name (e.g. Class 7)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Class 7"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Section (e.g. A, B)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="A"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Room Number
                  </label>
                  <input
                    type="text"
                    placeholder="Room A-101"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Seat Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
