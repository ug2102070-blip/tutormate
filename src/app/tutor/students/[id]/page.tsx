"use client";

import React, { useState, use } from "react";
import Link from "next/link";
import {
  GraduationCap,
  CalendarCheck,
  Award,
  CreditCard,
  User,
  Phone,
  FileText,
  MessageSquare,
  ShieldAlert,
  FolderArchive,
  Printer,
  Plus,
  Edit2,
  Camera,
  CheckCircle2,
  Calendar as CalendarIcon,
  X,
  Send,
  Download,
  Share2,
} from "lucide-react";
import ParentInviteSheet from "@/components/ui/ParentInviteSheet";

export default function Student360ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [activeTab, setActiveTab] = useState("overview");

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [showParentInvite, setShowParentInvite] = useState(false);

  // Student Mock State
  const student = {
    name: "Ali Khan",
    rollNo: "01",
    class: "Class 1-A",
    studentIdCode: "STU-2026-0001",
    admissionNo: "ADM-2020-1",
    dob: "2014-01-12",
    gender: "Male",
    bloodGroup: "A+",
    academicYear: "2026-27",
    guardianName: "Khan Sahib",
    guardianPhone: "0300 5550000",
    address: "Harappa Station, Sahiwal",
    attendanceRate: "95.8%",
    academicAverage: "70.7%",
    classRank: "#2",
    totalExams: 2,
    pendingFees: "৳0",
    overallGrade: "B",
    latestRemark: "Shows consistent progress and participates positively in class.",
    remarkAuthor: "Fatima Noor",
    remarkDate: "8/13/2026",
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "profile", label: "Profile" },
    { key: "attendance", label: "Attendance" },
    { key: "results", label: "Results" },
    { key: "assignments", label: "Assignments" },
    { key: "fees", label: "Fees" },
    { key: "behavior", label: "Behavior" },
    { key: "remarks", label: "Teacher Remarks" },
    { key: "documents", label: "Documents" },
    { key: "yearly", label: "Yearly Report" },
  ];

  // Results items
  const results = [
    { subject: "Computer Science", exam: "Awais Term", obtained: 40, total: 100, percent: "40%", grade: "F", color: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400" },
    { subject: "English", exam: "Mid Term", obtained: 81, total: 100, percent: "81%", grade: "A", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
    { subject: "Islamic Studies", exam: "Awais Term", obtained: 50, total: 100, percent: "50%", grade: "D", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" },
    { subject: "Mathematics", exam: "Mid Term", obtained: 76, total: 100, percent: "76%", grade: "B", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400" },
    { subject: "Science", exam: "Mid Term", obtained: 86, total: 100, percent: "86%", grade: "A", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
    { subject: "Urdu", exam: "Mid Term", obtained: 91, total: 100, percent: "91%", grade: "A+", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" },
  ];

  // Fee items
  const fees = [
    { type: "Tuition Fee", month: "August 2026", amount: "৳8,500", paid: "৳8,500", due: "2026-08-10", status: "paid" },
    { type: "Tuition Fee", month: "July 2026", amount: "৳8,500", paid: "৳8,500", due: "2026-07-10", status: "paid" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
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
        <Link href="/tutor/classes/class-1-a" className="hover:text-blue-600 transition-colors">
          Class 1-A
        </Link>
        <span>/</span>
        <span className="text-slate-600 dark:text-slate-300 font-semibold">{student.name}</span>
      </div>

      {/* Parent Invite Sheet */}
      {showParentInvite && (
        <ParentInviteSheet
          studentId={id}
          studentName={student.name}
          onClose={() => setShowParentInvite(false)}
        />
      )}

      {/* Student 360 Top Profile Banner */}
      <div
        className="p-5 sm:p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-black text-xl flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
            AK
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100">
                {student.name}
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                Active Student
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Roll No: {student.rollNo} | {student.class} | {student.studentIdCode}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button className="px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 shadow-xs">
            <Camera className="w-3.5 h-3.5 text-slate-400" />
            <span>Add Photo</span>
          </button>
          <button className="px-3 py-2 rounded-xl border text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5 shadow-xs">
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit Profile</span>
          </button>
          {/* Add Parent button */}
          <button
            onClick={() => setShowParentInvite(true)}
            className="px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            style={{
              borderColor: "rgba(99,102,241,0.3)",
              background: "rgba(99,102,241,0.08)",
              color: "rgb(99,102,241)",
            }}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Parent Invite</span>
          </button>
          <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20">
            Promote / Enroll
          </button>
        </div>
      </div>

      {/* 6 Personal Student KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400">Attendance</div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {student.attendanceRate}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Live database total</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400">Academic Average</div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {student.academicAverage}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Live database total</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400">Class Position</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {student.classRank}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Rank in Class 1-A</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400">Total Exams</div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {student.totalExams}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Live database total</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400">Pending Fees</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {student.pendingFees}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Live database total</div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold text-slate-400">Overall Grade</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {student.overallGrade}
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">Live database total</div>
        </div>
      </div>

      {/* Tab Navigation Strip */}
      <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === t.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Panel */}
      <div
        className="p-6 rounded-2xl border min-h-[300px]"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* 1. OVERVIEW & PROFILE TAB */}
        {(activeTab === "overview" || activeTab === "profile") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-5">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-3">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400">Full Name</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{student.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Date of Birth</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{student.dob}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Gender</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{student.gender}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Blood Group</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{student.bloodGroup}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Student ID</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{student.studentIdCode}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Admission No.</span>
                    <p className="font-bold text-slate-700 dark:text-slate-200">{student.admissionNo}</p>
                  </div>
                </div>
              </div>

              {activeTab === "profile" && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-3">
                    Guardian Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400">Guardian Name</span>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{student.guardianName}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Phone</span>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{student.guardianPhone}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Address</span>
                      <p className="font-bold text-slate-700 dark:text-slate-200">{student.address}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">Enrollment History</h4>
                <p className="text-slate-500 font-semibold">{student.academicYear}</p>
                <p className="text-slate-400 text-[11px]">{student.class} | Roll {student.rollNo}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">Latest Teacher Remark</h4>
                <p className="text-slate-600 dark:text-slate-300 italic text-[11px] leading-relaxed">
                  "{student.latestRemark}"
                </p>
                <div className="text-[10px] text-slate-400 mt-2 font-bold">{student.remarkAuthor}</div>
              </div>
            </div>
          </div>
        )}

        {/* 2. ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-1">
                Attendance Summary
              </h3>
              <p className="text-xs text-slate-400">Daily records grouped by month</p>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Present</th>
                    <th className="px-4 py-3">Absent</th>
                    <th className="px-4 py-3">Late</th>
                    <th className="px-4 py-3">Leave</th>
                    <th className="px-4 py-3">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  <tr>
                    <td className="px-4 py-3 font-bold">2026-07</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">22</td>
                    <td className="px-4 py-3 text-rose-600 font-bold">1</td>
                    <td className="px-4 py-3 text-amber-600 font-bold">1</td>
                    <td className="px-4 py-3 text-slate-400">0</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">95.8%</span>
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: "95.8%" }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Attendance Calendar Grid */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-200">
                  Calendar View — July 2026
                </h4>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-600">● Present</span>
                  <span className="flex items-center gap-1 text-rose-600">● Absent</span>
                  <span className="flex items-center gap-1 text-amber-600">● Late</span>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="font-bold text-slate-400 text-[11px] py-1">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <div
                    key={d}
                    className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col items-center justify-between min-h-[48px]"
                  >
                    <span className="text-[10px] font-bold text-slate-500">{d}</span>
                    <span className="text-[9px] font-bold text-emerald-600">Present</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. RESULTS TAB */}
        {activeTab === "results" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-1">
                Exams & Results
              </h3>
              <p className="text-xs text-slate-400">Subject-level academic performance</p>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Exam</th>
                    <th className="px-4 py-3">Obtained</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {results.map((r) => (
                    <tr key={r.subject}>
                      <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{r.subject}</td>
                      <td className="px-4 py-3 text-slate-500">{r.exam}</td>
                      <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{r.obtained}</td>
                      <td className="px-4 py-3 text-slate-500">{r.total}</td>
                      <td className="px-4 py-3 font-bold text-blue-600">{r.percent}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md font-black text-[10px] ${r.color}`}>
                          {r.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. FEES TAB */}
        {activeTab === "fees" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-1">
                  Fee History
                </h3>
                <p className="text-xs text-slate-400">Invoices, balances and payment status</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20"
              >
                Record Payment
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-extrabold">
                  <tr>
                    <th className="px-4 py-3">Fee Type</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {fees.map((f, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-bold">{f.type}</td>
                      <td className="px-4 py-3 text-slate-500">{f.month}</td>
                      <td className="px-4 py-3 font-bold">{f.amount}</td>
                      <td className="px-4 py-3 text-emerald-600 font-bold">{f.paid}</td>
                      <td className="px-4 py-3 text-slate-400">{f.due}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {f.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. BEHAVIOR TAB */}
        {activeTab === "behavior" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-1">
                  Behavior & Conduct
                </h3>
                <p className="text-xs text-slate-400">0 conduct records for this academic year</p>
              </div>
              <button
                onClick={() => setShowBehaviorModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              >
                + Add Record
              </button>
            </div>

            {/* 5 Rating Counter Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { count: 0, label: "Excellent", color: "text-emerald-600" },
                { count: 0, label: "Very Good", color: "text-blue-600" },
                { count: 0, label: "Good", color: "text-amber-600" },
                { count: 0, label: "Needs Improvement", color: "text-orange-600" },
                { count: 0, label: "Serious Concern", color: "text-rose-600" },
              ].map((c) => (
                <div key={c.label} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <div className={`text-xl font-black ${c.color}`}>{c.count}</div>
                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>

            <div className="py-8 text-center text-xs text-slate-400">
              No behavior records have been added.
            </div>
          </div>
        )}

        {/* 6. TEACHER REMARKS TAB */}
        {activeTab === "remarks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 mb-1">
                  Teacher Remarks
                </h3>
                <p className="text-xs text-slate-400">Academic observations & feedback</p>
              </div>
              <button
                onClick={() => setShowRemarkModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              >
                + Add Remark
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 font-black text-xs flex items-center justify-center shrink-0">
                TR
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {student.latestRemark}
                </p>
                <div className="text-[10px] text-slate-400 mt-1 font-bold">
                  {student.remarkAuthor} | {student.remarkDate}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. ASSIGNMENTS, DOCUMENTS & YEARLY REPORT */}
        {(activeTab === "assignments" || activeTab === "documents" || activeTab === "yearly") && (
          <div className="py-12 text-center text-xs text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-600 dark:text-slate-300">
              {activeTab === "assignments" && "No pending assignments recorded for this academic year."}
              {activeTab === "documents" && "0 student documents archived. Upload birth certificates or admission forms."}
              {activeTab === "yearly" && "Generate and print the complete annual academic report card."}
            </p>
            {activeTab === "yearly" && (
              <button className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md">
                Print Yearly Report Card
              </button>
            )}
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl border animate-scale-in space-y-4"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm">Record Fee Payment</h3>
              <button onClick={() => setShowPaymentModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Fee Type</label>
                <input type="text" defaultValue="Tuition Fee" className="w-full p-2 border rounded-xl bg-slate-50 dark:bg-slate-900" />
              </div>
              <div>
                <label className="block font-bold mb-1">Amount (৳)</label>
                <input type="number" defaultValue={8500} className="w-full p-2 border rounded-xl bg-slate-50 dark:bg-slate-900" />
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold"
              >
                Save Payment Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
