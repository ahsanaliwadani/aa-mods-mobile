import { useEffect, useRef, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import { notifyInstalledAppsUpdated } from "@/lib/localNotifications";
import type { LiveStoreCatalogApp } from "@/hooks/useFirebaseCatalog";
import type { NotificationInboxItem } from "@/contexts/NotificationInboxContext";

const PREFS_KEY = "@aa_mods_prefs_v1";
const NOTIFIED_VERSIONS_KEY = "@aa_mods_installed_update_notified_v1";

type AddItemFn = (item: Omit<NotificationInboxItem, "id" | "timestamp" | "read">) => void;

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

export function useInstalledAppUpdates(apps: LiveStoreCatalogApp[], addToInbox?: AddItemFn) {
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
    if (!loadedRef.current) return;
    if (appsWithUpdates.length === 0) return;

    const newlyUpdated = appsWithUpdates.filter(
      (app) => notifiedRef.current[app.slug] !== app.version,
    );
    if (newlyUpdated.length === 0) return;

    notificationsEnabled().then((enabled) => {
      if (!enabled) return;

      // Fire local push notification on native
      if (Platform.OS !== "web") {
        notifyInstalledAppsUpdated(newlyUpdated.map((a) => a.name), newlyUpdated.length).catch(() => {});
      }

      // Always add to in-app inbox
      if (addToInbox) {
        const count = newlyUpdated.length;
        const names = newlyUpdated.map((a) => a.name);
        const title = count === 1 ? "App Update Available" : `${count} Apps Need Updates`;
        const body =
          count === 1
            ? `${names[0]} has a new version — tap to update now.`
            : `${names.slice(0, 2).join(", ")}${count > 2 ? ` +${count - 2} more` : ""} have new versions available.`;
        addToInbox({
          title,
          body,
          type: "installed_update",
          data: {
            slugs: newlyUpdated.map((a) => a.slug),
            slug: newlyUpdated.length === 1 ? newlyUpdated[0].slug : undefined,
            count,
          },
        });
      }
    });

    const next = { ...notifiedRef.current };
    for (const app of newlyUpdated) next[app.slug] = app.version;
    notifiedRef.current = next;
    AsyncStorage.setItem(NOTIFIED_VERSIONS_KEY, JSON.stringify(next)).catch(() => {});
  }, [appsWithUpdates, addToInbox]);

  return { appsWithUpdates };
}
