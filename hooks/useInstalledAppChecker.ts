import { useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";

const CHECK_INTERVAL_MS = 30_000;

export function useInstalledAppChecker(
  apps: { slug: string; packageName?: string }[],
) {
  const dm = useDownloadManager();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAll = useCallback(async () => {
    if (Platform.OS !== "android") return;
    for (const app of apps) {
      if (!app.packageName) continue;
      try {
        const url = `package:${app.packageName}`;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen && !dm.isInstalled(app.slug)) {
          dm.markInstalled(app.slug, "");
        } else if (!canOpen && dm.isInstalled(app.slug)) {
          dm.clearInstalledApp(app.slug);
        }
      } catch {
        // skip this app
      }
    }
  }, [apps, dm]);

  useEffect(() => {
    checkAll();
    intervalRef.current = setInterval(checkAll, CHECK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkAll]);
}
