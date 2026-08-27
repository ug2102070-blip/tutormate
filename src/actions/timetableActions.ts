"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { revalidatePath } from "next/cache";
import {
  timetableSlotSchema,
  timetableSettingsSchema,
  copyTimetableSchema,
  type TimetableSlotFormValues,
  type TimetableSettingsFormValues,
} from "@/lib/validations/timetable";

export interface TimetableSlot {
  id: string;
  classId: string;
  academicYear: string;
  day: string;
  periodIndex: number;
  periodTime: string;
  subject: string;
  teacher: string;
  room: string;
  note?: string;
  color: string;
}

export interface TimetableConflict {
  day: string;
  periodIndex: number;
  periodTime: string;
  teacher?: string;
  room?: string;
  currentClassId: string;
  conflictingClassId: string;
  conflictingClassName: string;
  conflictingSubject: string;
}

export interface TimetableResponse {
  slots: TimetableSlot[];
  settings: {
    days: string[];
    periods: string[];
  };
  availableClasses: { id: string; name: string; type: "class" | "batch" }[];
  conflicts: TimetableConflict[];
  tableExists: boolean;
}

const DEFAULT_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const DEFAULT_PERIODS = [
  "08:00 - 08:45 AM",
  "08:45 - 09:30 AM",
  "09:45 - 10:30 AM",
  "10:30 - 11:15 AM",
  "11:30 - 12:15 PM",
];

const DEFAULT_SEED_SCHEDULE: Record<
  string,
  { subject: string; teacher: string; room: string; color: string }[]
> = {
  Sunday: [
    { subject: "Mathematics", teacher: "Fatima Noor", room: "Room A-101", color: "blue" },
    { subject: "English", teacher: "Ahmed Raza", room: "Room A-101", color: "purple" },
    { subject: "Science", teacher: "Sana Malik", room: "Room A-101", color: "emerald" },
    { subject: "Computer Science", teacher: "Tariq Ali", room: "Lab-1", color: "cyan" },
    { subject: "Islamic Studies", teacher: "Hafiz Usman", room: "Room A-101", color: "amber" },
  ],
  Monday: [
    { subject: "English", teacher: "Ahmed Raza", room: "Room A-101", color: "purple" },
    { subject: "Mathematics", teacher: "Fatima Noor", room: "Room A-101", color: "blue" },
    { subject: "Social Studies", teacher: "Bilal Khan", room: "Room A-101", color: "rose" },
    { subject: "Science", teacher: "Sana Malik", room: "Room A-101", color: "emerald" },
    { subject: "Urdu", teacher: "Ayesha Bibi", room: "Room A-101", color: "indigo" },
  ],
  Tuesday: [
    { subject: "Science", teacher: "Sana Malik", room: "Room A-101", color: "emerald" },
    { subject: "Mathematics", teacher: "Fatima Noor", room: "Room A-101", color: "blue" },
    { subject: "Computer Science", teacher: "Tariq Ali", room: "Lab-1", color: "cyan" },
    { subject: "English", teacher: "Ahmed Raza", room: "Room A-101", color: "purple" },
    { subject: "Library / Activity", teacher: "Staff", room: "Library", color: "teal" },
  ],
  Wednesday: [
    { subject: "Mathematics", teacher: "Fatima Noor", room: "Room A-101", color: "blue" },
    { subject: "English", teacher: "Ahmed Raza", room: "Room A-101", color: "purple" },
    { subject: "Science", teacher: "Sana Malik", room: "Room A-101", color: "emerald" },
    { subject: "Islamic Studies", teacher: "Hafiz Usman", room: "Room A-101", color: "amber" },
    { subject: "Urdu", teacher: "Ayesha Bibi", room: "Room A-101", color: "indigo" },
  ],
  Thursday: [
    { subject: "English", teacher: "Ahmed Raza", room: "Room A-101", color: "purple" },
    { subject: "Mathematics", teacher: "Fatima Noor", room: "Room A-101", color: "blue" },
    { subject: "Science", teacher: "Sana Malik", room: "Room A-101", color: "emerald" },
    { subject: "Weekly Assessment", teacher: "Fatima Noor", room: "Room A-101", color: "amber" },
    { subject: "Physical Education", teacher: "Coach Asif", room: "Ground", color: "rose" },
  ],
};

