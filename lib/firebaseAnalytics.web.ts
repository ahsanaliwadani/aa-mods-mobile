import { app } from "./firebase";

type EvParams = Record<string, string | number | boolean | null>;
type QueuedEvent = { event: string; params?: EvParams };

let analyticsInstance: import("firebase/analytics").Analytics | null = null;
let analyticsReady = false;
const _queue: QueuedEvent[] = [];

(async () => {
  try {
    const { isSupported, getAnalytics } = await import("firebase/analytics");
    if (await isSupported()) {
      analyticsInstance = getAnalytics(app);
      analyticsReady = true;
      // Flush events that were queued before analytics was ready
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
    }
  } catch {}
})();

export function logAnalyticsEvent(
  event: string,
  params?: EvParams,
): void {
  try {
    if (!analyticsReady || !analyticsInstance) {
      // Queue the event — will be flushed once analytics initializes
      _queue.push({ event, params });
      return;
    }
    import("firebase/analytics")
      .then(({ logEvent }) => {
        if (analyticsInstance) {
          logEvent(analyticsInstance, event, (params ?? {}) as Record<string, string>);
        }
      })
      .catch(() => {});
  } catch {
    // silently ignore — analytics must never crash the app
  }
}
