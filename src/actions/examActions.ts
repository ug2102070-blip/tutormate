"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import {
  createExamSchema,
  updateExamSchema,
  saveExamResultsSchema,
  type CreateExamInput,
  type UpdateExamInput,
  type SaveExamResultsInput,
} from "@/lib/validations/exam";
import type { ExamDoc, ExamResultDoc, ExamWithStatsDoc } from "@/types";
import { createNotification } from "@/actions/notificationActions";
import { computeExamGrade } from "@/lib/gradeUtils";
import { revalidatePath } from "next/cache";

// ─── CREATE EXAM ──────────────────────────────────────────────────────────────

export async function createExam(formData: CreateExamInput) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const validated = createExamSchema.parse(formData);

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("exams")
    .insert({
      tutor_id: tutorId,
      batch_id: validated.batchId,
      title: validated.title,
      subject: validated.subject || null,
      exam_date: validated.examDate,
      total_marks: validated.totalMarks,
      pass_marks: validated.passMarks || null,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create exam: ${error?.message}`);

  revalidatePath("/tutor/exams");
  revalidatePath("/tutor/dashboard");
  return { success: true, examId: data.id };
}

// ─── UPDATE EXAM ──────────────────────────────────────────────────────────────

export async function updateExam(examId: string, updates: UpdateExamInput) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const validated = updateExamSchema.parse(updates);

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (validated.title) updateData.title = validated.title;
  if (validated.subject !== undefined) updateData.subject = validated.subject;
  if (validated.examDate) updateData.exam_date = validated.examDate;
  if (validated.totalMarks !== undefined) updateData.total_marks = validated.totalMarks;
  if (validated.passMarks !== undefined) updateData.pass_marks = validated.passMarks;

  const { error } = await supabase
    .from("exams")
    .update(updateData)
    .eq("id", examId)
    .eq("tutor_id", tutorId);

  if (error) throw new Error(`Failed to update exam: ${error.message}`);

  revalidatePath("/tutor/exams");
  revalidatePath(`/tutor/exams/${examId}`);
  return { success: true };
}

// ─── DELETE EXAM ──────────────────────────────────────────────────────────────

export async function deleteExam(examId: string) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId)
    .eq("tutor_id", tutorId);

  if (error) throw new Error(`Failed to delete exam: ${error.message}`);

  revalidatePath("/tutor/exams");
  revalidatePath("/tutor/dashboard");
  return { success: true };
}

// ─── GET EXAMS WITH STATS ────────────────────────────────────────────────────

export async function getExams(batchId: string | null = null) {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  if (hasRoleAtLeast(authState.role, "tutor")) {
    const tutorId = authState.tutorId || authState.uid;

    let query = supabase
      .from("exams")
      .select(`
        id,
        tutor_id,
        batch_id,
        title,
        subject,
        exam_date,
        total_marks,
        pass_marks,
        created_at,
        batches (
          id,
          name,
          subject,
          grade_class,
          student_count
        ),
        exam_results (
          id,
          marks_obtained,
          is_absent,
          grade
        )
      `)
      .eq("tutor_id", tutorId);

    if (batchId && batchId !== "all") {
      query = query.eq("batch_id", batchId);
    }

    query = query.order("exam_date", { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch exams: ${error.message}`);

    const formattedExams: ExamWithStatsDoc[] = (data || []).map((row: any) => {
      const results: any[] = row.exam_results || [];
      const evaluated = results.filter((r) => !r.is_absent && r.marks_obtained !== null);
      const absentCount = results.filter((r) => r.is_absent).length;
      const totalMarks = Number(row.total_marks) || 100;
      const passMarks = row.pass_marks !== null && row.pass_marks !== undefined ? Number(row.pass_marks) : 40;

      let avgPct: string | null = null;
      let highestMarks: number | null = null;
      let lowestMarks: number | null = null;
      let passCount = 0;
      let failCount = 0;

      if (evaluated.length > 0) {
        const sumMarks = evaluated.reduce((sum, r) => sum + Number(r.marks_obtained || 0), 0);
        const avgScore = sumMarks / evaluated.length;
        avgPct = `${((avgScore / totalMarks) * 100).toFixed(1)}%`;

        const markList = evaluated.map((r) => Number(r.marks_obtained));
        highestMarks = Math.max(...markList);
        lowestMarks = Math.min(...markList);

        evaluated.forEach((r) => {
          if (Number(r.marks_obtained) >= passMarks && r.grade !== "F") {
            passCount++;
          } else {
            failCount++;
          }
        });
      }

      const batchInfo = Array.isArray(row.batches) ? row.batches[0] : row.batches;

      return {
        id: row.id,
        tutorId: row.tutor_id,
        batchId: row.batch_id,
        title: row.title,
        subject: row.subject || batchInfo?.subject || null,
        examDate: row.exam_date,
        totalMarks: Number(row.total_marks),
        passMarks: row.pass_marks !== null ? Number(row.pass_marks) : null,
        createdAt: row.created_at,
        batchName: batchInfo?.name || "General Batch",
        gradeClass: batchInfo?.grade_class || "All Grades",
        markedCount: evaluated.length,
        absentCount,
        totalStudents: batchInfo?.student_count || results.length || 0,
        averagePercentage: avgPct,
        highestMarks,
        lowestMarks,
        passCount,
        failCount,
      };
    });

    return { success: true, exams: formattedExams };
  } else if (authState.role === "student") {
    const { data: student } = await supabase
      .from("students")
      .select("enrolled_batch_ids")
      .eq("auth_uid", authState.uid)
      .single();

    if (!student?.enrolled_batch_ids?.length) {
      return { success: true, exams: [] as ExamWithStatsDoc[] };
    }

    const { data, error } = await supabase
      .from("exams")
      .select("*, batches(name, grade_class)")
      .in("batch_id", student.enrolled_batch_ids)
      .order("exam_date", { ascending: false });

    if (error) throw new Error(`Failed to fetch exams: ${error.message}`);

    const formattedExams: ExamWithStatsDoc[] = (data || []).map((row: any) => ({
      id: row.id,
      tutorId: row.tutor_id,
      batchId: row.batch_id,
      title: row.title,
      subject: row.subject,
      examDate: row.exam_date,
      totalMarks: Number(row.total_marks),
      passMarks: row.pass_marks !== null ? Number(row.pass_marks) : null,
      createdAt: row.created_at,
      batchName: row.batches?.name || "Enrolled Batch",
      gradeClass: row.batches?.grade_class || "",
      markedCount: 0,
      absentCount: 0,
      totalStudents: 0,
      averagePercentage: null,
      highestMarks: null,
      lowestMarks: null,
      passCount: 0,
      failCount: 0,
    }));

    return { success: true, exams: formattedExams };
  } else {
    return { success: true, exams: [] as ExamWithStatsDoc[] };
  }
}