const STANDARD_CLASSES = [
  { id: "class-1-a", name: "Class 1-A (Room A-101)", type: "class" as const },
  { id: "class-2-a", name: "Class 2-A (Room A-102)", type: "class" as const },
  { id: "class-3-a", name: "Class 3-A (Room A-103)", type: "class" as const },
  { id: "class-4-a", name: "Class 4-A (Room B-201)", type: "class" as const },
  { id: "class-5-a", name: "Class 5-A (Room B-202)", type: "class" as const },
  { id: "class-6-a", name: "Class 6-A (Room B-203)", type: "class" as const },
];

/**
 * Check if an error is due to missing SQL tables in Supabase
 */
function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === "string" ? err : err.message || JSON.stringify(err);
  return (
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("PGRST205") ||
    msg.includes("42P01")
  );
}

/**
 * Resolves the actual tutors.id for the authenticated user.
 */
async function resolveTutorId(authUid: string, explicitTutorId?: string): Promise<string> {
  if (explicitTutorId) return explicitTutorId;
  const adminSupabase = createAdminClient();
  try {
    const { data: tutor } = await adminSupabase
      .from("tutors")
      .select("id")
      .eq("user_id", authUid)
      .maybeSingle();

    if (tutor?.id) return tutor.id;
  } catch (err) {
    console.warn("Could not resolve tutor record:", err);
  }
  return authUid;
}

/**
 * Invalidate routine cache
 */
function invalidateTimetableCache() {
  revalidatePath("/tutor/timetable");
  revalidatePath("/tutor/dashboard");
}

/**
 * Fetch timetable data for a given class and academic year
 */
