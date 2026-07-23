import { z } from "zod";

export const doubtSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  initialQuestion: z.string().min(5, "Question details must be at least 5 characters").max(2000, "Question text exceeds 2000 characters"),
  batchId: z.string().min(1, "Batch is required"),
  attachmentPath: z.string().nullable().optional(),
});

export const messageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty").max(5000, "Message text exceeds 5000 characters"),
  attachmentPath: z.string().nullable().optional(),
});

export type DoubtFormValues = z.infer<typeof doubtSchema>;
export type MessageFormValues = z.infer<typeof messageSchema>;
