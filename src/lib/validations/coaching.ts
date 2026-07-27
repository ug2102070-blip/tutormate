import { z } from "zod";

export const createCoachingCenterSchema = z.object({
  name: z.string().min(2, "Coaching center name must be at least 2 characters"),
  address: z.string().optional(),
  contactPhone: z.string().min(6, "Contact phone must be at least 6 digits").optional().or(z.literal("")),
});

export const updateCoachingCenterSchema = createCoachingCenterSchema;

export const joinCoachingCenterSchema = z.object({
  code: z.string().min(4, "Invalid join code format").max(20, "Invalid join code length"),
});

export type CreateCoachingCenterInput = z.infer<typeof createCoachingCenterSchema>;
export type JoinCoachingCenterInput = z.infer<typeof joinCoachingCenterSchema>;
