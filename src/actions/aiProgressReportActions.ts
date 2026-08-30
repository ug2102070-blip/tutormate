"use server";

import { verifyUserAuth } from "@/lib/authHelpers";
import { getStudentProgressReport } from "@/actions/studentReportActions";
import { hasRoleAtLeast } from "@/lib/permissions";

export interface AIProgressReportResult {
  success: boolean;
  evaluation?: {
    summary: string;
    strengths: string[];
    concerns: string[];
    recommendations: string[];
    parentNoteBengali: string;
    parentNoteEnglish: string;
  };
  rawText?: string;
  error?: string;
}

/**
 * Calls Gemini with actual live student performance metrics to generate a comprehensive AI evaluation.
 */
export async function generateStudentAIEvaluation(
  studentId: string,
  language: "bn" | "en" = "bn"
): Promise<AIProgressReportResult> {
  const auth = await verifyUserAuth();
  if (!hasRoleAtLeast(auth.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can generate AI student reports.");
  }

  // 1. Fetch live metrics from DB
  const report = await getStudentProgressReport(studentId);
  if (!report) {
    return { success: false, error: "Student performance data not found." };
  }

  const { student, attendance, fees, assignments, exams, batchNames } = report;

  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "Gemini API key is not configured in .env.local",
    };
  }

  const prompt = `
You are an expert Bangladeshi academic tutor and student mentor. Analyze the following real student data and provide an insightful, motivating, and actionable academic evaluation.

STUDENT PROFILE:
- Name: ${student.fullName}
- Institution: ${student.institution || "N/A"}
- Batches: ${batchNames.join(", ") || "General Batch"}
- Enrolled Since: ${student.createdAt.slice(0, 10)}

LIVE PERFORMANCE METRICS:
- Overall Attendance Rate: ${attendance.attendanceRate}% (${attendance.presentDays} present, ${attendance.absentDays} absent, ${attendance.lateDays} late out of ${attendance.totalDays} days)
- Last 30 Days Attendance Rate: ${attendance.last30DaysRate}%
- Exam Average Score: ${exams.averagePercentage !== null ? exams.averagePercentage + "%" : "No exam scores yet"} (Appeared in ${exams.appeared} exams, Top score: ${exams.topScore !== null ? exams.topScore + "%" : "N/A"})
- Assignment Submissions: ${assignments.submitted}/${assignments.total}
- Monthly Tuition Fees: ${fees.unpaidCount === 0 ? "All fees cleared" : fees.unpaidCount + " unpaid month(s), Outstanding ৳" + fees.outstanding}

TASK:
Return a valid JSON object ONLY (without markdown fences, or with standard json block) following this exact schema:
{
  "summary": "2-3 sentences concise executive summary of performance and momentum",
  "strengths": ["bullet point 1", "bullet point 2", "bullet point 3"],
  "concerns": ["bullet point 1 if any (e.g. absent days, fee dues, exam dip)"],
  "recommendations": ["actionable advice 1 for student/tutor", "actionable advice 2"],
  "parentNoteBengali": "A polite, professional, and encouraging message in natural Bengali suitable for sending directly to the guardian via WhatsApp/SMS (include tutor greetings and student status)",
  "parentNoteEnglish": "The same polite guardian update message translated into English"
}
`;

  const systemInstruction =
    "You are TutorMate AI Academic Evaluator. Always output pure, valid JSON matching the requested schema. Provide warm, encouraging, yet constructive feedback tailored to Bangladeshi curriculum.";

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemInstruction}\n\n${prompt}` }],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 2048,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          try {
            const parsed = JSON.parse(text);
            return {
              success: true,
              evaluation: {
                summary: parsed.summary || "Student performance evaluated.",
                strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
                concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
                parentNoteBengali: parsed.parentNoteBengali || "",
                parentNoteEnglish: parsed.parentNoteEnglish || "",
              },
              rawText: text,
            };
          } catch (parseErr) {
            console.warn("Gemini JSON parse fallback:", parseErr);
            return {
              success: true,
              rawText: text,
              evaluation: {
                summary: text.slice(0, 200),
                strengths: [],
                concerns: [],
                recommendations: [],
                parentNoteBengali: "",
                parentNoteEnglish: "",
              },
            };
          }
        }
      } else {
        console.warn(`Gemini evaluation failed on model ${model}:`, response.status);
      }
    } catch (err) {
      console.error(`Gemini API error on model ${model}:`, err);
    }
  }

  return {
    success: false,
    error: "Failed to generate AI evaluation. Please check your Gemini API quota or connection.",
  };
}
