import { z } from "zod";

export const materialSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().max(2000, "Description exceeds 2000 characters").nullable().optional(),
  batchId: z.string().nullable().optional(), // If null or empty, it means shared with all batches
  filePath: z.string().min(1, "File path is required"),
  fileType: z.enum(["pdf", "video", "image", "docx", "ppt", "other"]),
  fileSize: z.number().nullable().optional(),
  isPublished: z.boolean().default(true),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;
