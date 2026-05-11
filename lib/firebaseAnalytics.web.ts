import { app } from "./firebase";

type EvParams = Record<string, string | number | boolean | null>;
type QueuedEvent = { event: string; params?: EvParams };

let analyticsInstance: import("firebase/analytics").Analytics | null = null;
let analyticsReady = false;
const _queue: QueuedEvent[] = [];

(async () => {
  try {
    const { isSupported, getAnalytics, setAnalyticsCollectionEnabled } = await import("firebase/analytics");
    if (await isSupported()) {
      analyticsInstance = getAnalytics(app);
      setAnalyticsCollectionEnabled(analyticsInstance, true);
      analyticsReady = true;

      if (_queue.length > 0) {
        const { logEvent } = await import("firebase/analytics");
        const pending = _queue.splice(0);
        for (const { event, params } of pending) {
          try {
            if (analyticsInstance) {
              logEvent(analyticsInstance, event, (params ?? {}) as Record<string, string>);
            }
          } catch {}
        }
      }

      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.log("[Analytics:web] Firebase Analytics initialized");
      }
    } else {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("[Analytics:web] Firebase Analytics not supported in this environment");
      }
    }
  } catch (err) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[Analytics:web] Firebase Analytics init error:", err);
    }
  }
})();

export function logAnalyticsEvent(
  event: string,
  params?: EvParams,
): void {
  try {
    if (!analyticsReady || !analyticsInstance) {
      _queue.push({ event, params });
      return;
    }
    import("firebase/analytics")
      .then(({ logEvent }) => {
        if (analyticsInstance) {
          logEvent(analyticsInstance, event, (params ?? {}) as Record<string, string>);
          if (typeof __DEV__ !== "undefined" && __DEV__) {
            console.log(`[Analytics:web] ${event}`, params ?? {});
          }
        }
      })
      .catch(() => {});
  } catch {
    // silently ignore — analytics must never crash the app
  }
}
