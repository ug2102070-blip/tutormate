import { z } from "zod";

export const studentSchema = z.object({
  fullName: z.string().min(2, "Student full name is required"),
  phone: z.string().min(11, "Valid phone number required (e.g. 01712345678)"),
  guardianPhone: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
  enrolledBatchIds: z.array(z.string()).min(1, "Select at least one batch"),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
