"use client";

import { useState, useEffect } from "react";
import { getOnboardingStatus, saveOnboardingDismissed, getOnboardingDismissed } from "@/actions/dashboardActions";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  X,
  ChevronRight,
  Sparkles,
  Users,
  CalendarCheck,
  CreditCard,
  HelpCircle,
  UserCheck,
} from "lucide-react";

interface OnboardingChecklistProps {
  tutorName?: string;
}

const STORAGE_KEY = "tutormate_pilot_onboarding_state";
const DISMISSED_KEY = "tutormate_pilot_onboarding_dismissed";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: any;
}

const STEPS: ChecklistItem[] = [
  {
    id: "profile",
    label: "1. Complete Tutor Profile",
    description: "Update your name, institution, subject, and contact info.",
    href: "/tutor/settings",
    icon: UserCheck,
  },
  {
    id: "batch",
    label: "2. Create First Batch",
    description: "Define subject, grade/class, schedule, and monthly tuition fee.",
    href: "/tutor/batches",
    icon: Users,
  },
  {
    id: "invite",
    label: "3. Share Invite Code with Students",
    description: "Copy 6-digit invite code or add student emails manually.",
    href: "/tutor/students",
    icon: Users,
  },
  {
    id: "attendance",
    label: "4. Record First Attendance",
    description: "Mark Present/Absent status for your batch in one click.",
    href: "/tutor/attendance",
    icon: CalendarCheck,
  },
  {
    id: "fee",
    label: "5. Log Monthly Fee",
    description: "Track paid vs pending tuition fees per student.",
    href: "/tutor/fees",
    icon: CreditCard,
  },
  {
    id: "doubt",
    label: "6. Try Doubt Chat",
    description: "Resolve student questions via text, voice notes, or photos.",
    href: "/tutor/doubts",
    icon: HelpCircle,
  },
];

export function OnboardingChecklist({ tutorName }: OnboardingChecklistProps) {
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let isSubscribed = true;

    async function fetchStatus() {
      try {
        // 1. Check DB dismissal first (cross-device persistence)
        const dbDismissed = await getOnboardingDismissed();
        if (dbDismissed && isSubscribed) {
          setIsDismissed(true);
          // Also set localStorage so subsequent loads are instant
          localStorage.setItem(DISMISSED_KEY, "true");
          return;
        }

        // 2. Fallback: check localStorage for instant dismissal
        const savedDismissed = localStorage.getItem(DISMISSED_KEY);
        if (savedDismissed === "true" && isSubscribed) {
          setIsDismissed(true);
          return;
        }

        // 3. Fetch completion status from DB
        const status = await getOnboardingStatus();
        if (status && isSubscribed) {
          const savedState = localStorage.getItem(STORAGE_KEY);
          const currentSteps = savedState ? JSON.parse(savedState) : {};

          const mergedSteps = {
            ...currentSteps,
            profile: status.profile || currentSteps.profile,
            batch: status.batch || currentSteps.batch,
            invite: status.invite || currentSteps.invite,
            attendance: status.attendance || currentSteps.attendance,
            fee: status.fee || currentSteps.fee,
            doubt: status.doubt || currentSteps.doubt,
          };
          setCompletedSteps(mergedSteps);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedSteps));
        } else if (isSubscribed) {
          const savedState = localStorage.getItem(STORAGE_KEY);
          if (savedState) setCompletedSteps(JSON.parse(savedState));
        }
      } catch {
        if (isSubscribed) {
          // Fallback to localStorage on any network error
          const savedDismissed = localStorage.getItem(DISMISSED_KEY);
          if (savedDismissed === "true") { setIsDismissed(true); return; }
          const savedState = localStorage.getItem(STORAGE_KEY);
          if (savedState) setCompletedSteps(JSON.parse(savedState));
        }
      }
    }

    fetchStatus();

    return () => { isSubscribed = false; };
  }, []);

  const toggleStep = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = { ...completedSteps, [id]: !completedSteps[id] };
    setCompletedSteps(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const dismiss = () => {
    setIsDismissed(true);
    // Instant local dismissal so the UI responds immediately
    try { localStorage.setItem(DISMISSED_KEY, "true"); } catch {}
    // Persist to DB so it's cross-device
    saveOnboardingDismissed().catch(() => {
      // Non-blocking — localStorage already saved it
    });
  };

  if (!isMounted || isDismissed) return null;

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden border border-indigo-700/50">
      {/* Background Accent Blur */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[11px] font-medium tracking-wide">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Pilot Onboarding Guide</span>
          </div>
          <h2 className="text-lg font-extrabold text-white">
            Welcome to TutorMate{tutorName ? `, ${tutorName}` : ""}!
          </h2>
          <p className="text-xs text-indigo-200">
            Follow these 6 steps to start managing your tuition batches smoothly. <span className="font-medium text-emerald-200/90">(Auto-updates as you progress)</span>
          </p>
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss guide"
          className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-indigo-200">
          <span>Progress</span>
          <span>
            {completedCount} of {STEPS.length} Completed ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-indigo-950/60 rounded-full h-2 overflow-hidden border border-indigo-700/30">
          <div
            className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isDone = !!completedSteps[step.id];

          return (
            <div
              key={step.id}
              className={`flex items-start justify-between p-3 rounded-xl border transition-all duration-150 ${
                isDone
                  ? "bg-indigo-950/40 border-emerald-500/40 text-indigo-200"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
              }`}
            >
              <Link href={step.href} className="flex items-start gap-2.5 flex-1 pr-2 group">
                <button
                  type="button"
                  onClick={(e) => toggleStep(step.id, e)}
                  className="mt-0.5 shrink-0 focus:outline-hidden"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-950" />
                  ) : (
                    <Circle className="w-4 h-4 text-indigo-300 group-hover:text-white" />
                  )}
                </button>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold leading-snug">
                    <Icon className="w-3.5 h-3.5 text-indigo-300" />
                    <span className={isDone ? "line-through text-indigo-300" : "text-white"}>
                      {step.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-200/80 leading-tight">
                    {step.description}
                  </p>
                </div>
              </Link>

              <Link
                href={step.href}
                className="p-1 text-indigo-300 hover:text-white shrink-0 self-center"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