export async function getTimetableData(
  classId: string = "class-1-a",
  academicYear: string = "2026-27"
): Promise<TimetableResponse> {
  const authState = await verifyUserAuth();
  const tutorId = await resolveTutorId(authState.uid, authState.tutorId);
  const adminSupabase = createAdminClient();
  let tableExists = true;

  // 1. Fetch available live batches to combine with standard classes
  let availableClasses: { id: string; name: string; type: "class" | "batch" }[] = [
    ...STANDARD_CLASSES,
  ];
  try {
    const { data: batches } = await adminSupabase
      .from("batches")
      .select("id, name, grade_class")
      .eq("tutor_id", tutorId)
      .eq("is_archived", false);

    if (batches && batches.length > 0) {
      const batchOptions = batches.map((b) => ({
        id: b.id as string,
        name: `Batch: ${b.name} (${b.grade_class || "General"})`,
        type: "batch" as const,
      }));
      availableClasses = [...STANDARD_CLASSES, ...batchOptions];
    }
  } catch (err) {
    console.warn("Could not fetch batches for timetable:", err);
  }

  // 2. Fetch settings for this class & year
  let days = DEFAULT_DAYS;
  let periods = DEFAULT_PERIODS;

  try {
    const { data: settingsData, error: setErr } = await adminSupabase
      .from("timetable_settings")
      .select("days, periods")
      .eq("tutor_id", tutorId)
      .eq("class_id", classId)
      .eq("academic_year", academicYear)
      .maybeSingle();

    if (setErr && isTableMissingError(setErr)) {
      tableExists = false;
    } else if (settingsData) {
      if (Array.isArray(settingsData.days) && settingsData.days.length > 0) {
        days = settingsData.days;
      }
      if (Array.isArray(settingsData.periods) && settingsData.periods.length > 0) {
        periods = settingsData.periods;
      }
    }
  } catch (err) {
    if (isTableMissingError(err)) tableExists = false;
  }

  // 3. Fetch slots for selected class
  let slots: TimetableSlot[] = [];
  try {
    const { data: slotsData, error: slotErr } = await adminSupabase
      .from("timetables")
      .select("*")
      .eq("tutor_id", tutorId)
      .eq("class_id", classId)
      .eq("academic_year", academicYear);

    if (slotErr && isTableMissingError(slotErr)) {
      tableExists = false;
    } else if (!slotErr && slotsData && slotsData.length > 0) {
      slots = slotsData.map((s) => ({
        id: s.id,
        classId: s.class_id,
        academicYear: s.academic_year,
        day: s.day,
        periodIndex: s.period_index,
        periodTime: s.period_time,
        subject: s.subject,
        teacher: s.teacher || "",
        room: s.room || "",
        note: s.note || "",
        color: s.color || "blue",
      }));
    } else if (!slotsData || slotsData.length === 0) {
      // If class is class-1-a and no slots saved yet, generate standard seed slots
      if (classId === "class-1-a") {
        const seedSlots: TimetableSlot[] = [];
        days.forEach((day) => {
          const daySchedule = DEFAULT_SEED_SCHEDULE[day] || [];
          daySchedule.forEach((item, pIdx) => {
            if (pIdx < periods.length) {
              seedSlots.push({
                id: `seed-${day}-${pIdx}`,
                classId: "class-1-a",
                academicYear,
                day,
                periodIndex: pIdx,
                periodTime: periods[pIdx],
                subject: item.subject,
                teacher: item.teacher,
                room: item.room,
                note: "",
                color: item.color,
              });
            }
          });
        });
        slots = seedSlots;
      }
    }
  } catch (err) {
    if (isTableMissingError(err)) tableExists = false;
  }

  // 4. Compute Conflicts across all classes of this tutor
  const conflicts: TimetableConflict[] = [];
  if (tableExists) {
    try {
      const { data: allSlotsData } = await adminSupabase
        .from("timetables")
        .select("*")
        .eq("tutor_id", tutorId)
        .eq("academic_year", academicYear);

      if (allSlotsData && allSlotsData.length > 0) {
        const currentClassSlots = allSlotsData.filter((s) => s.class_id === classId);
        const otherClassSlots = allSlotsData.filter((s) => s.class_id !== classId);

        for (const cur of currentClassSlots) {
          for (const other of otherClassSlots) {
            if (cur.day === other.day && cur.period_index === other.period_index) {
              const sameTeacher =
                cur.teacher &&
                other.teacher &&
                cur.teacher.trim().toLowerCase() === other.teacher.trim().toLowerCase();
              const sameRoom =
                cur.room &&
                other.room &&
                cur.room.trim().toLowerCase() === other.room.trim().toLowerCase();

              if (sameTeacher || sameRoom) {
                const otherClassName =
                  availableClasses.find((c) => c.id === other.class_id)?.name || other.class_id;

                conflicts.push({
                  day: cur.day,
                  periodIndex: cur.period_index,
                  periodTime: cur.period_time,
                  teacher: sameTeacher ? cur.teacher : undefined,
                  room: sameRoom ? cur.room : undefined,
                  currentClassId: classId,
                  conflictingClassId: other.class_id,
                  conflictingClassName: otherClassName,
                  conflictingSubject: other.subject,
                });
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not calculate timetable conflicts:", err);
    }
  }

  return {
    slots,
    settings: { days, periods },
    availableClasses,
    conflicts,
    tableExists,
  };
}

/**
 * Save or update an individual timetable slot
 */
export async function saveTimetableSlot(formData: TimetableSlotFormValues) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized: Only tutors can manage routines.");
  }
  const tutorId = await resolveTutorId(authState.uid, authState.tutorId);
  const validated = timetableSlotSchema.parse(formData);
  const adminSupabase = createAdminClient();

  const isRealId = validated.id && !validated.id.startsWith("seed-") && !validated.id.startsWith("local-");

  try {
    if (isRealId) {
      const { data, error } = await adminSupabase
        .from("timetables")
        .update({
          subject: validated.subject,
          teacher: validated.teacher || "",
          room: validated.room || "",
          note: validated.note || "",
          color: validated.color || "blue",
          period_time: validated.periodTime,
          updated_at: new Date().toISOString(),
        })
        .eq("id", validated.id)
        .eq("tutor_id", tutorId)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return {
            success: true,
            isLocalFallback: true,
            slot: { ...validated, id: validated.id || `local-${Date.now()}` },
          };
        }
        throw new Error(`Failed to update timetable slot: ${error.message}`);
      }
      invalidateTimetableCache();
      return { success: true, slot: data };
    }

    // Delete any existing slot at the same coordinate
    await adminSupabase
      .from("timetables")
      .delete()
      .eq("tutor_id", tutorId)
      .eq("class_id", validated.classId)
      .eq("academic_year", validated.academicYear)
      .eq("day", validated.day)
      .eq("period_index", validated.periodIndex);

    // Insert new record
    const { data, error } = await adminSupabase
      .from("timetables")
      .insert({
        tutor_id: tutorId,
        class_id: validated.classId,
        academic_year: validated.academicYear,
        day: validated.day,
        period_index: validated.periodIndex,
        period_time: validated.periodTime,
        subject: validated.subject,
        teacher: validated.teacher || "",
        room: validated.room || "",
        note: validated.note || "",
        color: validated.color || "blue",
      })
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        return {
          success: true,
          isLocalFallback: true,
          slot: { ...validated, id: `local-${Date.now()}` },
        };
      }
      throw new Error(`Failed to save timetable slot: ${error.message}`);
    }

    invalidateTimetableCache();
    return { success: true, slot: data };
  } catch (err: any) {
    if (isTableMissingError(err)) {
      return {
        success: true,
        isLocalFallback: true,
        slot: { ...validated, id: `local-${Date.now()}` },
      };
    }
    throw err;
  }
}

