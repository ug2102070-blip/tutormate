import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Bangladeshi Taka currency
 */
export function formatBDT(amount: number): string {
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate a short invite code for student self-linking
 */
export function generateInviteCode(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude confusable chars (0/O, 1/I/L)
  let code = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
}

/**
 * Format a date string (YYYY-MM-DD) into a localized display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Parses raw Firebase Auth error codes into clean, user-friendly error messages.
 */
export function formatAuthError(err: unknown): string {
  if (!(err instanceof Error)) return "An unexpected error occurred. Please try again.";
  const msg = err.message;

  if (msg.includes("auth/operation-not-allowed")) {
    return "Phone sign-in is disabled. Please enable 'Phone' in Firebase Console (Authentication -> Sign-in method -> Phone).";
  }
  if (msg.includes("auth/unauthorized-domain")) {
    return "Unauthorized domain: Please add 'localhost' to Authorized Domains in Firebase Console (Authentication -> Settings -> Authorized domains).";
  }
  if (msg.includes("auth/email-already-in-use")) {
    return "This email address is already registered. Please sign in instead.";
  }
  if (
    msg.includes("auth/invalid-credential") ||
    msg.includes("auth/wrong-password") ||
    msg.includes("auth/user-not-found")
  ) {
    return "Invalid email or password. Please check your credentials.";
  }
  if (msg.includes("auth/weak-password")) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (msg.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("auth/too-many-requests")) {
    return "Access blocked due to multiple failed attempts. Please try again later.";
  }

  // Fallback clean message
  return msg.replace(/^Firebase:\s*Error\s*\(auth\//i, "").replace(/\)\.?$/, "");
}
