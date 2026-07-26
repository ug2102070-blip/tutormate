import { z } from "zod";

export const createAssignmentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long"),
  description: z.string().optional(),
  batchId: z.string().uuid("Invalid batch ID"),
  deadline: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  maxMarks: z.coerce.number().min(1, "Max marks must be at least 1").default(100),
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

export const gradeSubmissionSchema = z.object({
  marksObtained: z.coerce.number().min(0, "Marks cannot be negative"),
  feedback: z.string().optional(),
});

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
