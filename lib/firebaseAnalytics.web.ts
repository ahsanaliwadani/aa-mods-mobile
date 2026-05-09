import { app } from "./firebase";

let analyticsInstance: import("firebase/analytics").Analytics | null = null;
let analyticsReady = false;

(async () => {
  try {
    const { isSupported, getAnalytics } = await import("firebase/analytics");
    if (await isSupported()) {
      analyticsInstance = getAnalytics(app);
      analyticsReady = true;
    }
  } catch {}
})();

export function logAnalyticsEvent(
  event: string,
  params?: Record<string, string | number | boolean | null>,
): void {
  if (!analyticsReady || !analyticsInstance) return;
  try {
    import("firebase/analytics").then(({ logEvent }) => {
      if (analyticsInstance) logEvent(analyticsInstance, event, params as Record<string, string>);
    }).catch(() => {});
  } catch {}
}
