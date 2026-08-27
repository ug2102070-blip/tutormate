import { z } from "zod";

export const timetableSlotSchema = z.object({
  id: z.string().optional(),
  classId: z.string().min(1, "Class ID is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  day: z.string().min(1, "Day is required"),
  periodIndex: z.number().int().min(0),
  periodTime: z.string().min(1, "Period timing is required"),
  subject: z.string().min(1, "Subject is required").max(100),
  teacher: z.string().max(100).optional().default(""),
  room: z.string().max(50).optional().default(""),
  note: z.string().max(300).optional().default(""),
  color: z.string().max(30).optional().default("blue"),
});

export type TimetableSlotFormValues = z.infer<typeof timetableSlotSchema>;

export const timetableSettingsSchema = z.object({
  classId: z.string().min(1),
  academicYear: z.string().min(1),
  days: z.array(z.string()).min(1, "At least one active day is required"),
  periods: z.array(z.string()).min(1, "At least one period is required"),
});

export type TimetableSettingsFormValues = z.infer<typeof timetableSettingsSchema>;

export const copyTimetableSchema = z.object({
  sourceClassId: z.string().min(1, "Source class is required"),
  targetClassId: z.string().min(1, "Target class is required"),
  academicYear: z.string().min(1, "Academic year is required"),
});

export type CopyTimetableFormValues = z.infer<typeof copyTimetableSchema>;