// ─── GET EXAM DETAILS & ENROLLED STUDENTS ────────────────────────────────────

export async function getExamDetails(examId: string) {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  const { data: exam, error } = await supabase
    .from("exams")
    .select(`
      *,
      batches (
        id,
        name,
        subject,
        grade_class,
        student_count
      )
    `)
    .eq("id", examId)
    .single();

  if (error || !exam) throw new Error(`Failed to fetch exam: ${error?.message}`);

  if (hasRoleAtLeast(authState.role, "tutor")) {
    const tutorId = authState.tutorId || authState.uid;
    if (exam.tutor_id !== tutorId) throw new Error("Unauthorized");
  }

  const batchInfo = Array.isArray(exam.batches) ? exam.batches[0] : exam.batches;

  const formattedExam: ExamDoc = {
    id: exam.id,
    tutorId: exam.tutor_id,
    batchId: exam.batch_id,
    title: exam.title,
    subject: exam.subject || batchInfo?.subject || null,
    examDate: exam.exam_date,
    totalMarks: Number(exam.total_marks),
    passMarks: exam.pass_marks !== null ? Number(exam.pass_marks) : null,
    createdAt: exam.created_at,
  };

  // Fetch enrolled students for this batch
  const { data: students, error: studError } = await supabase
    .from("students")
    .select("id, full_name, phone, institution, invite_code")
    .eq("tutor_id", exam.tutor_id)
    .eq("status", "active")
    .contains("enrolled_batch_ids", [exam.batch_id])
    .order("full_name", { ascending: true });

  if (studError) throw new Error(`Failed to fetch students: ${studError.message}`);

  // Fetch existing results
  const { data: results, error: resError } = await supabase
    .from("exam_results")
    .select("*")
    .eq("exam_id", examId);

  if (resError) throw new Error(`Failed to fetch exam results: ${resError.message}`);

  const formattedResults: ExamResultDoc[] = (results || []).map((row) => ({
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    marksObtained: row.marks_obtained !== null ? Number(row.marks_obtained) : null,
    grade: row.grade,
    position: row.position,
    remarks: row.remarks,
    isAbsent: row.is_absent || false,
    createdAt: row.created_at,
  }));

  return {
    success: true,
    exam: formattedExam,
    batch: batchInfo || null,
    students: students || [],
    results: formattedResults,
  };
}


