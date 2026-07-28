"use server";

import { createAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { 
  createExamSchema, 
  updateExamSchema, 
  saveExamResultsSchema, 
  type CreateExamInput, 
  type UpdateExamInput, 
  type SaveExamResultsInput 
} from "@/lib/validations/exam";
import type { ExamDoc, ExamResultDoc } from "@/types";
import { createNotification } from "@/actions/notificationActions";

export async function createExam(formData: CreateExamInput, idToken: string) {
  const authState = await verifyUserAuth(idToken);
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
  
  return { success: true, examId: data.id };
}

export async function updateExam(examId: string, updates: UpdateExamInput, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");
  
  const tutorId = authState.tutorId || authState.uid;
  const validated = updateExamSchema.parse(updates);
  
  const supabase = createAdminClient();
  
  const updateData: any = {};
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
  return { success: true };
}

export async function deleteExam(examId: string, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");
  
  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from("exams")
    .delete()
    .eq("id", examId)
    .eq("tutor_id", tutorId);

  if (error) throw new Error(`Failed to delete exam: ${error.message}`);
  return { success: true };
}

export async function getExams(batchId: string | null, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  const supabase = createAdminClient();
  
  let query = supabase.from("exams").select("*");
  
  if (hasRoleAtLeast(authState.role, "tutor")) {
    const tutorId = authState.tutorId || authState.uid;
    query = query.eq("tutor_id", tutorId);
    if (batchId) {
      query = query.eq("batch_id", batchId);
    }
  } else if (authState.role === "student") {
    // If student, we need to know their batches
    const { data: student } = await supabase
      .from("students")
      .select("enrolled_batch_ids")
      .eq("auth_uid", authState.uid)
      .single();
      
    if (!student || !student.enrolled_batch_ids || student.enrolled_batch_ids.length === 0) {
      return { success: true, exams: [] as ExamDoc[] };
    }
    
    query = query.in("batch_id", student.enrolled_batch_ids);
  } else {
    // parent or other non-tutor/non-student role — return empty
    return { success: true, exams: [] as ExamDoc[] };
  }

  query = query.order("exam_date", { ascending: false });
  
  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch exams: ${error.message}`);
  
  const formattedExams: ExamDoc[] = (data || []).map(row => ({
    id: row.id,
    tutorId: row.tutor_id,
    batchId: row.batch_id,
    title: row.title,
    subject: row.subject,
    examDate: row.exam_date,
    totalMarks: row.total_marks,
    passMarks: row.pass_marks,
    createdAt: row.created_at,
  }));
  
  return { success: true, exams: formattedExams };
}

export async function getExamDetails(examId: string, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  const supabase = createAdminClient();
  
  const { data: exam, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .single();
    
  if (error || !exam) throw new Error(`Failed to fetch exam: ${error?.message}`);
  
  if (hasRoleAtLeast(authState.role, "tutor")) {
    const tutorId = authState.tutorId || authState.uid;
    if (exam.tutor_id !== tutorId) throw new Error("Unauthorized");
  }
  
  const formattedExam: ExamDoc = {
    id: exam.id,
    tutorId: exam.tutor_id,
    batchId: exam.batch_id,
    title: exam.title,
    subject: exam.subject,
    examDate: exam.exam_date,
    totalMarks: exam.total_marks,
    passMarks: exam.pass_marks,
    createdAt: exam.created_at,
  };
  
  // Also fetch results
  const { data: results, error: resError } = await supabase
    .from("exam_results")
    .select("*")
    .eq("exam_id", examId);
    
  if (resError) throw new Error(`Failed to fetch exam results: ${resError.message}`);
  
  const formattedResults: ExamResultDoc[] = (results || []).map(row => ({
    id: row.id,
    examId: row.exam_id,
    studentId: row.student_id,
    marksObtained: row.marks_obtained,
    grade: row.grade,
    position: row.position,
    remarks: row.remarks,
    isAbsent: row.is_absent,
    createdAt: row.created_at,
  }));
  
  return { success: true, exam: formattedExam, results: formattedResults };
}

function computeGrade(obtained: number | null, total: number): string | null {
  if (obtained === null) return null;
  const pct = (obtained / total) * 100;
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

export async function saveExamResults(inputData: SaveExamResultsInput, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");
  
  const tutorId = authState.tutorId || authState.uid;
  const validated = saveExamResultsSchema.parse(inputData);
  
  const supabase = createAdminClient();
  
  // Get exam details for total marks
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("total_marks, tutor_id")
    .eq("id", validated.examId)
    .single();
    
  if (examError || !exam) throw new Error(`Exam not found`);
  if (exam.tutor_id !== tutorId) throw new Error("Unauthorized");
  
  // Calculate grades and positions
  const resultsToProcess = validated.results.map(r => ({
    ...r,
    grade: r.isAbsent ? null : computeGrade(r.marksObtained, exam.total_marks)
  }));
  
  // Rank students based on marks
  // Sort descending by marks, ignoring nulls and absents for position
  const validForRanking = resultsToProcess
    .filter(r => !r.isAbsent && r.marksObtained !== null)
    .sort((a, b) => (b.marksObtained || 0) - (a.marksObtained || 0));
    
  let currentRank = 1;
  let currentMarks: number | null = null;
  let studentsAtCurrentRank = 0;
  
  const rankMap = new Map<string, number>();
  
  validForRanking.forEach((r, index) => {
    if (currentMarks === null) {
      currentMarks = r.marksObtained;
      rankMap.set(r.studentId, currentRank);
      studentsAtCurrentRank = 1;
    } else if (r.marksObtained === currentMarks) {
      // Tie
      rankMap.set(r.studentId, currentRank);
      studentsAtCurrentRank++;
    } else {
      currentRank += studentsAtCurrentRank;
      currentMarks = r.marksObtained;
      rankMap.set(r.studentId, currentRank);
      studentsAtCurrentRank = 1;
    }
  });
  
  const finalUpsertData = resultsToProcess.map(r => ({
    exam_id: validated.examId,
    student_id: r.studentId,
    marks_obtained: r.marksObtained,
    grade: r.grade,
    position: rankMap.get(r.studentId) || null,
    remarks: r.remarks || null,
    is_absent: r.isAbsent,
  }));
  
  // Use upsert to insert or update existing results
  const { error: upsertError } = await supabase
    .from("exam_results")
    .upsert(finalUpsertData, { onConflict: "exam_id, student_id" });
    
  if (upsertError) throw new Error(`Failed to save exam results: ${upsertError.message}`);
  
  // Notify each student that results are published
  const { data: examInfo } = await supabase
    .from("exams")
    .select("title, batch_id")
    .eq("id", validated.examId)
    .single();

  const examTitle = examInfo?.title ?? "Exam";

  for (const r of validated.results) {
    if (r.isAbsent) continue;
    // Get student's auth_uid
    const { data: studentRow } = await supabase
      .from("students")
      .select("auth_uid")
      .eq("id", r.studentId)
      .single();

    if (studentRow?.auth_uid) {
      await createNotification(
        studentRow.auth_uid,
        `Results Published: ${examTitle}`,
        r.marksObtained !== null
          ? `Your score: ${r.marksObtained} marks`
          : "Results are now available",
        "exam",
        validated.examId,
        "exam"
      );
    }
  }

  return { success: true };
}

export async function getStudentExamResults(idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "student") throw new Error("Unauthorized");
  
  const supabase = createAdminClient();
  
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_uid", authState.uid)
    .single();
    
  if (!student) throw new Error("Student record not found");
  
  // We need to fetch all exam results for this student, and join with exams table
  const { data, error } = await supabase
    .from("exam_results")
    .select(`
      *,
      exams (*)
    `)
    .eq("student_id", student.id)
    .order("created_at", { ascending: false });
    
  if (error) throw new Error(`Failed to fetch student results: ${error.message}`);
  
  // Format the output
  const results = (data || []).map(row => ({
    result: {
      id: row.id,
      examId: row.exam_id,
      studentId: row.student_id,
      marksObtained: row.marks_obtained,
      grade: row.grade,
      position: row.position,
      remarks: row.remarks,
      isAbsent: row.is_absent,
      createdAt: row.created_at,
    } as ExamResultDoc,
    exam: {
      id: row.exams.id,
      tutorId: row.exams.tutor_id,
      batchId: row.exams.batch_id,
      title: row.exams.title,
      subject: row.exams.subject,
      examDate: row.exams.exam_date,
      totalMarks: row.exams.total_marks,
      passMarks: row.exams.pass_marks,
      createdAt: row.exams.created_at,
    } as ExamDoc
  }));
  
  return { success: true, results };
}
