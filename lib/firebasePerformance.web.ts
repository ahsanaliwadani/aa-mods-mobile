import { app } from "./firebase";

let perfInstance: import("firebase/performance").FirebasePerformance | null = null;

async function getPerf(): Promise<import("firebase/performance").FirebasePerformance | null> {
  if (perfInstance) return perfInstance;
  try {
    const { getPerformance } = await import("firebase/performance");
    perfInstance = getPerformance(app);
  } catch {}
  return perfInstance;
}

export type PerfTrace = {
  stop: (attributes?: Record<string, string>) => void;
};

export function startTrace(traceName: string): PerfTrace {
  const startTime = Date.now();
  let firebaseTrace: import("firebase/performance").PerformanceTrace | null = null;

  getPerf().then(async (perf) => {
    if (!perf) return;
    try {
      const { trace } = await import("firebase/performance");
      firebaseTrace = trace(perf, traceName);
      firebaseTrace.start();
    } catch {}
  });

  return {
    stop(attributes?: Record<string, string>) {
      if (firebaseTrace) {
        try {
          if (attributes) {
            for (const [k, v] of Object.entries(attributes)) {
              firebaseTrace!.putAttribute(k, v);
            }
          }
          firebaseTrace.stop();
        } catch {}
      }
      const durationMs = Date.now() - startTime;
      try {
        import("./firebaseAnalytics").then(({ logAnalyticsEvent }) => {
          logAnalyticsEvent(`perf_${traceName}`, {
            duration_ms: durationMs,
            ...(attributes ?? {}),
          });
        });
      } catch {}
    },
  };
}
