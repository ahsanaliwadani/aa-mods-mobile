import { Platform } from "react-native";
import { database } from "@/lib/firebase";
import { ref, push } from "firebase/database";

export function initCrashlytics(): void {
  if (__DEV__) console.log("[Crashlytics] Initialized");
}

export async function recordError(error: Error, context?: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await push(ref(database, "crashReports"), {
      message: error.message,
      stack: (error.stack ?? "").slice(0, 2000),
      context: context ?? "",
      platform: Platform.OS,
      timestamp: Date.now(),
      isoDate: new Date().toISOString(),
    });
  } catch {
    // Never throw from crash reporter
  }
}

export function log(message: string): void {
  if (__DEV__) console.log("[Crashlytics]", message);
}

export function setAttribute(_key: string, _value: string): void {
  // Stored via context parameter in recordError
}

export function setUserId(_id: string): void {
  // Reserved for future user account support
}
