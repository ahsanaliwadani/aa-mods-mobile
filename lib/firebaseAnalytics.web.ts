import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { app } from "./firebase";

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
let analyticsReady = false;

// Suppress the Firebase Analytics measurement ID mismatch warning (expected
// when using an Android app ID on web — analytics still works in degraded mode)
const _origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[1] === "string" ? args[1] : "";
  if (msg.includes("measurement ID")) return;
  _origWarn.apply(console, args);
};

isSupported()
  .then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
      analyticsReady = true;
    }
  })
  .catch(() => {});

export function logAnalyticsEvent(
  event: string,
  params?: Record<string, string | number | boolean | null>,
): void {
  if (!analyticsReady || !analyticsInstance) return;
  try {
    logEvent(analyticsInstance, event, params as Record<string, string>);
  } catch {}
}
