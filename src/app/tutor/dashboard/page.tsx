// Server Component — no "use client" needed
// Data is fetched on the server before the page is sent to the browser.
// Metrics render instantly (via RPC), charts stream in via Suspense.

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardClientUI } from "./DashboardClientUI";
import { OnboardingChecklist } from "@/components/tutor/OnboardingChecklist";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getDashboardMetrics } from "@/actions/analyticsActions";
import { DashboardChartsLoader } from "@/components/tutor/dashboard/DashboardChartsLoader";
import { SkeletonBlock, PageLoadingSkeleton } from "@/components/ui/PageSkeleton";

export const dynamic = "force-dynamic";

export default async function TutorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const tutorName =
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Tutor";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/*
          Production optimization: Fetch metrics within a Suspense boundary
          so the layout shell (sidebar/nav) renders immediately.
      */}
      <Suspense fallback={<PageLoadingSkeleton cards={4} rows={0} />}>
        <DashboardMetricsWrapper tutorName={tutorName} userId={user.id} />
      </Suspense>

      {/* Onboarding Checklist — uses localStorage */}
      <OnboardingChecklist tutorName={tutorName} />

      {/* Analytics Charts — stream in after page shell via Suspense */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <SkeletonBlock className="lg:col-span-7 h-64 rounded-2xl" />
            <SkeletonBlock className="lg:col-span-5 h-64 rounded-2xl" />
          </div>
        }
      >
        <DashboardChartsLoader />
      </Suspense>
    </div>
  );
}

async function DashboardMetricsWrapper({ tutorName, userId }: { tutorName: string, userId: string }) {
  // RPC-backed metrics fetch (Fast: <100ms)
  const metrics = await getDashboardMetrics();

  return (
    <>
      <DashboardClientUI tutorName={tutorName} metrics={metrics} />
      <FeedbackWidget userId={userId} userRole="tutor" />
    </>
  );
}
