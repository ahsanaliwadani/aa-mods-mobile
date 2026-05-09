import { useEffect, useRef, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import { notifyInstalledAppsUpdated } from "@/lib/localNotifications";
import type { LiveStoreCatalogApp } from "@/hooks/useFirebaseCatalog";

const PREFS_KEY = "@aa_mods_prefs_v1";
const NOTIFIED_VERSIONS_KEY = "@aa_mods_installed_update_notified_v1";

async function notificationsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return true;
    const prefs = JSON.parse(raw) as { showDownloadNotifications?: boolean };
    return prefs.showDownloadNotifications !== false;
  } catch {
    return true;
  }
}

export function useInstalledAppUpdates(apps: LiveStoreCatalogApp[]) {
  const dm = useDownloadManager();
  const notifiedRef = useRef<Record<string, string>>({});
  const loadedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFIED_VERSIONS_KEY)
      .then((raw) => {
        if (raw) notifiedRef.current = JSON.parse(raw) as Record<string, string>;
        loadedRef.current = true;
      })
      .catch(() => { loadedRef.current = true; });
  }, []);

  const appsWithUpdates = useMemo(() => {
    return apps.filter((app) => dm.isInstalled(app.slug) && dm.hasUpdate(app.slug, app.version));
  }, [apps, dm]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!loadedRef.current) return;
    if (appsWithUpdates.length === 0) return;

    const newlyUpdated = appsWithUpdates.filter(
      (app) => notifiedRef.current[app.slug] !== app.version,
    );
    if (newlyUpdated.length === 0) return;

    notificationsEnabled().then((enabled) => {
      if (!enabled) return;
      notifyInstalledAppsUpdated(newlyUpdated.map((a) => a.name), newlyUpdated.length).catch(() => {});
    });

    const next = { ...notifiedRef.current };
    for (const app of newlyUpdated) next[app.slug] = app.version;
    notifiedRef.current = next;
    AsyncStorage.setItem(NOTIFIED_VERSIONS_KEY, JSON.stringify(next)).catch(() => {});
  }, [appsWithUpdates]);

  return { appsWithUpdates };
}
