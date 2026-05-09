import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { app } from "./firebase";

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
let analyticsReady = false;

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
