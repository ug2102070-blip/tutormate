/**
 * TutorMate Payment HMAC Utility
 *
 * Generates and verifies HMAC-SHA256 tokens for payment callback URLs.
 * This prevents external actors from forging callback requests by guessing
 * or manipulating query parameters.
 *
 * The token is appended to all mock/sandbox callback URLs and verified
 * by the callback route handlers before any database write is performed.
 *
 * Required env: PAYMENT_CALLBACK_SECRET (min 32 chars, server-only)
 */

import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.PAYMENT_CALLBACK_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "[paymentHmac] PAYMENT_CALLBACK_SECRET is not set or is too short. " +
        "Add a 32+ character random secret to .env.local (server-only, no NEXT_PUBLIC_ prefix)."
    );
  }
  return secret;
}

/**
 * Generates an HMAC-SHA256 token for a payment callback.
 * @param gateway - "bkash" | "nagad" | "sslcommerz"
 * @param feeId   - UUID of the fee record
 * @param amount  - Numeric amount (must be the exact same value verified later)
 */
export function generateCallbackToken(
  gateway: string,
  feeId: string,
  amount: number
): string {
  return createHmac("sha256", getSecret())
    .update(`${gateway}:${feeId}:${amount}`)
    .digest("hex");
}

/**
 * Verifies a callback token using constant-time comparison.
 * Returns false (does NOT throw) so the caller can return a clean 400/403.
 */
export function verifyCallbackToken(
  token: string | null | undefined,
  gateway: string,
  feeId: string,
  amount: number
): boolean {
  if (!token) return false;
  try {
    const expected = generateCallbackToken(gateway, feeId, amount);
    // Constant-time buffer comparison — prevents timing oracle attacks
    const tokenBuf = Buffer.from(token, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (tokenBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(tokenBuf, expectedBuf);
  } catch {
    return false;
  }
}
