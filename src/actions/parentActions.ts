"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";

// ---------------------------------------------------------------
// LINK PARENT TO STUDENT via invite code
// Called after parent has registered/logged in
// ---------------------------------------------------------------

export async function linkParentToStudent(
  inviteCode: string
): Promise<{ success: boolean; studentName?: string; message?: string }> {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  // 1. Find student by invite_code
  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("id, full_name, tutor_id, auth_uid")
    .eq("invite_code", inviteCode.trim().toUpperCase())
    .eq("status", "active")
    .single();

  if (studentErr || !student) {
    return { success: false, message: "Invalid invite code. Please check and try again." };
  }

  // 2. Extract auth user details to construct/upsert parent profile FIRST
  let userEmail = authState.email || "";
  let displayName = "Parent";
  let phoneNumber: string | null = null;

  try {
    const { data: adminUser } = await supabase.auth.admin.getUserById(authState.uid);
    if (adminUser?.user) {
      displayName =
        adminUser.user.user_metadata?.full_name ||
        adminUser.user.user_metadata?.displayName ||
        displayName;
      userEmail = adminUser.user.email || userEmail;
      phoneNumber =
        adminUser.user.phone ||
        adminUser.user.user_metadata?.phone_number ||
        null;
    }
  } catch {
    // Ignore fetch error
  }

  // Upsert parent profile record FIRST (so foreign key constraint parent_links_parent_uid_fkey is satisfied)
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: authState.uid,
    email: userEmail,
    display_name: displayName,
    phone_number: phoneNumber,
    role: "parent",
    tutor_id: student.tutor_id,
    student_doc_id: student.id,
    updated_at: new Date().toISOString(),
  });

  if (profileErr) {
    return { success: false, message: `Failed to create parent profile: ${profileErr.message}` };
  }

  // 3. Upsert parent_links row SECOND
  const { error: linkErr } = await supabase.from("parent_links").upsert(
    { parent_uid: authState.uid, student_id: student.id },
    { onConflict: "parent_uid, student_id" }
  );

    if (linkErr) {
      return { success: false, message: `Failed to link account: ${linkErr.message}` };
    }

    // 4. Sync user_metadata in Supabase Auth so client-side fetchUserClaims uses fast-path
    await supabase.auth.admin.updateUserById(authState.uid, {
      user_metadata: {
        role: "parent",
        tutorId: student.tutor_id,
        studentId: student.id,
        studentDocId: student.id,
        full_name: displayName,
      },
    }).catch((metaErr) => {
      console.warn("User metadata update error in linkParentToStudent:", metaErr);
    });

    return { success: true, studentName: student.full_name };
}

// ---------------------------------------------------------------
// GET LINKED CHILD INFO
// ---------------------------------------------------------------

async function getLinkedStudentId(parentUid: string): Promise<{
  studentId: string;
  studentAuthUid: string | null;
  tutorId: string;
} | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("parent_links")
    .select("student_id, students(id, auth_uid, tutor_id)")
    .eq("parent_uid", parentUid)
    .limit(1)
    .single();

  if (!data) return null;
  const student = data.students as any;
  return {
    studentId: data.student_id,
    studentAuthUid: student?.auth_uid ?? null,
    tutorId: student?.tutor_id ?? "",
  };
}

export async function getLinkedStudent() {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  const link = await getLinkedStudentId(authState.uid);
  if (!link) throw new Error("No linked student found. Please link your account first.");

  const { data: student, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", link.studentId)
    .single();

  if (error || !student) throw new Error("Student not found.");

  return {
    id: student.id,
    fullName: student.full_name,
    phone: student.phone,
    institution: student.institution,
    enrolledBatchIds: student.enrolled_batch_ids || [],
    status: student.status,
    inviteCode: student.invite_code,
  };
}

// ---------------------------------------------------------------
// PARENT DASHBOARD — summary stats for the child
// ---------------------------------------------------------------

export async function getParentDashboard() {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  const link = await getLinkedStudentId(authState.uid);
  if (!link) throw new Error("No linked student found.");

  const { studentId, tutorId } = link;

  // Attendance %
  const { data: attendanceDocs } = await supabase
    .from("attendance")
    .select("records")
    .eq("tutor_id", tutorId);

  let totalClasses = 0;
  let presentClasses = 0;

  for (const doc of attendanceDocs || []) {
    const records = doc.records as Record<string, { status: string }>;
    if (records[studentId]) {
      totalClasses++;
      if (records[studentId].status === "present" || records[studentId].status === "late") {
        presentClasses++;
      }
    }
  }

  const attendancePct = totalClasses > 0
    ? Math.round((presentClasses / totalClasses) * 100)
    : null;

  // Latest fee status
  const { data: latestFee } = await supabase
    .from("fees")
    .select("*")
    .eq("student_id", studentId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .single();

  // Upcoming exams
  const today = new Date().toISOString().split("T")[0];
  const { data: upcomingExams } = await supabase
    .from("exams")
    .select("id, title, subject, exam_date, total_marks")
    .eq("tutor_id", tutorId)
    .gte("exam_date", today)
    .order("exam_date", { ascending: true })
    .limit(3);

  // Pending assignments
  const { data: pendingSubmissions } = await supabase
    .from("assignment_submissions")
    .select("id, status, assignments(title, deadline)")
    .eq("student_id", studentId)
    .in("status", ["pending", "submitted"])
    .limit(3);

  // Recent attendance records (last 4 for dashboard timeline)
  const { data: recentAttendanceDocs } = await supabase
    .from("attendance")
    .select("id, date, records, batch_id, batches(name)")
    .eq("tutor_id", tutorId)
    .order("date", { ascending: false })
    .limit(10);

  const recentAttendance: Array<{ id: string; date: string; status: string; batchName: string | null }> = [];
  for (const doc of recentAttendanceDocs || []) {
    const records = doc.records as Record<string, { status: string }>;
    if (records?.[studentId]) {
      recentAttendance.push({
        id: `${doc.id ?? doc.date}-${doc.batch_id}`,
        date: doc.date,
        status: records[studentId].status,
        batchName: (doc.batches as any)?.name ?? null,
      });
      if (recentAttendance.length >= 4) break;
    }
  }

  return {
    studentId,
    attendancePct,
    totalClasses,
    presentClasses,
    latestFee: latestFee
      ? {
          month: latestFee.month,
          year: latestFee.year,
          amountDue: latestFee.amount_due,
          amountPaid: latestFee.amount_paid,
          status: latestFee.status,
        }
      : null,
    upcomingExams: (upcomingExams || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      subject: e.subject,
      examDate: e.exam_date,
      totalMarks: e.total_marks,
    })),
    pendingAssignments: (pendingSubmissions || []).map((s: any) => ({
      id: s.id,
      status: s.status,
      title: s.assignments?.title,
      deadline: s.assignments?.deadline,
    })),
    recentAttendance,
  };
}

