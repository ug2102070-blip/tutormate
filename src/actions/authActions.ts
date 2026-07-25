"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { authRateLimiter } from "@/lib/ratelimit";
import { headers } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Sets custom claims for a newly registered tutor.
 * Verifies caller identity using Firebase Auth ID token.
 */
export async function setTutorClaims(idToken: string) {
  let uid: string;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (err) {
    console.warn("Could not verify ID token via Admin Auth:", err);
    return { success: false, error: "Unauthorized: Invalid or expired token" };
  }

  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    await authRateLimiter.limit(ip);
  } catch {
    // Continue silently if rate limiter instance fails
  }

  try {
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    const existingRoles: string[] = Array.isArray(existingClaims.roles)
      ? existingClaims.roles
      : existingClaims.role
      ? [existingClaims.role as string]
      : [];

    const updatedRoles = Array.from(new Set([...existingRoles, "tutor"]));

    const claims = {
      ...existingClaims,
      role: "tutor" as const,
      roles: updatedRoles,
      tutorId: uid,
    };

    await adminAuth.setCustomUserClaims(uid, claims);
  } catch (err) {
    console.warn("Could not set custom claims via Admin Auth:", err);
  }

  try {
    await adminDb.collection("users").doc(uid).set(
      {
        uid,
        role: "tutor",
        roles: FieldValue.arrayUnion("tutor"),
        tutorId: uid,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not write to Admin DB:", err);
  }

  return { success: true };
}

/**
 * Checks if user profile exists in Firestore /users collection via Admin DB.
 * Returns exists: false if Admin DB is not configured.
 */
export async function getUserProfile(uid: string) {
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (userDoc.exists) {
      return { exists: true, data: userDoc.data() };
    }
    return { exists: false, data: null };
  } catch (err) {
    console.warn("Could not fetch user profile via Admin DB:", err);
    return { exists: false, data: null };
  }
}

/**
 * Onboard a Google or Phone user as a Tutor via Admin DB after verifying ID token.
 */
export async function onboardTutorUser(
  data: {
    email: string | null;
    displayName: string;
    phoneNumber?: string | null;
    institution?: string;
  },
  idToken: string
) {
  let uid: string;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (err) {
    console.warn("Could not verify ID token via Admin Auth:", err);
    return { success: false, error: "Unauthorized: Invalid or expired token" };
  }

  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "127.0.0.1";
    await authRateLimiter.limit(ip);
  } catch {
    // Continue silently if rate limiter fails
  }

  const { email, displayName, phoneNumber, institution } = data;

  try {
    // 1. Create or update /users doc
    await adminDb.collection("users").doc(uid).set(
      {
        uid,
        email: email || null,
        displayName: displayName || "Tutor",
        phoneNumber: phoneNumber || null,
        photoURL: null,
        role: "tutor",
        roles: FieldValue.arrayUnion("tutor"),
        tutorId: uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // 2. Create or update /tutors doc
    await adminDb.collection("tutors").doc(uid).set(
      {
        id: uid,
        fullName: displayName || "Tutor",
        institution: institution || "Independent",
        contactPhone: phoneNumber || "",
        bkashNumber: null,
        nagadNumber: null,
        subscription: {
          plan: "free_trial",
          status: "active",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
          maxStudents: 50,
        },
        stats: {
          totalStudents: 0,
          activeBatches: 0,
          pendingDoubtsCount: 0,
        },
        createdAt: new Date(),
      },
      { merge: true }
    );

    // 3. Set custom claims
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    const existingRoles: string[] = Array.isArray(existingClaims.roles)
      ? existingClaims.roles
      : existingClaims.role
      ? [existingClaims.role as string]
      : [];

    const updatedRoles = Array.from(new Set([...existingRoles, "tutor"]));

    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: "tutor",
      roles: updatedRoles,
      tutorId: uid,
    });
  } catch (err) {
    console.warn("Could not complete onboardTutorUser via Admin SDK:", err);
  }

  return { success: true, role: "tutor" };
}

