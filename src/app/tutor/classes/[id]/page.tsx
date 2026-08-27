"use client";

import React, { use } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  FileText,
  CreditCard,
  Clock,
  BarChart3,
  Sparkles,
  ArrowRight,
  BookOpen,
  UserCheck,
} from "lucide-react";

export default function ClassHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  // Format display name from ID
  const classDisplayName = id
    .split("-")
    .map((w) => w.toUpperCase())
    .join(" ");

  const classKpis = [
    { label: "Total Students", value: "2", subtitle: "Live database total", icon: GraduationCap },
    { label: "Total Teachers", value: "1", subtitle: "Live database total", icon: UserCheck },
    { label: "Today's Attendance", value: "95.8%", subtitle: "Live database total", icon: CalendarCheck },
    { label: "Average Attendance", value: "95.8%", subtitle: "Live database total", icon: CalendarCheck },
    { label: "Average Result", value: "80.6%", subtitle: "Live database total", icon: Award },
    { label: "Pending Fees", value: "৳0", subtitle: "Live database total", icon: CreditCard },
  ];

  const classModules = [
    {
      title: "Teachers",
      description: "Faculty and subject assignments",
      icon: Users,
      href: `/tutor/settings`,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/40",
    },
    {
      title: "Students",
      description: "Profiles, enrollment and records",
      icon: GraduationCap,
      href: `/tutor/classes/${id}/students`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      title: "Attendance",
      description: "Daily marking and history",
      icon: CalendarCheck,
      href: `/tutor/attendance/register/${id}`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: "Exams & Results",
      description: "Assessments, marks and grades",
      icon: Award,
      href: `/tutor/exams`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      title: "Assignments",
      description: "Classwork and submissions",
      icon: FileText,
      href: `/tutor/assignments`,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
    },
    {
      title: "Fees",
      description: "Invoices, payments and receipts",
      icon: CreditCard,
      href: `/tutor/fees`,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-950/40",
    },
    {
      title: "Timetable",
      description: "Weekly class schedule",
      icon: Clock,
      href: `/tutor/timetable`,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/40",
    },
    {
      title: "Reports",
      description: "Academic and yearly insights",
      icon: BarChart3,
      href: `/tutor/reports`,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-50 dark:bg-teal-950/40",
    },
  ];

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
        <span className="text-slate-600 dark:text-slate-300 font-semibold">{classDisplayName}</span>
      </div>

      {/* Top Hero Banner */}
      <div
        className="p-6 sm:p-8 rounded-2xl text-white relative overflow-hidden shadow-lg"
        style={{
          background: "linear-gradient(135deg, #0f2766 0%, #1e40af 100%)",
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
              {classDisplayName}
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 mt-1">
              Academic Year: 2026-27 | Room A-101
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            Active Class
          </span>
        </div>
      </div>

      {/* 6 Class Key Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {classKpis.map((kpi) => (
          <div
            key={kpi.label}
            className="p-4 rounded-2xl border flex flex-col justify-between"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 truncate">{kpi.label}</span>
              <div className="w-5 h-5 rounded-md bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <kpi.icon className="w-3 h-3" />
              </div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-black" style={{ color: "var(--color-text)" }}>
                {kpi.value}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{kpi.subtitle}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Class Management Hub Grid */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold" style={{ color: "var(--color-text)" }}>
            Class Management
          </h2>
          <p className="text-xs text-slate-400">Everything you need to manage {classDisplayName}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {classModules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.title}
                href={m.href}
                className="p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 dark:hover:border-blue-500 group flex flex-col justify-between min-h-[140px]"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${m.bg} ${m.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{m.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
