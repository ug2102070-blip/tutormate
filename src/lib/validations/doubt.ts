import { z } from "zod";

export const doubtSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  initialQuestion: z.string().min(1, "Question required").max(2000, "Question text exceeds 2000 characters"),
  batchId: z.string().min(1, "Batch is required"),
  attachmentPath: z.string().nullable().optional(),
  attachmentType: z.enum(["image", "file", "audio"]).nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  attachmentSize: z.number().nullable().optional(),
});

export const messageSchema = z.object({
  text: z.string().max(5000, "Message text exceeds 5000 characters").default(""),
  attachmentPath: z.string().nullable().optional(),
  attachmentType: z.enum(["image", "file", "audio"]).nullable().optional(),
  attachmentName: z.string().nullable().optional(),
  attachmentSize: z.number().nullable().optional(),
});

export type DoubtFormValues = z.infer<typeof doubtSchema>;
export type MessageFormValues = z.infer<typeof messageSchema>;