/**
 * Delete a timetable slot
 */
export async function deleteTimetableSlot(
  slotId: string,
  classId: string,
  academicYear: string,
  day: string,
  periodIndex: number
) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const tutorId = await resolveTutorId(authState.uid, authState.tutorId);
  const adminSupabase = createAdminClient();

  try {
    if (slotId && !slotId.startsWith("seed-") && !slotId.startsWith("local-")) {
      const { error } = await adminSupabase
        .from("timetables")
        .delete()
        .eq("id", slotId)
        .eq("tutor_id", tutorId);

      if (error && !isTableMissingError(error)) {
        throw new Error(`Failed to delete slot: ${error.message}`);
      }
    } else {
      await adminSupabase
        .from("timetables")
        .delete()
        .eq("tutor_id", tutorId)
        .eq("class_id", classId)
        .eq("academic_year", academicYear)
        .eq("day", day)
        .eq("period_index", periodIndex);
    }
  } catch (err) {
    if (!isTableMissingError(err)) throw err;
  }

  invalidateTimetableCache();
  return { success: true };
}

/**
 * Save custom timetable settings (days and periods)
 */
export async function saveTimetableSettings(formData: TimetableSettingsFormValues) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const tutorId = await resolveTutorId(authState.uid, authState.tutorId);
  const validated = timetableSettingsSchema.parse(formData);
  const adminSupabase = createAdminClient();

  try {
    const { error } = await adminSupabase.from("timetable_settings").upsert(
      {
        tutor_id: tutorId,
        class_id: validated.classId,
        academic_year: validated.academicYear,
        days: validated.days,
        periods: validated.periods,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tutor_id,class_id,academic_year" }
    );

    if (error && !isTableMissingError(error)) {
      throw new Error(`Failed to save settings: ${error.message}`);
    }
  } catch (err) {
    if (!isTableMissingError(err)) throw err;
  }

  invalidateTimetableCache();
  return { success: true };
}

/**
 * Bulk save or update full timetable grid
 */
