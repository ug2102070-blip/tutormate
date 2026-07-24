"use me"; // Server action directive below
"use server";

import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { authRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";

const FeedbackSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userRole: z.enum(["tutor", "student", "unknown"]),
  rating: z.number().min(1).max(5),
  category: z.enum([
    "ease_of_use",
    "missing_feature",
    "bug_report",
    "pricing",
    "other",
  ]),
  message: z.string().min(3, "Message must be at least 3 characters long").max(2000),
  suggestedPrice: z.string().max(100).optional(),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;

export async function submitFeedbackAction(input: FeedbackInput) {
  try {
    const validated = FeedbackSchema.parse(input);

    // Basic IP rate limiting
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for") || "127.0.0.1";
    const rateCheck = await authRateLimiter.limit(`feedback:${ip}`);
    if (!rateCheck.success) {
      return {
        success: false,
        error: "Too many feedback submissions. Please try again in a minute.",
      };
    }

    // Persist to Firestore feedback collection
    await adminDb.collection("feedback").add({
      userId: validated.userId,
      userRole: validated.userRole,
      rating: validated.rating,
      category: validated.category,
      message: validated.message,
      suggestedPrice: validated.suggestedPrice || "",
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Thank you for your valuable feedback!",
    };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to submit feedback.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
