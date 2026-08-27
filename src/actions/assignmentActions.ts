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
import { revalidatePath } from "next/cache";

// ─── INTERNAL HELPER: SYNC SUBMISSIONS FOR PUBLISHED ASSIGNMENT ───────────────

async function syncSubmissionsForAssignment(
  supabase: any,
  assignmentId: string,
  batchId: string,
  tutorId: string,
  notifyStudents = true
) {
  // 1. Get assignment info
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, deadline, max_marks")
    .eq("id", assignmentId)
    .single();

  if (!assignment) return { countAdded: 0 };

  // 2. Find enrolled active students
  const { data: students } = await supabase
    .from("students")
    .select("id, auth_uid, full_name, enrolled_batch_ids")
    .eq("tutor_id", tutorId)
    .eq("status", "active");

  const enrolledStudents = (students || []).filter((s: any) =>
    s.enrolled_batch_ids?.includes(batchId)
  );

  if (enrolledStudents.length === 0) return { countAdded: 0 };

  // 3. Find existing submissions
  const { data: existingSubs } = await supabase
    .from("assignment_submissions")
    .select("student_id")
    .eq("assignment_id", assignmentId);

  const existingStudentIds = new Set((existingSubs || []).map((s: any) => s.student_id));
  const newStudents = enrolledStudents.filter((s: any) => !existingStudentIds.has(s.id));

  if (newStudents.length > 0) {
    const submissionsData = newStudents.map((student: any) => ({
      assignment_id: assignmentId,
      student_id: student.id,
      status: "pending",
    }));

    await supabase.from("assignment_submissions").insert(submissionsData);
  }

  // 4. Send notifications if requested
  if (notifyStudents) {
    const deadlineFormatted = assignment.deadline
      ? new Date(assignment.deadline).toLocaleDateString("en-BD", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    for (const student of newStudents) {
      if (student.auth_uid) {
        try {
          await createNotification(
            student.auth_uid,
            `New Assignment: ${assignment.title}`,
            deadlineFormatted ? `Due ${deadlineFormatted}` : "New homework assigned.",
            "assignment",
            assignmentId,
            "assignment"
          );
        } catch {
          // non-blocking
        }
      }
    }
  }

  return { countAdded: newStudents.length };
}

// ─── CREATE ASSIGNMENT ────────────────────────────────────────────────────────

export async function createAssignment(formData: CreateAssignmentInput) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const validated = createAssignmentSchema.parse(formData);

  const supabase = createAdminClient();

  const insertPayload: Record<string, any> = {
    tutor_id: tutorId,
    batch_id: validated.batchId,
    title: validated.title,
    description: validated.description || null,
    deadline: new Date(validated.deadline).toISOString(),
    max_marks: validated.maxMarks,
    is_published: !!validated.isPublished,
  };

  if (validated.filePath !== undefined) {
    insertPayload.file_path = validated.filePath || null;
  }

  let { data, error } = await supabase
    .from("assignments")
    .insert(insertPayload)
    .select("id")
    .single();

  // If error occurred because column `file_path` is missing in database, retry without it
  if (error && error.message?.includes("file_path")) {
    delete insertPayload.file_path;
    const retryRes = await supabase
      .from("assignments")
      .insert(insertPayload)
      .select("id")
      .single();
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error || !data) throw new Error(`Failed to create assignment: ${error?.message}`);

  // If created as published directly, sync student submissions and notify
  if (validated.isPublished) {
    await syncSubmissionsForAssignment(
      supabase,
      data.id,
      validated.batchId,
      tutorId,
      true
    );
  }

  revalidatePath("/tutor/assignments");
  return { success: true, assignmentId: data.id };
}

// ─── UPDATE ASSIGNMENT ────────────────────────────────────────────────────────

