"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  gradeSubmissionSchema,
  type CreateAssignmentInput,
  type UpdateAssignmentInput,
  type GradeSubmissionInput,
} from "@/lib/validations/assignment";
import type { AssignmentDoc, SubmissionDoc } from "@/types";
import { createNotification } from "@/actions/notificationActions";

// ─── CREATE ASSIGNMENT ────────────────────────────────────────────────────────

export async function createAssignment(formData: CreateAssignmentInput) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const validated = createAssignmentSchema.parse(formData);

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      tutor_id: tutorId,
      batch_id: validated.batchId,
      title: validated.title,
      description: validated.description || null,
      deadline: new Date(validated.deadline).toISOString(),
      max_marks: validated.maxMarks,
      is_published: false,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to create assignment: ${error?.message}`);

  return { success: true, assignmentId: data.id };
}

// ─── UPDATE ASSIGNMENT ────────────────────────────────────────────────────────

export async function updateAssignment(assignmentId: string, updates: UpdateAssignmentInput) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const validated = updateAssignmentSchema.parse(updates);

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (validated.title) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.deadline) updateData.deadline = new Date(validated.deadline).toISOString();
  if (validated.maxMarks !== undefined) updateData.max_marks = validated.maxMarks;
  if (validated.batchId) updateData.batch_id = validated.batchId;

  const { error } = await supabase
    .from("assignments")
    .update(updateData)
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId);

  if (error) throw new Error(`Failed to update assignment: ${error.message}`);
  return { success: true };
}

// ─── PUBLISH ASSIGNMENT ───────────────────────────────────────────────────────

export async function publishAssignment(assignmentId: string) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  // 1. Mark as published
  const { data: assignment, error: pubError } = await supabase
    .from("assignments")
    .update({ is_published: true })
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId)
    .select("id, batch_id, title, deadline")
    .single();

  if (pubError || !assignment) throw new Error(`Failed to publish assignment: ${pubError?.message}`);

  // 2. Find enrolled students
  const { data: students } = await supabase
    .from("students")
    .select("id, enrolled_batch_ids")
    .eq("tutor_id", tutorId)
    .eq("status", "active");

  const enrolledStudents = (students || []).filter((s) =>
    s.enrolled_batch_ids?.includes(assignment.batch_id)
  );

  // 3. Create submission rows
  if (enrolledStudents.length > 0) {
    const submissionsData = enrolledStudents.map((student) => ({
      assignment_id: assignmentId,
      student_id: student.id,
      status: "pending" as const,
    }));

    await supabase.from("assignment_submissions").insert(submissionsData);

    // 4. Notify students (non-blocking per student)
    const deadline = assignment.deadline
      ? new Date(assignment.deadline).toLocaleDateString("en-BD", { month: "short", day: "numeric" })
      : "";

    for (const student of enrolledStudents) {
      try {
        const { data: studentRow } = await supabase
          .from("students")
          .select("auth_uid")
          .eq("id", student.id)
          .single();

        if (studentRow?.auth_uid) {
          await createNotification(
            studentRow.auth_uid,
            `New Assignment: ${assignment.title}`,
            deadline ? `Due ${deadline}` : null,
            "assignment",
            assignmentId,
            "assignment"
          );
        }
      } catch {
        // Non-critical — skip notification failures
      }
    }
  }

  return { success: true };
}

// ─── DELETE ASSIGNMENT ────────────────────────────────────────────────────────

export async function deleteAssignment(assignmentId: string) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor") throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  // 1. Get submissions with files
  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("file_path")
    .eq("assignment_id", assignmentId)
    .not("file_path", "is", null);

  // 2. Delete files from storage
  if (submissions && submissions.length > 0) {
    const filePaths = submissions.map((s) => s.file_path as string);
    await supabase.storage.from("attachments").remove(filePaths);
  }

  // 3. Delete assignment (submissions are cascade deleted)
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId);

  if (error) throw new Error(`Failed to delete assignment: ${error.message}`);
  return { success: true };
}

// ─── SUBMIT ASSIGNMENT ────────────────────────────────────────────────────────

export async function submitAssignment(submissionId: string, filePath: string) {
  const authState = await verifyUserAuth();
  if (authState.role !== "student" || !authState.studentDocId) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("assignment_submissions")
    .update({
      file_path: filePath,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .eq("student_id", authState.studentDocId);

  if (error) throw new Error(`Failed to submit assignment: ${error.message}`);
  return { success: true };
}

// ─── GRADE SUBMISSION ─────────────────────────────────────────────────────────

export async function gradeSubmission(submissionId: string, data: GradeSubmissionInput) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const validated = gradeSubmissionSchema.parse(data);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("assignment_submissions")
    .update({
      marks_obtained: validated.marksObtained,
      feedback: validated.feedback || null,
      status: "graded",
    })
    .eq("id", submissionId);

  if (error) throw new Error(`Failed to grade submission: ${error.message}`);
  return { success: true };
}

// ─── GET ASSIGNMENTS ──────────────────────────────────────────────────────────

export async function getAssignments(batchId?: string) {
  const authState = await verifyUserAuth();
  const tutorId = authState.tutorId || (hasRoleAtLeast(authState.role, "tutor") ? authState.uid : null);

  if (!tutorId) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  let query = supabase
    .from("assignments")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  if (authState.role === "student") {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);

  let filteredData = data;

  if (authState.role === "student" && authState.studentDocId && !batchId) {
    const { data: student } = await supabase
      .from("students")
      .select("enrolled_batch_ids")
      .eq("id", authState.studentDocId)
      .single();

    const enrolledBatches = student?.enrolled_batch_ids || [];
    filteredData = data.filter((a) => enrolledBatches.includes(a.batch_id));
  }

  return filteredData.map((a) => ({
    id: a.id,
    tutorId: a.tutor_id,
    batchId: a.batch_id,
    title: a.title,
    description: a.description,
    deadline: a.deadline,
    maxMarks: a.max_marks,
    isPublished: a.is_published,
    createdAt: a.created_at,
  })) as AssignmentDoc[];
}

// ─── GET SUBMISSIONS (Tutor) ──────────────────────────────────────────────────

export async function getSubmissions(assignmentId: string) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(`*, students ( full_name, phone )`)
    .eq("assignment_id", assignmentId);

  if (error) throw new Error(`Failed to fetch submissions: ${error.message}`);

  return data.map((s) => ({
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    filePath: s.file_path,
    submittedAt: s.submitted_at,
    marksObtained: s.marks_obtained,
    feedback: s.feedback,
    status: s.status,
    updatedAt: s.updated_at,
    studentName: (s.students as { full_name: string; phone: string } | null)?.full_name,
    studentPhone: (s.students as { full_name: string; phone: string } | null)?.phone,
  }));
}

// ─── GET STUDENT SUBMISSIONS ──────────────────────────────────────────────────

export async function getStudentSubmissions() {
  const authState = await verifyUserAuth();
  if (authState.role !== "student" || !authState.studentDocId) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(`*, assignments ( title, deadline, max_marks )`)
    .eq("student_id", authState.studentDocId);

  if (error) throw new Error(`Failed to fetch student submissions: ${error.message}`);

  return data.map((s) => ({
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    filePath: s.file_path,
    submittedAt: s.submitted_at,
    marksObtained: s.marks_obtained,
    feedback: s.feedback,
    status: s.status,
    updatedAt: s.updated_at,
    assignmentTitle: (s.assignments as { title: string; deadline: string; max_marks: number } | null)?.title,
    assignmentDeadline: (s.assignments as { title: string; deadline: string; max_marks: number } | null)?.deadline,
    assignmentMaxMarks: (s.assignments as { title: string; deadline: string; max_marks: number } | null)?.max_marks,
  }));
}
