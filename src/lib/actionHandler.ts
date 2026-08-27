import { z } from "zod";
import { verifyUserAuth, VerifiedAuth } from "@/lib/authHelpers";

export type ActionState<T> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Creates a type-safe Server Action wrapped with authentication and Zod validation.
 */
export function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  handler: (parsedInput: TInput, authContext: VerifiedAuth | null) => Promise<TOutput>,
  options: { requireAuth?: boolean } = { requireAuth: true }
) {
  return async (input: TInput): Promise<ActionState<TOutput>> => {
    try {
      let authContext: VerifiedAuth | null = null;
      if (options.requireAuth) {
        authContext = await verifyUserAuth();
      }

      const parsedInput = schema.parse(input);
      const data = await handler(parsedInput, authContext);
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0]?.message;
        return {
          success: false,
          error: firstIssue || "Validation failed",
          fieldErrors: error.flatten().fieldErrors,
        };
      }
      
      if (error instanceof Error && error.message === "Unauthorized") {
         return {
            success: false,
            error: "Unauthorized access",
         };
      }

      console.error("Action Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      };
    }
  };
}
