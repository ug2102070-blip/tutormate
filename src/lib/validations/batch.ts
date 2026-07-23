import { z } from "zod";

export const scheduleEntrySchema = z.object({
  day: z.string().min(1, "Day is required"),
  time: z.string().min(1, "Time is required"),
});

export const batchSchema = z.object({
  name: z.string().min(2, "Batch name must be at least 2 characters"),
  subject: z.string().min(2, "Subject is required"),
  gradeClass: z.string().min(1, "Grade / Class is required"),
  monthlyFee: z.number().min(0, "Monthly fee cannot be negative"),
  schedule: z.array(scheduleEntrySchema).min(1, "At least one schedule entry is required"),
});

export type BatchFormValues = z.infer<typeof batchSchema>;