// ─── SAVE EXAM RESULTS ────────────────────────────────────────────────────────

export async function saveExamResults(inputData: SaveExamResultsInput) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const validated = saveExamResultsSchema.parse(inputData);

  const supabase = createAdminClient();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("total_marks, tutor_id, title, batch_id")
    .eq("id", validated.examId)
    .single();

  if (examError || !exam) throw new Error("Exam not found");
  if (exam.tutor_id !== tutorId) throw new Error("Unauthorized");

  const totalMarks = Number(exam.total_marks) || 100;

  const resultsToProcess = validated.results.map((r) => ({
    ...r,
    grade: r.isAbsent ? null : computeExamGrade(r.marksObtained, totalMarks),
  }));

  // Calculate ranks (descending marks, ties share rank)
  const validForRanking = resultsToProcess
    .filter((r) => !r.isAbsent && r.marksObtained !== null)
    .sort((a, b) => Number(b.marksObtained || 0) - Number(a.marksObtained || 0));

  let currentRank = 1;
  let currentMarks: number | null = null;
  let studentsAtCurrentRank = 0;
  const rankMap = new Map<string, number>();

  validForRanking.forEach((r) => {
    if (currentMarks === null) {
      currentMarks = r.marksObtained;
      rankMap.set(r.studentId, currentRank);
      studentsAtCurrentRank = 1;
    } else if (r.marksObtained === currentMarks) {
      rankMap.set(r.studentId, currentRank);
      studentsAtCurrentRank++;
    } else {
      currentRank += studentsAtCurrentRank;
      currentMarks = r.marksObtained;
      rankMap.set(r.studentId, currentRank);
      studentsAtCurrentRank = 1;
    }
  });

  const finalUpsertData = resultsToProcess.map((r) => ({
    exam_id: validated.examId,
    student_id: r.studentId,
    marks_obtained: r.isAbsent ? null : r.marksObtained,
    grade: r.grade,
    position: r.isAbsent ? null : rankMap.get(r.studentId) || null,
    remarks: r.remarks || null,
    is_absent: r.isAbsent,
  }));

  if (finalUpsertData.length > 0) {
    const { error: upsertError } = await supabase
      .from("exam_results")
      .upsert(finalUpsertData, { onConflict: "exam_id, student_id" });

    if (upsertError) throw new Error(`Failed to save exam results: ${upsertError.message}`);
  }

  // Notify each student (non-blocking)
  for (const r of validated.results) {
    if (r.isAbsent) continue;
    try {
      const { data: studentRow } = await supabase
        .from("students")
        .select("auth_uid")
        .eq("id", r.studentId)
        .single();

      if (studentRow?.auth_uid) {
        await createNotification(
          studentRow.auth_uid,
          `Results Published: ${exam.title}`,
          r.marksObtained !== null
            ? `Your score: ${r.marksObtained}/${totalMarks} marks`
            : "Results are now available in your portal",
          "exam",
          validated.examId,
          "exam"
        );
      }
    } catch {
      // Non-critical notification failure
    }
  }

  revalidatePath("/tutor/exams");
  revalidatePath(`/tutor/exams/${validated.examId}`);
  revalidatePath("/student/exams");
  revalidatePath("/parent/results");
  return { success: true };
}

// ─── GET STUDENT EXAM RESULTS ─────────────────────────────────────────────────

export async function getStudentExamResults() {
  const authState = await verifyUserAuth();
  if (authState.role !== "student") throw new Error("Unauthorized");

  const supabase = createAdminClient();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_uid", authState.uid)
    .single();

  if (!student) throw new Error("Student record not found");

  const { data, error } = await supabase
    .from("exam_results")
    .select(`*, exams (*)`)
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch student results: ${error.message}`);

  const results = (data || []).map((row) => ({
    result: {
      id: row.id,
      examId: row.exam_id,
      studentId: row.student_id,
      marksObtained: row.marks_obtained !== null ? Number(row.marks_obtained) : null,
      grade: row.grade,
      position: row.position,
      remarks: row.remarks,
      isAbsent: row.is_absent || false,
      createdAt: row.created_at,
    } as ExamResultDoc,
    exam: {
      id: row.exams.id,
      tutorId: row.exams.tutor_id,
      batchId: row.exams.batch_id,
      title: row.exams.title,
      subject: row.exams.subject,
      examDate: row.exams.exam_date,
      totalMarks: Number(row.exams.total_marks),
      passMarks: row.exams.pass_marks !== null ? Number(row.exams.pass_marks) : null,
      createdAt: row.exams.created_at,
    } as ExamDoc,
  }));

  return { success: true, results };
}
