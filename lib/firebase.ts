import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB42oKwcnidARF1csT-zBGB-1bsvck8A_8",
  authDomain: "aa-mods.firebaseapp.com",
  databaseURL: "https://aa-mods-default-rtdb.firebaseio.com",
  projectId: "aa-mods",
  storageBucket: "aa-mods.firebasestorage.app",
  messagingSenderId: "208308827331",
  appId: "1:208308827331:android:a20b1c534f2b7df892de76",
  measurementId: "G-SEFN4WE4PT",
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