// ---------------------------------------------------------------
// PARENT ATTENDANCE — full log for child
// ---------------------------------------------------------------

export async function getParentAttendance() {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  const link = await getLinkedStudentId(authState.uid);
  if (!link) throw new Error("No linked student found.");

  const { studentId, tutorId } = link;

  const { data: attendanceDocs, error } = await supabase
    .from("attendance")
    .select("date, batch_id, records, batches(name)")
    .eq("tutor_id", tutorId)
    .order("date", { ascending: false });

  if (error) throw new Error(`Failed to fetch attendance: ${error.message}`);

  const records = (attendanceDocs || [])
    .filter((doc: any) => doc.records && doc.records[studentId])
    .map((doc: any) => ({
      date: doc.date,
      batchId: doc.batch_id,
      batchName: (doc.batches as any)?.name ?? "Unknown Batch",
      status: doc.records[studentId].status,
      remarks: doc.records[studentId].remarks ?? null,
    }));

  const total = records.length;
  const present = records.filter((r: any) => r.status === "present" || r.status === "late").length;

  return {
    records,
    stats: {
      total,
      present,
      absent: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    },
  };
}

// ---------------------------------------------------------------
// PARENT FEES — fee history for child
// ---------------------------------------------------------------

export async function getParentFees() {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  const link = await getLinkedStudentId(authState.uid);
  if (!link) throw new Error("No linked student found.");

  const { data, error } = await supabase
    .from("fees")
    .select("*, batches(name)")
    .eq("student_id", link.studentId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) throw new Error(`Failed to fetch fees: ${error.message}`);

  return (data || []).map((f: any) => ({
    id: f.id,
    month: f.month,
    year: f.year,
    amountDue: f.amount_due,
    amountPaid: f.amount_paid,
    status: f.status,
    paymentMethod: f.payment_method,
    paidAt: f.paid_at,
    batchName: (f.batches as any)?.name ?? "Unknown",
  }));
}

// ---------------------------------------------------------------
// PARENT EXAM RESULTS
// ---------------------------------------------------------------

export async function getParentExamResults() {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  const link = await getLinkedStudentId(authState.uid);
  if (!link) throw new Error("No linked student found.");

  const { data, error } = await supabase
    .from("exam_results")
    .select("*, exams(title, subject, exam_date, total_marks, pass_marks)")
    .eq("student_id", link.studentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch results: ${error.message}`);

  return (data || []).map((r: any) => ({
    id: r.id,
    examId: r.exam_id,
    marksObtained: r.marks_obtained,
    grade: r.grade,
    position: r.position,
    remarks: r.remarks,
    isAbsent: r.is_absent,
    createdAt: r.created_at,
    exam: {
      title: r.exams?.title,
      subject: r.exams?.subject,
      examDate: r.exams?.exam_date,
      totalMarks: r.exams?.total_marks,
      passMarks: r.exams?.pass_marks,
    },
  }));
}

// ---------------------------------------------------------------
// PARENT ASSIGNMENTS — child's submission status
// ---------------------------------------------------------------

export async function getParentAssignments() {
  const authState = await verifyUserAuth();
  const supabase = createAdminClient();

  const link = await getLinkedStudentId(authState.uid);
  if (!link) throw new Error("No linked student found.");

  const { data, error } = await supabase
    .from("assignment_submissions")
    .select(`
      id, status, submitted_at, marks_obtained, feedback,
      assignments(title, description, deadline, max_marks)
    `)
    .eq("student_id", link.studentId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch assignments: ${error.message}`);

  return (data || []).map((s: any) => ({
    id: s.id,
    status: s.status,
    submittedAt: s.submitted_at,
    marksObtained: s.marks_obtained,
    feedback: s.feedback,
    assignment: {
      title: s.assignments?.title,
      description: s.assignments?.description,
      deadline: s.assignments?.deadline,
      maxMarks: s.assignments?.max_marks,
    },
  }));
}
