/**
 * Grade helper utilities for calculating letter grades, GPAs, and performance remarks.
 */

export function computeExamGrade(obtained: number | null, total: number): string | null {
  if (obtained === null || isNaN(obtained) || total <= 0) return null;
  const pct = (obtained / total) * 100;
  if (pct >= 80) return "A+";
  if (pct >= 70) return "A";
  if (pct >= 60) return "A-";
  if (pct >= 50) return "B";
  if (pct >= 40) return "C";
  if (pct >= 33) return "D";
  return "F";
}

export function getGradeGPA(grade: string | null): string {
  switch (grade) {
    case "A+":
      return "5.00";
    case "A":
      return "4.00";
    case "A-":
      return "3.50";
    case "B":
      return "3.00";
    case "C":
      return "2.00";
    case "D":
      return "1.00";
    case "F":
      return "0.00";
    default:
      return "—";
  }
}
