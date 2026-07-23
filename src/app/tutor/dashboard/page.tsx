"use client";

import { useAuth } from "@/hooks/useAuth";
import { Users, GraduationCap, CalendarCheck, CreditCard, HelpCircle } from "lucide-react";

export default function TutorDashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: "Active Batches", value: "0", icon: Users, color: "var(--color-primary)" },
    { label: "Total Students", value: "0", icon: GraduationCap, color: "var(--color-accent)" },
    { label: "Today's Attendance", value: "0 / 0", icon: CalendarCheck, color: "var(--color-success)" },
    { label: "Pending Doubts", value: "0", icon: HelpCircle, color: "var(--color-warning)" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        className="p-6 rounded-2xl text-white relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 50%, var(--color-accent-dark) 100%)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.displayName || "Tutor"} 👋
          </h1>
          <p className="mt-1 text-white/80 text-sm max-w-xl">
            Here is an overview of your batches, attendance logs, and student questions for today.
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-5 rounded-xl border transition-all duration-200 hover:shadow-md"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {stat.label}
                </span>
                <div
                  className="p-2 rounded-lg"
                  style={{
                    backgroundColor: "var(--color-bg-secondary)",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </div>
              <div
                className="mt-3 text-2xl font-bold tracking-tight"
                style={{ color: "var(--color-text)" }}
              >
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Batches Card */}
        <div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Recent Batches
            </h3>
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              View all
            </span>
          </div>
          <div
            className="py-12 text-center text-sm rounded-lg border border-dashed"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            No batches created yet. Go to <strong className="text-[var(--color-text)]">Batches</strong> to create your first batch.
          </div>
        </div>

        {/* Pending Doubts Card */}
        <div
          className="p-6 rounded-xl border"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-base font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              Ask Your Teacher — Pending Doubts
            </h3>
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              View all
            </span>
          </div>
          <div
            className="py-12 text-center text-sm rounded-lg border border-dashed"
            style={{
              borderColor: "var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            No pending questions from students right now.
          </div>
        </div>
      </div>
    </div>
  );
}