export async function bulkSaveTimetable(
  classId: string,
  academicYear: string,
  slots: TimetableSlotFormValues[],
  settings?: { days: string[]; periods: string[] }
) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const tutorId = await resolveTutorId(authState.uid, authState.tutorId);
  const adminSupabase = createAdminClient();

  try {
    if (settings) {
      await adminSupabase.from("timetable_settings").upsert(
        {
          tutor_id: tutorId,
          class_id: classId,
          academic_year: academicYear,
          days: settings.days,
          periods: settings.periods,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tutor_id,class_id,academic_year" }
      );
    }

    await adminSupabase
      .from("timetables")
      .delete()
      .eq("tutor_id", tutorId)
      .eq("class_id", classId)
      .eq("academic_year", academicYear);

    if (slots.length > 0) {
      const insertPayload = slots.map((s) => ({
        tutor_id: tutorId,
        class_id: classId,
        academic_year: academicYear,
        day: s.day,
        period_index: s.periodIndex,
        period_time: s.periodTime,
        subject: s.subject,
        teacher: s.teacher || "",
        room: s.room || "",
        note: s.note || "",
        color: s.color || "blue",
      }));

      const { error } = await adminSupabase.from("timetables").insert(insertPayload);
      if (error && !isTableMissingError(error)) {
        throw new Error(`Failed to bulk save slots: ${error.message}`);
      }
    }
  } catch (err) {
    if (!isTableMissingError(err)) throw err;
  }

  invalidateTimetableCache();
  return { success: true };
}

/**
 * Copy entire timetable from one class to another
 */
export async function copyTimetable(
  sourceClassId: string,
  targetClassId: string,
  academicYear: string
) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const tutorId = await resolveTutorId(authState.uid, authState.tutorId);
  const adminSupabase = createAdminClient();

  try {
    const { data: sourceSettings } = await adminSupabase
      .from("timetable_settings")
      .select("days, periods")
      .eq("tutor_id", tutorId)
      .eq("class_id", sourceClassId)
      .eq("academic_year", academicYear)
      .maybeSingle();

    if (sourceSettings) {
      await adminSupabase.from("timetable_settings").upsert(
        {
          tutor_id: tutorId,
          class_id: targetClassId,
          academic_year: academicYear,
          days: sourceSettings.days,
          periods: sourceSettings.periods,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tutor_id,class_id,academic_year" }
      );
    }

    const { data: sourceSlots } = await adminSupabase
      .from("timetables")
      .select("*")
      .eq("tutor_id", tutorId)
      .eq("class_id", sourceClassId)
      .eq("academic_year", academicYear);

    if (sourceSlots && sourceSlots.length > 0) {
      await adminSupabase
        .from("timetables")
        .delete()
        .eq("tutor_id", tutorId)
        .eq("class_id", targetClassId)
        .eq("academic_year", academicYear);

      const targetPayload = sourceSlots.map((s) => ({
        tutor_id: tutorId,
        class_id: targetClassId,
        academic_year: academicYear,
        day: s.day,
        period_index: s.period_index,
        period_time: s.period_time,
        subject: s.subject,
        teacher: s.teacher || "",
        room: s.room || "",
        note: s.note || "",
        color: s.color || "blue",
      }));

      await adminSupabase.from("timetables").insert(targetPayload);
    }
  } catch (err) {
    if (!isTableMissingError(err)) throw err;
  }

  invalidateTimetableCache();
  return { success: true };
}

/**
 * Clear all slots for a class in an academic year
 */
export async function clearTimetable(classId: string, academicYear: string) {
  const authState = await verifyUserAuth();
  if (authState.role !== "tutor" && authState.role !== "owner" && authState.role !== "admin") {
    throw new Error("Unauthorized");
  }
  const tutorId = await resolveTutorId(authState.uid, authState.tutorId);
  const adminSupabase = createAdminClient();

  try {
    const { error } = await adminSupabase
      .from("timetables")
      .delete()
      .eq("tutor_id", tutorId)
      .eq("class_id", classId)
      .eq("academic_year", academicYear);

    if (error && !isTableMissingError(error)) {
      throw new Error(`Failed to clear timetable: ${error.message}`);
    }
  } catch (err) {
    if (!isTableMissingError(err)) throw err;
  }

  invalidateTimetableCache();
  return { success: true };
}
