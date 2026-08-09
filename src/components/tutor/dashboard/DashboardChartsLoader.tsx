// Async Server Component — fetches chart data independently
// Wrapped in <Suspense> in dashboard/page.tsx so the page shell
// (metrics, quick actions) renders instantly while charts stream in.

import {
  getMonthlyIncomeChart,
  getFeeDistribution,
  getAttendanceTrend,
  getGradeDistribution,
  getDashboardMetrics,
} from "@/actions/analyticsActions";
import { DashboardCharts } from "@/components/tutor/dashboard/DashboardCharts";

export async function DashboardChartsLoader() {
  // All chart queries run in parallel on the server
  const [incomeData, feeDist, attendTrend, gradeDist, metrics] = await Promise.all([
    getMonthlyIncomeChart(6),
    getFeeDistribution(undefined, undefined),
    getAttendanceTrend(undefined),
    getGradeDistribution(),
    getDashboardMetrics(),
  ]);

  return (
    <DashboardCharts
      incomeData={incomeData}
      feeDist={feeDist}
      attendTrend={attendTrend}
      gradeDist={gradeDist}
      metrics={metrics}
    />
  );
}
