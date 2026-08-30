import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Bangladeshi Taka currency (e.g. ৳1,000 or ১,০০০৳ in Bengali)
 */
export function formatBDT(amount: number, lang: "en" | "bn" = "en"): string {
  if (lang === "bn") {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return `৳${Number(amount || 0).toLocaleString("en-US")}`;
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
 * Parses raw Supabase Auth and Server Action error codes/messages into clean, user-friendly error messages.
 */
export function formatAuthError(err: unknown): string {
  let msg = "";

  if (err instanceof Error) {
    msg = err.message || "";
  } else if (typeof err === "string") {
    msg = err;
  } else if (err && typeof err === "object") {
    const maybeObj = err as Record<string, any>;
    msg =
      maybeObj.message ||
      maybeObj.error_description ||
      maybeObj.error ||
      maybeObj.details ||
      "";
  }

  if (!msg) {
    return "An unexpected error occurred. Please try again.";
  }

  // Server-side rendering / Next.js Server Action / React errors
  if (
    msg.includes("unexpected response") ||
    msg.includes("Unexpected response") ||
    msg.includes("unexpected response was received") ||
    msg.includes("Server Components render") ||
    msg.includes("Server action not found") ||
    msg.includes("digest") ||
    msg.includes("minified React error")
  ) {
    return "Server communication error. Please refresh the page or check your connection and try again.";
  }

  // Supabase specific errors
  if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Invalid email or password. Please check your credentials.";
  }
  if (msg.includes("Email not confirmed")) {
    return "Please verify your email address before signing in. Check your inbox for a confirmation link.";
  }
  if (msg.includes("User already registered") || msg.includes("already been registered")) {
    return "This email address is already registered. Please sign in instead.";
  }
  if (msg.includes("Password should be at least")) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (msg.includes("Unable to validate email address")) {
    return "Please enter a valid email address.";
  }
  if (msg.includes("Error sending confirmation") || msg.includes("Error sending sms") || msg.includes("sms provider") || msg.includes("SMS")) {
    return "SMS delivery failed. Please check Twilio configuration or SMS permissions.";
  }
  if (msg.includes("Phone number") || msg.includes("phone_number") || msg.includes("invalid phone")) {
    return "Please enter a valid phone number.";
  }
  if (msg.includes("Token has expired") || msg.includes("token is expired") || msg.includes("token_expired") || msg.includes("otp_expired")) {
    return "Verification code has expired. Please request a new code.";
  }
  if (msg.includes("invalid token") || msg.includes("Token is invalid") || msg.includes("otp") || msg.includes("Token")) {
    return "Invalid verification code. Please check the code and try again.";
  }
  if (msg.includes("over_email_send_rate_limit") || msg.includes("over_sms_send_rate_limit") || msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) {
    return "Network error. Please check your internet connection and try again.";
  }

  // Firebase error fallbacks (legacy, kept for safety)
  if (msg.includes("auth/operation-not-allowed")) {
    return "This sign-in method is not enabled. Please contact support.";
  }
  if (msg.includes("auth/unauthorized-domain")) {
    const domain = typeof window !== "undefined" ? window.location.hostname : "your domain";
    return `Unauthorized domain (${domain}). Please contact support.`;
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
  return (
    msg
      .replace(/^Firebase:\s*Error\s*\(auth\//i, "")
      .replace(/\)\.?$/, "") || "An unexpected error occurred. Please try again."
  );
}

