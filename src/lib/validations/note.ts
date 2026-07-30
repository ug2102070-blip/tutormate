import { z } from "zod";

export const noteSchema = z.object({
  title: z.string().min(1, "Title is required").max(150, "Title is too long"),
  content: z.string().max(5000, "Content is too long").optional(),
  color: z.enum(["default", "blue", "green", "yellow", "pink", "purple"]).default("default"),
  is_pinned: z.boolean().default(false),
});

export type NoteFormValues = z.infer<typeof noteSchema>;
