import * as z from "zod";

export const createExamSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  title: z.string().min(1, "Exam title is required").max(100),
  subject: z.string().nullable().optional(),
  examDate: z.string().min(1, "Exam date is required"),
  totalMarks: z.coerce.number().min(1, "Total marks must be greater than 0"),
  passMarks: z.coerce.number().optional().nullable(),
});

export type CreateExamInput = z.infer<typeof createExamSchema>;

export const updateExamSchema = z.object({
  title: z.string().min(1, "Exam title is required").max(100).optional(),
  subject: z.string().optional().nullable(),
  examDate: z.string().optional(),
  totalMarks: z.coerce.number().min(1).optional(),
  passMarks: z.coerce.number().optional().nullable(),
});

export type UpdateExamInput = z.infer<typeof updateExamSchema>;

export const saveExamResultsSchema = z.object({
  examId: z.string().min(1, "Exam ID is required"),
  results: z.array(
    z.object({
      studentId: z.string(),
      marksObtained: z.coerce.number().nullable(),
      isAbsent: z.boolean().default(false),
      remarks: z.string().nullable().optional(),
    })
  )
});

export type SaveExamResultsInput = z.infer<typeof saveExamResultsSchema>;
