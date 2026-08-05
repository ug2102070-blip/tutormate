"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { doubtSchema, messageSchema, type DoubtFormValues, type MessageFormValues } from "@/lib/validations/doubt";

/**
 * Creates a new doubt conversation in Supabase `doubts` table.
 */
export async function createDoubt(formData: DoubtFormValues, studentName: string) {
  const authState = await verifyUserAuth();
  if (authState.role !== "student") {
    throw new Error("Unauthorized: Only students can ask doubts.");
  }

  const studentAuthUid = authState.uid;
  const tutorId = authState.tutorId || "";
  const studentDocId = authState.studentDocId || "";

  if (!tutorId || !studentDocId) {
    throw new Error("Invalid student claims: missing tutorId or studentDocId");
  }

  const validated = doubtSchema.parse(formData);
  const supabase = createAdminClient();

  const { data: doubt, error } = await supabase
    .from("doubts")
    .insert({
      tutor_id: tutorId,
      student_doc_id: studentDocId,
      student_auth_uid: studentAuthUid,
      student_name: studentName,
      batch_id: validated.batchId,
      title: validated.title,
      initial_question: validated.initialQuestion,
      attachment_path: validated.attachmentPath || null,
      attachment_type: validated.attachmentType || (validated.attachmentPath ? "image" : null),
      attachment_name: validated.attachmentName || null,
      attachment_size: validated.attachmentSize || null,
      status: "pending",
      unread_by_tutor: true,
      unread_by_student: false,
    })
    .select("id")
    .single();

  if (error || !doubt) {
    throw new Error(`Failed to create doubt: ${error?.message || "Unknown error"}`);
  }

  return { success: true, doubtId: doubt.id };
}

/**
 * Posts a message reply into `doubt_messages` table.
 */
export async function postMessage(
  doubtId: string,
  formData: MessageFormValues
) {
  const authState = await verifyUserAuth();
  const callerUid = authState.uid;
  const callerRole = authState.role || "";
  const callerTutorId = authState.tutorId || "";

  const supabase = createAdminClient();

  const { data: doubt } = await supabase
    .from("doubts")
    .select("*")
    .eq("id", doubtId)
    .single();

  if (!doubt) {
    throw new Error("Doubt thread not found");
  }

  const isTutor = callerRole === "tutor" && callerTutorId === doubt.tutor_id;
  const isStudent = callerRole === "student" && callerUid === doubt.student_auth_uid;

  if (!isTutor && !isStudent) {
    throw new Error("Unauthorized to access this doubt thread");
  }

  const validated = messageSchema.parse(formData);

  const { data: message, error } = await supabase
    .from("doubt_messages")
    .insert({
      doubt_id: doubtId,
      sender_uid: callerUid,
      sender_role: isTutor ? "tutor" : "student",
      text: validated.text,
      attachment_path: validated.attachmentPath || null,
      attachment_type: validated.attachmentType || (validated.attachmentPath ? "image" : null),
      attachment_name: validated.attachmentName || null,
      attachment_size: validated.attachmentSize || null,
    })
    .select("id")
    .single();

  if (error || !message) {
    throw new Error(`Failed to post message: ${error?.message || "Unknown error"}`);
  }

  const updates: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
  };

  if (isTutor) {
    updates.unread_by_student = true;
    updates.unread_by_tutor = false;
    if (doubt.status === "pending") {
      updates.status = "answered";
    }
  } else {
    updates.unread_by_tutor = true;
    updates.unread_by_student = false;
  }

  await supabase.from("doubts").update(updates).eq("id", doubtId);

  return { success: true, messageId: message.id };
}

/**
 * Marks unread flags as read when opening a thread.
 */
export async function markDoubtAsRead(doubtId: string) {
  const authState = await verifyUserAuth();
  const callerUid = authState.uid;
  const callerRole = authState.role || "";
  const callerTutorId = authState.tutorId || "";

  const supabase = createAdminClient();

  const { data: doubt } = await supabase
    .from("doubts")
    .select("*")
    .eq("id", doubtId)
    .single();

  if (!doubt) return;

  const isTutor = callerRole === "tutor" && callerTutorId === doubt.tutor_id;
  const isStudent = callerRole === "student" && callerUid === doubt.student_auth_uid;

  if (isTutor && doubt.unread_by_tutor) {
    await supabase.from("doubts").update({ unread_by_tutor: false }).eq("id", doubtId);
  } else if (isStudent && doubt.unread_by_student) {
    await supabase.from("doubts").update({ unread_by_student: false }).eq("id", doubtId);
  }

  return { success: true };
}

/**
 * Updates status of a doubt (e.g. mark resolved).
 */
export async function updateDoubtStatus(
  doubtId: string,
  newStatus: "pending" | "answered" | "resolved"
) {
  const authState = await verifyUserAuth();
  const callerUid = authState.uid;
  const callerRole = authState.role || "";
  const callerTutorId = authState.tutorId || "";

  const supabase = createAdminClient();

  const { data: doubt } = await supabase
    .from("doubts")
    .select("*")
    .eq("id", doubtId)
    .single();

  if (!doubt) {
    throw new Error("Doubt not found");
  }

  const currentStatus = doubt.status;
  const isTutor = callerRole === "tutor" && callerTutorId === doubt.tutor_id;
  const isStudent = callerRole === "student" && callerUid === doubt.student_auth_uid;

  if (isStudent) {
    if (currentStatus !== "answered" || newStatus !== "resolved") {
      throw new Error("Students can only mark answered doubts as resolved.");
    }
  } else if (!isTutor && callerRole !== "admin") {
    throw new Error("Unauthorized");
  }

  await supabase.from("doubts").update({ status: newStatus }).eq("id", doubtId);

  return { success: true };
}
