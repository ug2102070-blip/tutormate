"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { verifyUserAuth } from "@/lib/authHelpers";
import { hasRoleAtLeast } from "@/lib/permissions";
import { CalendarEvent } from "@/types";
import { getDaysInMonth, startOfMonth, endOfMonth, format, getDay } from "date-fns";

/**
 * Get all calendar events for a given month and year.
 * Aggregates data from events, exams, assignments, and batches.
 */
export async function getCalendarEvents(year: number, month: number) {
  const auth = await verifyUserAuth();
  const supabase = createAdminClient();

  // Resolve tutorId: explicit field first, then fall back to uid for tutor+ roles
  const tutorId = auth.tutorId || (hasRoleAtLeast(auth.role, "tutor") ? auth.uid : null);

  // If user has no assigned tutor (e.g., student/parent not linked to a tutor yet), return empty events instead of throwing
  if (!tutorId) {
    return [];
  }

  const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');

  let batchIdsToFilter: string[] | null = null;
  let enrolledBatches: any[] = [];
  const isStudentOrParent = auth.role === "student" || auth.role === "parent";

  // If student or parent, get enrolled batches for their student profile
  if (isStudentOrParent && auth.studentDocId) {
    const { data: student } = await supabase
      .from("students")
      .select("enrolled_batch_ids")
      .eq("id", auth.studentDocId)
      .single();
    
    if (student && Array.isArray(student.enrolled_batch_ids)) {
      batchIdsToFilter = student.enrolled_batch_ids;
    } else {
      batchIdsToFilter = [];
    }

    if (batchIdsToFilter && batchIdsToFilter.length > 0) {
      const { data } = await supabase
        .from("batches")
        .select("id, name, schedule")
        .eq("tutor_id", tutorId)
        .eq("is_archived", false)
        .in("id", batchIdsToFilter);
      enrolledBatches = data || [];
    }
  } else if (!isStudentOrParent) {
    // Tutor gets all batches
    const { data } = await supabase
      .from("batches")
      .select("id, name, schedule")
      .eq("tutor_id", tutorId)
      .eq("is_archived", false);
    enrolledBatches = data || [];
  }

  const calendarEvents: CalendarEvent[] = [];
  const validBatchIds = enrolledBatches.map(b => b.id);

  // 1. Fetch custom events
  let eventsQuery = supabase
    .from("events")
    .select("*")
    .eq("tutor_id", tutorId)
    .gte("event_date", startDate)
    .lte("event_date", endDate);
  
  if (isStudentOrParent) {
    // Student/Parent sees events for their batches OR shared events (batch_id IS NULL)
    if (validBatchIds.length > 0) {
      eventsQuery = eventsQuery.or(`batch_id.in.(${validBatchIds.join(',')}),batch_id.is.null`);
    } else {
      eventsQuery = eventsQuery.is("batch_id", null);
    }
  }

  const { data: eventsData, error: eventsErr } = await eventsQuery;
  if (!eventsErr && eventsData) {
    eventsData.forEach(e => {
      calendarEvents.push({
        id: e.id,
        date: e.event_date,
        title: e.title,
        type: "event",
        batchId: e.batch_id,
        color: e.type === "holiday" ? "bg-red-100 text-red-800" : "bg-purple-100 text-purple-800",
        extraData: { eventType: e.type }
      });
    });
  }

  // 2. Fetch Exams
  if (!isStudentOrParent || validBatchIds.length > 0) {
    let examsQuery = supabase
      .from("exams")
      .select("id, title, exam_date, batch_id")
      .eq("tutor_id", tutorId)
      .gte("exam_date", startDate)
      .lte("exam_date", endDate);

    if (isStudentOrParent) {
      examsQuery = examsQuery.in("batch_id", validBatchIds);
    }
    
    const { data: examsData } = await examsQuery;
    if (examsData) {
      examsData.forEach(e => {
        const batchName = enrolledBatches.find(b => b.id === e.batch_id)?.name;
        calendarEvents.push({
          id: e.id,
          date: e.exam_date,
          title: `Exam: ${e.title}`,
          type: "exam",
          batchId: e.batch_id,
          batchName,
          color: "bg-orange-100 text-orange-800"
        });
      });
    }

    // 3. Fetch Assignments
    let assignmentsQuery = supabase
      .from("assignments")
      .select("id, title, deadline, batch_id")
      .eq("tutor_id", tutorId)
      .gte("deadline", startDate)
      .lte("deadline", endDate + " 23:59:59"); // Deadline is TIMESTAMPTZ

    if (isStudentOrParent) {
      assignmentsQuery = assignmentsQuery.in("batch_id", validBatchIds).eq("is_published", true);
    }

    const { data: assignmentsData } = await assignmentsQuery;
    if (assignmentsData) {
      assignmentsData.forEach(a => {
        const batchName = enrolledBatches.find(b => b.id === a.batch_id)?.name;
        // Format TIMESTAMPTZ to YYYY-MM-DD
        const dateStr = a.deadline ? a.deadline.split('T')[0] : "";
        if (dateStr) {
          calendarEvents.push({
            id: a.id,
            date: dateStr,
            title: `Assignment due: ${a.title}`,
            type: "assignment",
            batchId: a.batch_id,
            batchName,
            color: "bg-blue-100 text-blue-800"
          });
        }
      });
    }

    // 4. Generate Recurring Classes
    const startObj = new Date(year, month - 1, 1);
    const numDays = getDaysInMonth(startObj);
    
    // Day string to number mapping (date-fns: 0=Sunday, 1=Monday...)
    const dayMap: Record<string, number> = {
      "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, 
      "Thursday": 4, "Friday": 5, "Saturday": 6
    };

    for (let day = 1; day <= numDays; day++) {
      const currentObj = new Date(year, month - 1, day);
      const currentDayNum = getDay(currentObj);
      const currentFormatted = format(currentObj, 'yyyy-MM-dd');
      
      enrolledBatches.forEach(batch => {
        if (batch.schedule && Array.isArray(batch.schedule)) {
          batch.schedule.forEach((sch: any) => {
            if (dayMap[sch.day] === currentDayNum) {
              calendarEvents.push({
                id: `class-${batch.id}-${currentFormatted}`,
                date: currentFormatted,
                title: `Class: ${batch.name} (${sch.time})`,
                type: "class",
                batchId: batch.id,
                batchName: batch.name,
                color: "bg-green-100 text-green-800"
              });
            }
          });
        }
      });
    }
  }

  // Sort events by date
  calendarEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return calendarEvents;
}