export async function updateAssignment(assignmentId: string, updates: UpdateAssignmentInput) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const validated = updateAssignmentSchema.parse(updates);

  const supabase = createAdminClient();

  // Fetch current assignment
  const { data: current } = await supabase
    .from("assignments")
    .select("id, batch_id, is_published")
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId)
    .single();

  if (!current) throw new Error("Assignment not found");

  const updateData: Record<string, unknown> = {};
  if (validated.title) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.deadline) updateData.deadline = new Date(validated.deadline).toISOString();
  if (validated.maxMarks !== undefined) updateData.max_marks = validated.maxMarks;
  if (validated.batchId) updateData.batch_id = validated.batchId;
  if (validated.filePath !== undefined) updateData.file_path = validated.filePath;
  if (validated.isPublished !== undefined) updateData.is_published = validated.isPublished;

  let { error } = await supabase
    .from("assignments")
    .update(updateData)
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId);

  // If column error, fallback without file_path
  if (error && error.message?.includes("file_path")) {
    delete updateData.file_path;
    const retry = await supabase
      .from("assignments")
      .update(updateData)
      .eq("id", assignmentId)
      .eq("tutor_id", tutorId);
    error = retry.error;
  }

  if (error) throw new Error(`Failed to update assignment: ${error.message}`);

  // If assignment is published or became published, ensure submissions are synced
  const activeBatchId = validated.batchId || current.batch_id;
  const isNowPublished = validated.isPublished ?? current.is_published;
  if (isNowPublished) {
    await syncSubmissionsForAssignment(
      supabase,
      assignmentId,
      activeBatchId,
      tutorId,
      !current.is_published
    );
  }

  revalidatePath("/tutor/assignments");
  revalidatePath(`/tutor/assignments/${assignmentId}`);
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

  // 2. Sync and notify enrolled students
  await syncSubmissionsForAssignment(supabase, assignmentId, assignment.batch_id, tutorId, true);

  revalidatePath("/tutor/assignments");
  revalidatePath(`/tutor/assignments/${assignmentId}`);
  return { success: true };
}

// ─── UNPUBLISH ASSIGNMENT ─────────────────────────────────────────────────────

export async function unpublishAssignment(assignmentId: string) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("assignments")
    .update({ is_published: false })
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId);

  if (error) throw new Error(`Failed to unpublish assignment: ${error.message}`);

  revalidatePath("/tutor/assignments");
  revalidatePath(`/tutor/assignments/${assignmentId}`);
  return { success: true };
}

// ─── SYNC ENROLLED STUDENTS ───────────────────────────────────────────────────

export async function syncAssignmentStudents(assignmentId: string) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, batch_id")
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId)
    .single();

  if (!assignment) throw new Error("Assignment not found");

  const result = await syncSubmissionsForAssignment(
    supabase,
    assignment.id,
    assignment.batch_id,
    tutorId,
    false
  );

  revalidatePath(`/tutor/assignments/${assignmentId}`);
  return { success: true, ...result };
}

// ─── REMIND PENDING STUDENTS ──────────────────────────────────────────────────

export async function remindPendingStudents(assignmentId: string) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  // 1. Fetch assignment details
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, deadline")
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId)
    .single();

  if (!assignment) throw new Error("Assignment not found");

  // 2. Fetch pending submissions with student auth_uid
  const { data: submissions, error } = await supabase
    .from("assignment_submissions")
    .select("id, student_id, students ( auth_uid, full_name )")
    .eq("assignment_id", assignmentId)
    .eq("status", "pending");

  if (error) throw new Error(`Failed to find pending submissions: ${error.message}`);

  const deadlineText = assignment.deadline
    ? new Date(assignment.deadline).toLocaleDateString("en-BD", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  let remindedCount = 0;
  for (const sub of (submissions || [])) {
    const student = sub.students as { auth_uid?: string; full_name?: string } | null;
    if (student?.auth_uid) {
      try {
        await createNotification(
          student.auth_uid,
          `Reminder: "${assignment.title}" is pending`,
          deadlineText ? `Due: ${deadlineText}. Please submit your work soon.` : "Please submit your work soon.",
          "assignment",
          assignmentId,
          "assignment"
        );
        remindedCount++;
      } catch {
        // non-blocking
      }
    }
  }

  return { success: true, remindedCount };
}

// ─── DELETE ASSIGNMENT ────────────────────────────────────────────────────────

export async function deleteAssignment(assignmentId: string) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  // 1. Get assignment to check file_path
  const { data: assignment } = await supabase
    .from("assignments")
    .select("file_path")
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId)
    .maybeSingle();

  // 2. Get submissions with files
  const { data: submissions } = await supabase
    .from("assignment_submissions")
    .select("file_path")
    .eq("assignment_id", assignmentId)
    .not("file_path", "is", null);

  const filesToDelete: string[] = [];
  if (assignment?.file_path) filesToDelete.push(assignment.file_path);
  if (submissions && submissions.length > 0) {
    submissions.forEach((s) => {
      if (s.file_path) filesToDelete.push(s.file_path);
    });
  }

  // 3. Delete files from storage
  if (filesToDelete.length > 0) {
    try {
      await supabase.storage.from("attachments").remove(filesToDelete);
    } catch {
      // ignore storage deletion errors
    }
  }

  // 4. Delete assignment (submissions are cascade deleted)
  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId);

  if (error) throw new Error(`Failed to delete assignment: ${error.message}`);

  revalidatePath("/tutor/assignments");
  return { success: true };
}

