/**
 * Helper utilities for triggering clean PDF print view / export
 */

export function triggerPrintWindow() {
  if (typeof window !== "undefined") {
    window.print();
  }
}

export function calculateGrade(score: number, total: number): { grade: string; color: string } {
  if (!total || total <= 0) return { grade: "N/A", color: "text-slate-500" };
  const percentage = (score / total) * 100;

  if (percentage >= 80) return { grade: "A+", color: "text-emerald-600 font-bold" };
  if (percentage >= 70) return { grade: "A", color: "text-emerald-500 font-semibold" };
  if (percentage >= 60) return { grade: "A-", color: "text-blue-600 font-semibold" };
  if (percentage >= 50) return { grade: "B", color: "text-indigo-600" };
  if (percentage >= 40) return { grade: "C", color: "text-amber-600" };
  if (percentage >= 33) return { grade: "D", color: "text-orange-600" };
  return { grade: "F", color: "text-red-600 font-bold" };
}
