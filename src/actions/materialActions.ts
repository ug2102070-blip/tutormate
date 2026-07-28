"use server";

import { createAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { materialSchema, type MaterialFormValues } from "@/lib/validations/material";
import type { MaterialDoc } from "@/types";
import { createNotification } from "@/actions/notificationActions";

/**
 * Creates a new material document. The actual file should be uploaded
 * client-side to Supabase Storage before calling this.
 */
export async function createMaterial(formData: MaterialFormValues, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can create materials.");
  }
  const tutorId = authState.tutorId || authState.uid;
  const validated = materialSchema.parse(formData);

  const supabase = await getSupabaseServerClient();

  const insertData = {
    tutor_id: tutorId,
    batch_id: validated.batchId || null,
    title: validated.title,
    description: validated.description || null,
    file_path: validated.filePath,
    file_type: validated.fileType,
    file_size: validated.fileSize || null,
    is_published: validated.isPublished,
  };

  let { data: material, error } = await supabase
    .from("materials")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    // Fallback to admin client if client insert had RLS issue
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("materials")
      .insert(insertData)
      .select("id")
      .single();

    material = adminRes.data;
    error = adminRes.error;
  }

  if (error || !material) {
    throw new Error(`Failed to save material: ${error?.message || "Unknown error"}`);
  }

  // Notify students if material is published
  if (validated.isPublished) {
    const adminSupabase = createAdminClient();
    // Find students to notify: enrolled in the specific batch, or all if no batch
    let studentsQuery = adminSupabase
      .from("students")
      .select("id, auth_uid, enrolled_batch_ids")
      .eq("tutor_id", tutorId)
      .eq("status", "active");

    const { data: allStudents } = await studentsQuery;

    const studentsToNotify = (allStudents || []).filter((s: any) => {
      if (!validated.batchId) return true; // global material — notify all
      return s.enrolled_batch_ids?.includes(validated.batchId);
    });

    for (const student of studentsToNotify) {
      if (student.auth_uid) {
        await createNotification(
          student.auth_uid,
          `New Material: ${validated.title}`,
          validated.description || null,
          "material",
          material.id,
          "material"
        );
      }
    }
  }

  return { success: true, materialId: material.id };
}

/**
 * Updates an existing material (title, description, is_published, batch_id).
 */
export async function updateMaterial(
  materialId: string,
  updates: Partial<MaterialFormValues>,
  idToken: string
) {
  const authState = await verifyUserAuth(idToken);
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized: Only tutors can update materials.");
  }
  const tutorId = authState.tutorId || authState.uid;

  const supabase = await getSupabaseServerClient();
  
  const updateData: any = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.batchId !== undefined) updateData.batch_id = updates.batchId || null;
  if (updates.isPublished !== undefined) updateData.is_published = updates.isPublished;

  let { error } = await supabase
    .from("materials")
    .update(updateData)
    .eq("id", materialId)
    .eq("tutor_id", tutorId);

  if (error) {
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("materials")
      .update(updateData)
      .eq("id", materialId)
      .eq("tutor_id", tutorId);
    error = adminRes.error;
  }

  if (error) {
    throw new Error(`Failed to update material: ${error.message}`);
  }

  return { success: true };
}

/**
 * Deletes a material row. Storage file must be deleted separately.
 */
export async function deleteMaterial(materialId: string, idToken: string) {
  const authState = await verifyUserAuth(idToken);
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized");
  }
  const tutorId = authState.tutorId || authState.uid;

  const supabase = await getSupabaseServerClient();

  // First, get the file_path to delete the file from storage
  let { data: material, error: getErr } = await supabase
    .from("materials")
    .select("file_path")
    .eq("id", materialId)
    .eq("tutor_id", tutorId)
    .single();

  if (getErr || !material) {
    const adminSupabase = createAdminClient();
    const { data: adminMaterial } = await adminSupabase
      .from("materials")
      .select("file_path")
      .eq("id", materialId)
      .eq("tutor_id", tutorId)
      .single();
    material = adminMaterial;
  }

  if (material?.file_path) {
    // Delete file from storage
    const adminSupabase = createAdminClient();
    await adminSupabase.storage.from("attachments").remove([material.file_path]);
  }

  // Delete db row
  let { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId)
    .eq("tutor_id", tutorId);

  if (error) {
    const adminSupabase = createAdminClient();
    const adminRes = await adminSupabase
      .from("materials")
      .delete()
      .eq("id", materialId)
      .eq("tutor_id", tutorId);
    error = adminRes.error;
  }

  if (error) {
    throw new Error(`Failed to delete material: ${error.message}`);
  }

  return { success: true };
}

/**
 * Gets materials for a tutor (all of them, optionally filtered by batch)
 */
export async function getTutorMaterials(idToken: string, batchId?: string) {
  const authState = await verifyUserAuth(idToken);
  if (!hasRoleAtLeast(authState.role, "tutor")) {
    throw new Error("Unauthorized");
  }
  const tutorId = authState.tutorId || authState.uid;

  const supabase = createAdminClient();

  let query = supabase
    .from("materials")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch materials: ${error.message}`);
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    tutorId: m.tutor_id,
    batchId: m.batch_id,
    title: m.title,
    description: m.description,
    filePath: m.file_path,
    fileType: m.file_type,
    fileSize: m.file_size,
    isPublished: m.is_published,
    createdAt: m.created_at,
  })) as MaterialDoc[];
}

/**
 * Gets materials for a student (filtered to their batches and global materials)
 */
export async function getStudentMaterials(idToken: string, batchId?: string) {
  const authState = await verifyUserAuth(idToken);
  if (authState.role !== "student" || !authState.studentDocId || !authState.tutorId) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  // Need to get student's enrolled batches
  const { data: student } = await supabase
    .from("students")
    .select("enrolled_batch_ids")
    .eq("id", authState.studentDocId)
    .single();

  const enrolledBatchIds = student?.enrolled_batch_ids || [];

  // query materials for this tutor
  let query = supabase
    .from("materials")
    .select("*")
    .eq("tutor_id", authState.tutorId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch materials: ${error.message}`);
  }

  // Filter in memory
  const filtered = (data || []).filter((m: any) => {
    if (m.batch_id === null) return true;
    if (batchId) return m.batch_id === batchId;
    return enrolledBatchIds.includes(m.batch_id);
  });

  return filtered.map((m: any) => ({
    id: m.id,
    tutorId: m.tutor_id,
    batchId: m.batch_id,
    title: m.title,
    description: m.description,
    filePath: m.file_path,
    fileType: m.file_type,
    fileSize: m.file_size,
    isPublished: m.is_published,
    createdAt: m.created_at,
  })) as MaterialDoc[];
}