// ─── SUBMIT ASSIGNMENT (Student) ──────────────────────────────────────────────

export async function submitAssignment(
  submissionId: string,
  filePath?: string | null,
  studentNotes?: string | null
) {
  const authState = await verifyUserAuth();
  if (authState.role !== "student" || !authState.studentDocId) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // 1. Get submission and assignment details
  const { data: sub, error: fetchErr } = await supabase
    .from("assignment_submissions")
    .select(`id, assignment_id, assignments ( id, title, deadline, tutor_id )`)
    .eq("id", submissionId)
    .eq("student_id", authState.studentDocId)
    .single();

  if (fetchErr || !sub) throw new Error("Submission record not found");

  const assignment = sub.assignments as unknown as { id: string; title: string; deadline: string; tutor_id: string } | null;
  const isLate = assignment?.deadline && new Date() > new Date(assignment.deadline);

  const updateData: Record<string, any> = {
    status: isLate ? "late" : "submitted",
    submitted_at: new Date().toISOString(),
  };

  if (filePath !== undefined) updateData.file_path = filePath;
  if (studentNotes !== undefined) updateData.student_notes = studentNotes;

  let { error } = await supabase
    .from("assignment_submissions")
    .update(updateData)
    .eq("id", submissionId)
    .eq("student_id", authState.studentDocId);

  // Fallback if student_notes column is missing
  if (error && error.message?.includes("student_notes")) {
    delete updateData.student_notes;
    const retry = await supabase
      .from("assignment_submissions")
      .update(updateData)
      .eq("id", submissionId)
      .eq("student_id", authState.studentDocId);
    error = retry.error;
  }

  if (error) throw new Error(`Failed to submit assignment: ${error.message}`);

  // Notify Tutor of new submission
  if (assignment?.tutor_id) {
    try {
      const { data: studentDoc } = await supabase
        .from("students")
        .select("full_name")
        .eq("id", authState.studentDocId)
        .single();

      const studentName = studentDoc?.full_name || "A student";
      await createNotification(
        assignment.tutor_id,
        `New Submission: ${assignment.title}`,
        `${studentName} submitted their assignment${isLate ? " (Late)" : ""}.`,
        "assignment",
        assignment.id,
        "assignment"
      );
    } catch {
      // non-blocking
    }
  }

  revalidatePath("/student/assignments");
  revalidatePath(`/student/assignments/${assignment?.id}`);
  return { success: true };
}

// ─── GRADE SUBMISSION (Tutor) ─────────────────────────────────────────────────

