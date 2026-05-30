import { useEffect, useRef, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import type { LiveStoreCatalogApp } from "@/hooks/useFirebaseCatalog";
import type { NotificationInboxItem } from "@/contexts/NotificationInboxContext";

const PREFS_KEY = "@aa_mods_prefs_v1";
const NOTIFIED_KEY = "@aa_mods_downloaded_update_notified_v2";

type AddItemFn = (item: Omit<NotificationInboxItem, "id" | "timestamp" | "read">) => void;
type OnNewUpdatesFn = (apps: LiveStoreCatalogApp[]) => void;

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

function compareVersions(a: string, b: string): number {
  try {
    const pa = a.replace(/^v/, "").split(".").map(Number);
    const pb = b.replace(/^v/, "").split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  } catch {
    return 0;
  }
}

export function useDownloadedAppUpdates(
  apps: LiveStoreCatalogApp[],
  addToInbox?: AddItemFn,
  onNewUpdates?: OnNewUpdatesFn,
) {
  const dm = useDownloadManager();
  const notifiedRef = useRef<Record<string, string>>({});
  const loadedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFIED_KEY)
      .then((raw) => {
        if (raw) notifiedRef.current = JSON.parse(raw) as Record<string, string>;
        loadedRef.current = true;
      })
      .catch(() => { loadedRef.current = true; });
  }, []);

  const appsWithUpdates = useMemo(() => {
    const result: LiveStoreCatalogApp[] = [];
    for (const app of apps) {
      const entry = dm.downloads.get(app.slug);
      if (!entry) continue;
      if (entry.phase === "idle" || entry.phase === "error") continue;
      if (entry.storeVersion && compareVersions(app.version, entry.storeVersion) > 0) {
        result.push(app);
      }
    }
    return result;
  }, [apps, dm.downloads]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (appsWithUpdates.length === 0) return;

    const newlyUpdated = appsWithUpdates.filter(
      (app) => notifiedRef.current[app.slug] !== app.version,
    );
    if (newlyUpdated.length === 0) return;

    notificationsEnabled().then((enabled) => {
      if (enabled && addToInbox) {
        const count = newlyUpdated.length;
        const names = newlyUpdated.map((a) => a.name);
        addToInbox({
          title: count === 1 ? "Update Available" : `${count} Updates Available`,
          body:
            count === 1
              ? `${names[0]} v${newlyUpdated[0].version} is ready — tap to re-download.`
              : `${names.slice(0, 2).join(", ")}${count > 2 ? ` +${count - 2} more` : ""} have new versions.`,
          type: "update_available",
          data: {
            slug: newlyUpdated.length === 1 ? newlyUpdated[0].slug : undefined,
            slugs: newlyUpdated.map((a) => a.slug),
            count,
          },
        });
      }
      if (onNewUpdates) {
        onNewUpdates(newlyUpdated);
      }
    });

    const next = { ...notifiedRef.current };
    for (const app of newlyUpdated) next[app.slug] = app.version;
    notifiedRef.current = next;
    AsyncStorage.setItem(NOTIFIED_KEY, JSON.stringify(next)).catch(() => {});
  }, [appsWithUpdates, addToInbox, onNewUpdates]);

  return { appsWithUpdates };
}
