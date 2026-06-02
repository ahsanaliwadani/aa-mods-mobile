import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

export const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
export const database = getDatabase(app);
export { ref, onValue };

export async function ensureAnonymousAuth(): Promise<void> {
  try {
    const auth = getAuth(app);
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch {
    // Auth optional — RTDB may allow public reads without auth
  }
}
