"use client";

/**
 * Lazy-loaded chart wrappers using Next.js dynamic import.
 * recharts (~500KB) is only downloaded when the user actually reaches a page
 * that contains a chart — dramatically reducing initial JS bundle size.
 */
import dynamic from "next/dynamic";
import { SkeletonBlock } from "@/components/ui/PageSkeleton";

const ChartSkeleton = () => (
  <SkeletonBlock className="w-full h-[200px] rounded-2xl" />
);

// Each chart loads independently — if only BarChart is on a page,
// the LineChart and DonutChart code is NOT downloaded.

export const LazyBarChart = dynamic(
  () => import("@/components/charts/BarChart").then((m) => ({ default: m.BarChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const LazyLineChart = dynamic(
  () => import("@/components/charts/LineChart").then((m) => ({ default: m.LineChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

export const LazyDonutChart = dynamic(
  () => import("@/components/charts/DonutChart").then((m) => ({ default: m.DonutChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
