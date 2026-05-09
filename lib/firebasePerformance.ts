// Native platform: Firebase Performance is automatically tracked via the
// google-services.json integration (app start, screen render, network).
// For custom JS traces, we log timing data to Analytics instead.

import { logAnalyticsEvent } from "./firebaseAnalytics";

export type PerfTrace = {
  stop: (attributes?: Record<string, string>) => void;
};

/**
 * Start a named performance trace.
 * On native, logs the result as an analytics event when stopped.
 * On web, delegates to firebasePerformance.web.ts.
 */
export function startTrace(traceName: string): PerfTrace {
  const startTime = Date.now();
  return {
    stop(attributes?: Record<string, string>) {
      const durationMs = Date.now() - startTime;
      logAnalyticsEvent(`perf_${traceName}`, {
        duration_ms: durationMs,
        ...(attributes ?? {}),
      });
    },
  };
}
