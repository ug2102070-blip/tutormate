"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Search,
  Plus,
  ArrowUpRight,
  Download,
  Upload,
  FileSpreadsheet,
  Edit2,
  ExternalLink,
  X,
  UserCheck,
} from "lucide-react";

export interface StudentCardData {
  id: string;
  name: string;
  rollNo: string;
  studentIdCode: string;
  class: string;
  attendanceRate: string;
  academicAverage: string;
  grade: string;
  status: "active" | "inactive";
  avatarInitials: string;
}

const INITIAL_STUDENTS: StudentCardData[] = [
  {
    id: "stu-1",
    name: "Ali Khan",
    rollNo: "01",
    studentIdCode: "STU-2026-0001",
    class: "Class 1-A",
    attendanceRate: "95.8%",
    academicAverage: "70.7%",
    grade: "B",
    status: "active",
    avatarInitials: "AK",
  },
  {
    id: "stu-2",
    name: "Usman Tariq",
    rollNo: "07",
    studentIdCode: "STU-2026-0007",
    class: "Class 1-A",
    attendanceRate: "98.5%",
    academicAverage: "90.5%",
    grade: "A+",
    status: "active",
    avatarInitials: "UT",
  },
  {
    id: "stu-3",
    name: "Sara Ahmed",
    rollNo: "02",
    studentIdCode: "STU-2026-0002",
    class: "Class 1-A",
    attendanceRate: "91.2%",
    academicAverage: "84.0%",
    grade: "A",
    status: "active",
    avatarInitials: "SA",
  },
];

export default function ClassStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const classDisplayName = id.split("-").map((w) => w.toUpperCase()).join(" ");

  const [students, setStudents] = useState<StudentCardData[]>(INITIAL_STUDENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Student Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [bloodGroup, setBloodGroup] = useState("A+");
  const [fatherName, setFatherName] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherName, setMotherName] = useState("");
  const [motherPhone, setMotherPhone] = useState("");

  const filteredStudents = students.filter((st) => {
    const matchSearch =
      st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.rollNo.includes(searchTerm) ||
      st.studentIdCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || st.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName) return;

    const fullName = `${firstName} ${lastName}`;
    const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
    const nextRoll = String(students.length + 1).padStart(2, "0");
    const code = `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newStudent: StudentCardData = {
      id: `stu-${Date.now()}`,
      name: fullName,
      rollNo: nextRoll,
      studentIdCode: code,
      class: classDisplayName,
      attendanceRate: "100%",
      academicAverage: "N/A",
      grade: "N/A",
      status: "active",
      avatarInitials: initials,
    };

    setStudents((prev) => [newStudent, ...prev]);
    setShowAddModal(false);
    setFirstName("");
    setLastName("");
    setDob("");
    setFatherName("");
    setFatherPhone("");
  };

  const handleExportCSV = () => {
    const headers = "Roll,Name,ID,Class,Attendance,Average,Grade,Status\n";
    const rows = students
      .map(
        (s) =>
          `${s.rollNo},"${s.name}",${s.studentIdCode},"${s.class}",${s.attendanceRate},${s.academicAverage},${s.grade},${s.status}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}-students.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/tutor/dashboard" className="hover:text-blue-600 transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/tutor/classes" className="hover:text-blue-600 transition-colors">
          Classes
        </Link>
        <span>/</span>
        <Link href={`/tutor/classes/${id}`} className="hover:text-blue-600 transition-colors">
          {classDisplayName}
        </Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300 font-semibold">Students</span>
      </div>

      {/* Header & Bulk Tools Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            {classDisplayName} Students
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Profiles, guardians and academic-year enrollment history.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 shadow-xs">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
            <span>Promote Class</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all active:scale-95 shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div
        className="p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, ID, roll, admission or guardian..."
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

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((st) => (
          <div
            key={st.id}
            className="p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 flex flex-col justify-between"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {/* Header: Avatar, Name, Roll & ID */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black text-sm flex items-center justify-center border border-blue-100 dark:border-blue-900">
                    {st.avatarInitials}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {st.name}
                    </h3>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Roll {st.rollNo} | {st.studentIdCode}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                  {st.status}
                </span>
              </div>

              {/* 2x2 Mini Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 mb-4 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Class</div>
                  <div className="font-bold text-slate-700 dark:text-slate-200">{st.class}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Attendance</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">{st.attendanceRate}</div>
                </div>
                <div className="mt-1">
                  <div className="text-[10px] text-slate-400">Academic Avg</div>
                  <div className="font-bold text-slate-700 dark:text-slate-200">{st.academicAverage}</div>
                </div>
                <div className="mt-1">
                  <div className="text-[10px] text-slate-400">Grade</div>
                  <div className="font-bold text-blue-600 dark:text-blue-400">{st.grade}</div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Link
                href={`/tutor/students/${st.id}`}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View Full Profile
              </Link>
              <div className="flex items-center gap-1.5 text-slate-400">
                <button className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <Link
                  href={`/tutor/students/${st.id}`}
                  className="p-1.5 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div
            className="w-full max-w-xl rounded-2xl p-6 shadow-2xl border animate-scale-in space-y-4 my-8"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold" style={{ color: "var(--color-text)" }}>
                Add Student Profile
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
              {/* Personal Information Header */}
              <div className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider">
                Personal Information
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Student ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value="STU-2026-8045 (Auto)"
                    className="w-full px-3 py-2 rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    National / Registration ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1998273648"
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ali"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Khan"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden focus:border-blue-500"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              {/* Parents & Guardian Section */}
              <div className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider pt-2 border-t border-slate-100 dark:border-slate-800">
                Parents & Guardian
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    placeholder="Khan Sahib"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Father's Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="0300 1234567"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-hidden"
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
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
