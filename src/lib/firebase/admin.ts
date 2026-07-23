import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "tutormate-demo";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "demo@tutormate-demo.iam.gserviceaccount.com";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "-----BEGIN PRIVATE KEY-----\nDEMO\n-----END PRIVATE KEY-----").replace(/\\n/g, "\n");

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey,
  };

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "tutormate-demo.appspot.com",
  });
}

const adminApp = getAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