export async function createEvent(formData: FormData) {
  const auth = await verifyUserAuth();
  if (!hasRoleAtLeast(auth.role, "tutor")) throw new Error("Only tutors can create events");

  const title = formData.get("title") as string;
  const eventDate = formData.get("eventDate") as string;
  const type = formData.get("type") as "holiday" | "announcement" | "other";
  const batchId = formData.get("batchId") as string | null;

  if (!title || !eventDate || !type) {
    throw new Error("Missing required fields");
  }

  const tutorId = auth.tutorId || auth.uid;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      tutor_id: tutorId,
      batch_id: batchId || null,
      title,
      event_date: eventDate,
      type
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating event:", error);
    throw new Error(`Failed to create event: ${error.message || JSON.stringify(error)}`);
  }

  return data;
}

export async function deleteEvent(eventId: string) {
  const auth = await verifyUserAuth();
  if (!hasRoleAtLeast(auth.role, "tutor")) throw new Error("Only tutors can delete events");

  const tutorId = auth.tutorId || auth.uid;
  const supabase = createAdminClient();
  
  // Ensure the event belongs to this tutor
  const { data: existingEvent, error: getErr } = await supabase
    .from("events")
    .select("tutor_id")
    .eq("id", eventId)
    .single();
    
  if (getErr || !existingEvent) throw new Error("Event not found");
  if (existingEvent.tutor_id !== tutorId) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("Error deleting event:", error);
    throw new Error("Failed to delete event");
  }

  return true;
}
