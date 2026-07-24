import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "tutormate-cc55b";
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "tutormate-cc55b.firebasestorage.app";

  const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (envPrivateKey && !envPrivateKey.includes("DEMO")) {
    const clientEmail =
      process.env.FIREBASE_CLIENT_EMAIL ||
      `firebase-adminsdk@${projectId}.iam.gserviceaccount.com`;
    const privateKey = envPrivateKey.replace(/\\n/g, "\n");

    const serviceAccount: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey,
    };

    return initializeApp({
      credential: cert(serviceAccount),
      storageBucket,
    });
  }

  return initializeApp({
    projectId,
    storageBucket,
  });
}

const adminApp = getAdminApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
