"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentDoubtDetailPage({
  params,
}: {
  params: Promise<{ doubtId: string }>;
}) {
  const { doubtId } = use(params);
  const router = useRouter();

  useEffect(() => {
    if (doubtId) {
      router.replace(`/student/doubts?id=${doubtId}`);
    }
  }, [doubtId, router]);

  return (
    <div className="h-64 rounded-2xl animate-shimmer border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1e1e2e]" />
  );
}