export async function gradeSubmission(submissionId: string, data: GradeSubmissionInput) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const validated = gradeSubmissionSchema.parse(data);
  const supabase = createAdminClient();

  // 1. Update grade
  const { data: updatedSub, error } = await supabase
    .from("assignment_submissions")
    .update({
      marks_obtained: validated.marksObtained,
      feedback: validated.feedback || null,
      status: "graded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .select(`id, assignment_id, student_id, assignments ( title, max_marks )`)
    .single();

  if (error || !updatedSub) throw new Error(`Failed to grade submission: ${error?.message}`);

  // 2. Notify student
  try {
    const { data: student } = await supabase
      .from("students")
      .select("auth_uid")
      .eq("id", updatedSub.student_id)
      .single();

    if (student?.auth_uid) {
      const assign = updatedSub.assignments as unknown as { title: string; max_marks: number } | null;
      const title = assign?.title || "Assignment";
      const maxMarks = assign?.max_marks || 100;
      const feedbackSnippet = validated.feedback ? ` • Feedback: "${validated.feedback}"` : "";

      await createNotification(
        student.auth_uid,
        `Assignment Graded: ${title}`,
        `You scored ${validated.marksObtained}/${maxMarks}${feedbackSnippet}`,
        "assignment",
        updatedSub.assignment_id,
        "assignment"
      );
    }
  } catch {
    // non-blocking
  }

  revalidatePath(`/tutor/assignments/${updatedSub.assignment_id}`);
  return { success: true };
}

// ─── MANUAL / OFFLINE SUBMISSION (Tutor) ──────────────────────────────────────

export async function manualStudentSubmission(
  submissionId: string,
  data: { marksObtained?: number; feedback?: string; status: "submitted" | "graded" }
) {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  const updateData: Record<string, any> = {
    status: data.status,
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (data.marksObtained !== undefined) updateData.marks_obtained = data.marksObtained;
  if (data.feedback !== undefined) updateData.feedback = data.feedback || null;

  const { data: updatedSub, error } = await supabase
    .from("assignment_submissions")
    .update(updateData)
    .eq("id", submissionId)
    .select(`id, assignment_id, student_id, assignments ( title, max_marks )`)
    .single();

  if (error || !updatedSub) throw new Error(`Failed to update offline submission: ${error?.message}`);

  if (data.status === "graded") {
    try {
      const { data: student } = await supabase
        .from("students")
        .select("auth_uid")
        .eq("id", updatedSub.student_id)
        .single();

      if (student?.auth_uid) {
        const assign = updatedSub.assignments as unknown as { title: string; max_marks: number } | null;
        await createNotification(
          student.auth_uid,
          `Assignment Graded: ${assign?.title || "Assignment"}`,
          `Score: ${data.marksObtained}/${assign?.max_marks || 100}`,
          "assignment",
          updatedSub.assignment_id,
          "assignment"
        );
      }
    } catch {
      // non-blocking
    }
  }

  revalidatePath(`/tutor/assignments/${updatedSub.assignment_id}`);
  return { success: true };
}

// ─── GET ASSIGNMENTS (Tutor / Student) ────────────────────────────────────────

export async function getAssignments(batchId?: string): Promise<AssignmentDoc[]> {
  const authState = await verifyUserAuth();
  const tutorId = authState.tutorId || (hasRoleAtLeast(authState.role, "tutor") ? authState.uid : null);

  if (!tutorId && authState.role !== "student") throw new Error("Unauthorized");

  const supabase = createAdminClient();

  // If Student
  if (authState.role === "student") {
    let studentBatches: string[] = [];
    if (authState.studentDocId) {
      const { data: student } = await supabase
        .from("students")
        .select("enrolled_batch_ids, tutor_id")
        .eq("id", authState.studentDocId)
        .single();
      studentBatches = student?.enrolled_batch_ids || [];
    }

    let query = supabase
      .from("assignments")
      .select(`*, batches ( name, subject )`)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (batchId) {
      query = query.eq("batch_id", batchId);
    } else if (studentBatches.length > 0) {
      query = query.in("batch_id", studentBatches);
    } else {
      return [];
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);

    return (data || []).map((a: any) => ({
      id: a.id,
      tutorId: a.tutor_id,
      batchId: a.batch_id,
      title: a.title,
      description: a.description,
      filePath: a.file_path || null,
      deadline: a.deadline,
      maxMarks: Number(a.max_marks),
      isPublished: a.is_published,
      createdAt: a.created_at,
      batchName: a.batches?.name,
      batchSubject: a.batches?.subject,
    }));
  }

  // If Tutor / Owner / Admin
  let query = supabase
    .from("assignments")
    .select(`
      *,
      batches ( name, subject ),
      assignment_submissions ( id, status, marks_obtained )
    `)
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (batchId && batchId !== "all") {
    query = query.eq("batch_id", batchId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);

  return (data || []).map((a: any) => {
    const submissions = a.assignment_submissions || [];
    const totalStudents = submissions.length;
    const submittedCount = submissions.filter((s: any) => s.status === "submitted" || s.status === "late").length;
    const gradedCount = submissions.filter((s: any) => s.status === "graded").length;
    const pendingCount = submissions.filter((s: any) => s.status === "pending").length;

    const gradedMarks = submissions
      .filter((s: any) => s.status === "graded" && s.marks_obtained !== null)
      .map((s: any) => Number(s.marks_obtained));
    
    const averageScore = gradedMarks.length > 0
      ? Math.round((gradedMarks.reduce((acc: number, curr: number) => acc + curr, 0) / gradedMarks.length) * 10) / 10
      : null;

    return {
      id: a.id,
      tutorId: a.tutor_id,
      batchId: a.batch_id,
      title: a.title,
      description: a.description,
      filePath: a.file_path || null,
      deadline: a.deadline,
      maxMarks: Number(a.max_marks),
      isPublished: a.is_published,
      createdAt: a.created_at,
      batchName: a.batches?.name,
      batchSubject: a.batches?.subject,
      totalStudents,
      submittedCount,
      gradedCount,
      pendingCount,
      averageScore,
    };
  });
}

// ─── GET SINGLE ASSIGNMENT BY ID ──────────────────────────────────────────────

export async function getAssignmentById(assignmentId: string): Promise<AssignmentDoc | null> {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  const { data: a, error } = await supabase
    .from("assignments")
    .select(`
      *,
      batches ( name, subject ),
      assignment_submissions ( id, status, marks_obtained )
    `)
    .eq("id", assignmentId)
    .single();

  if (error || !a) return null;

  const submissions = a.assignment_submissions || [];
  const totalStudents = submissions.length;
  const submittedCount = submissions.filter((s: any) => s.status === "submitted" || s.status === "late").length;
  const gradedCount = submissions.filter((s: any) => s.status === "graded").length;
  const pendingCount = submissions.filter((s: any) => s.status === "pending").length;

  const gradedMarks = submissions
    .filter((s: any) => s.status === "graded" && s.marks_obtained !== null)
    .map((s: any) => Number(s.marks_obtained));
  
  const averageScore = gradedMarks.length > 0
    ? Math.round((gradedMarks.reduce((acc: number, curr: number) => acc + curr, 0) / gradedMarks.length) * 10) / 10
    : null;

  return {
    id: a.id,
    tutorId: a.tutor_id,
    batchId: a.batch_id,
    title: a.title,
    description: a.description,
    filePath: a.file_path || null,
    deadline: a.deadline,
    maxMarks: Number(a.max_marks),
    isPublished: a.is_published,
    createdAt: a.created_at,
    batchName: a.batches?.name,
    batchSubject: a.batches?.subject,
    totalStudents,
    submittedCount,
    gradedCount,
    pendingCount,
    averageScore,
  };
}

// ─── GET SUBMISSIONS (Tutor) ──────────────────────────────────────────────────

export async function getSubmissions(assignmentId: string): Promise<SubmissionDoc[]> {
  const authState = await verifyUserAuth();
  if (!hasRoleAtLeast(authState.role, "tutor")) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(`
      *,
      students ( full_name, phone )
    `)
    .eq("assignment_id", assignmentId)
    .order("status", { ascending: true });

  if (error) throw new Error(`Failed to fetch submissions: ${error.message}`);

  return (data || []).map((s: any) => ({
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    filePath: s.file_path || null,
    studentNotes: s.student_notes || null,
    submittedAt: s.submitted_at || null,
    marksObtained: s.marks_obtained !== null ? Number(s.marks_obtained) : null,
    feedback: s.feedback || null,
    status: s.status,
    updatedAt: s.updated_at,
    studentName: (s.students as { full_name: string; phone: string } | null)?.full_name || "Unknown Student",
    studentPhone: (s.students as { full_name: string; phone: string } | null)?.phone || "",
  }));
}

// ─── GET STUDENT SUBMISSIONS (Student) ────────────────────────────────────────

export async function getStudentSubmissions(batchId?: string): Promise<SubmissionDoc[]> {
  const authState = await verifyUserAuth();
  if (authState.role !== "student" || !authState.studentDocId) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  let query = supabase
    .from("assignment_submissions")
    .select(`
      *,
      assignments (
        id,
        title,
        description,
        deadline,
        max_marks,
        file_path,
        batch_id,
        is_published,
        batches ( name )
      )
    `)
    .eq("student_id", authState.studentDocId)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch student submissions: ${error.message}`);

  const filtered = (data || []).filter((s: any) => {
    const a = s.assignments;
    if (!a || !a.is_published) return false;
    if (batchId && batchId !== "all" && a.batch_id !== batchId) return false;
    return true;
  });

  return filtered.map((s: any) => {
    const a = s.assignments;
    return {
      id: s.id,
      assignmentId: s.assignment_id,
      studentId: s.student_id,
      filePath: s.file_path || null,
      studentNotes: s.student_notes || null,
      submittedAt: s.submitted_at || null,
      marksObtained: s.marks_obtained !== null ? Number(s.marks_obtained) : null,
      feedback: s.feedback || null,
      status: s.status,
      updatedAt: s.updated_at,
      assignmentTitle: a?.title,
      assignmentDescription: a?.description,
      assignmentDeadline: a?.deadline,
      assignmentMaxMarks: a?.max_marks ? Number(a.max_marks) : 100,
      assignmentFilePath: a?.file_path || null,
      batchName: a?.batches?.name,
    };
  });
}
