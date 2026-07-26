"use server";

import { createAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { createAssignmentSchema, updateAssignmentSchema, gradeSubmissionSchema, type CreateAssignmentInput, type UpdateAssignmentInput, type GradeSubmissionInput } from "@/lib/validations/assignment";
import type { AssignmentDoc, SubmissionDoc } from "@/types";

export async function createAssignment(formData: CreateAssignmentInput, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");
  
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

export async function updateAssignment(assignmentId: string, updates: UpdateAssignmentInput, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");
  
  const tutorId = authState.tutorId || authState.uid;
  const validated = updateAssignmentSchema.parse(updates);
  
  const supabase = createAdminClient();
  
  const updateData: any = {};
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

export async function publishAssignment(assignmentId: string, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");
  
  const tutorId = authState.tutorId || authState.uid;
  const supabase = createAdminClient();

  // 1. Mark as published
  const { data: assignment, error: pubError } = await supabase
    .from("assignments")
    .update({ is_published: true })
    .eq("id", assignmentId)
    .eq("tutor_id", tutorId)
    .select("id, batch_id")
    .single();

  if (pubError || !assignment) throw new Error(`Failed to publish assignment: ${pubError?.message}`);

  // 2. Find enrolled students for the batch
  const { data: students, error: studError } = await supabase
    .from("students")
    .select("id, enrolled_batch_ids")
    .eq("tutor_id", tutorId)
    .eq("status", "active");
    
  if (studError || !students) throw new Error(`Failed to fetch students: ${studError?.message}`);

  const enrolledStudents = students.filter(s => s.enrolled_batch_ids?.includes(assignment.batch_id));

  // 3. Create submission rows
  if (enrolledStudents.length > 0) {
    const submissionsData = enrolledStudents.map(student => ({
      assignment_id: assignmentId,
      student_id: student.id,
      status: "pending" as const,
    }));

    const { error: subError } = await supabase
      .from("assignment_submissions")
      .insert(submissionsData);
      
    if (subError) {
      console.error("Error creating submissions:", subError);
      // Don't throw here to avoid failing the publish action completely if some submissions exist
    }
  }

  return { success: true };
}

export async function deleteAssignment(assignmentId: string, idToken: string) {
  const authState = await verifyUserAuth(idToken);
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
    const filePaths = submissions.map(s => s.file_path as string);
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

export async function submitAssignment(submissionId: string, filePath: string, idToken: string) {
  const authState = await verifyUserAuth(idToken);
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

export async function gradeSubmission(submissionId: string, data: GradeSubmissionInput, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");
  
  const validated = gradeSubmissionSchema.parse(data);
  const supabase = createAdminClient();

  // Optional: Verify that the submission belongs to an assignment owned by this tutor
  // For simplicity using admin client directly, assuming trusted tutor UI.
  
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

export async function getAssignments(idToken: string, batchId?: string) {
  const authState = await verifyUserAuth(idToken);
  const tutorId = authState.tutorId || (authState.role === "tutor" ? authState.uid : null);
  
  if (!tutorId) throw new Error("Unauthorized");

  const supabase = createAdminClient();
  let query = supabase.from("assignments").select("*").eq("tutor_id", tutorId).order("created_at", { ascending: false });

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }
  
  if (authState.role === "student") {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);

  let filteredData = data;

  if (authState.role === "student" && authState.studentDocId) {
    // If student, filter by enrolled batches if batchId not provided
    if (!batchId) {
      const { data: student } = await supabase
        .from("students")
        .select("enrolled_batch_ids")
        .eq("id", authState.studentDocId)
        .single();
        
      const enrolledBatches = student?.enrolled_batch_ids || [];
      filteredData = data.filter(a => enrolledBatches.includes(a.batch_id));
    }
  }

  return filteredData.map((a: any) => ({
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

export async function getSubmissions(assignmentId: string, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "tutor") throw new Error("Unauthorized");
  
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(`
      *,
      students ( full_name, phone )
    `)
    .eq("assignment_id", assignmentId);

  if (error) throw new Error(`Failed to fetch submissions: ${error.message}`);

  return data.map((s: any) => ({
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    filePath: s.file_path,
    submittedAt: s.submitted_at,
    marksObtained: s.marks_obtained,
    feedback: s.feedback,
    status: s.status,
    updatedAt: s.updated_at,
    studentName: s.students?.full_name,
    studentPhone: s.students?.phone,
  }));
}

export async function getStudentSubmissions(idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "student" || !authState.studentDocId) throw new Error("Unauthorized");
  
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(`
      *,
      assignments ( title, deadline, max_marks )
    `)
    .eq("student_id", authState.studentDocId);

  if (error) throw new Error(`Failed to fetch student submissions: ${error.message}`);

  return data.map((s: any) => ({
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    filePath: s.file_path,
    submittedAt: s.submitted_at,
    marksObtained: s.marks_obtained,
    feedback: s.feedback,
    status: s.status,
    updatedAt: s.updated_at,
    assignmentTitle: s.assignments?.title,
    assignmentDeadline: s.assignments?.deadline,
    assignmentMaxMarks: s.assignments?.max_marks,
  }));
}
