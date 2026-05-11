// Firebase Performance SDK is intentionally disabled on web.
// The SDK automatically instruments DOM elements and tries to record
// React Native Web's generated CSS class strings as trace attribute values,
// which Firebase rejects as invalid — causing unhandled FirebaseErrors.
// Custom traces are instead logged as Analytics events (same as native).

export type PerfTrace = {
  stop: (attributes?: Record<string, string>) => void;
};

export function startTrace(traceName: string): PerfTrace {
  const startTime = Date.now();

  return {
    stop(attributes?: Record<string, string>) {
      const durationMs = Date.now() - startTime;
      try {
        import("./firebaseAnalytics").then(({ logAnalyticsEvent }) => {
          logAnalyticsEvent(`perf_${traceName}`, {
            duration_ms: durationMs,
            ...(attributes ?? {}),
          });
        }).catch(() => {});
      } catch {}
    },
  };
}
