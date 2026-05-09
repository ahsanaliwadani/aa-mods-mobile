import { Platform } from "react-native";

let _analytics: import("firebase/analytics").Analytics | null = null;
let _loaded = false;

function initAnalytics(): import("firebase/analytics").Analytics | null {
  if (Platform.OS !== "web") return null;
  if (_loaded) return _analytics;
  _loaded = true;
  try {
    const { getAnalytics } = require("firebase/analytics") as typeof import("firebase/analytics");
    const { app } = require("./firebase") as typeof import("./firebase");
    _analytics = getAnalytics(app);
  } catch {
    _analytics = null;
  }
  return _analytics;
}

export function logAnalyticsEvent(
  event: string,
  params?: Record<string, string | number | boolean | null>,
): void {
  try {
    if (Platform.OS !== "web") {
      return;
    }
    const analytics = initAnalytics();
    if (!analytics) return;
    const { logEvent } = require("firebase/analytics") as typeof import("firebase/analytics");
    logEvent(analytics, event, (params ?? {}) as Record<string, string>);
  } catch {
    // silently ignore — analytics must never crash the app
  }
}
