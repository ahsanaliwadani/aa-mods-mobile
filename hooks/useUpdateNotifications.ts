import { useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { useFirebaseCatalog } from "./useFirebaseCatalog";
import { notifyUpdateAvailable, notifyNewApp } from "@/lib/localNotifications";

const SEEN_KEY = "@aa_mods_seen_slugs_v1";
const PREFS_KEY = "@aa_mods_prefs_v1";

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

export function useUpdateNotifications() {
  const { apps, connected } = useFirebaseCatalog();
  const initializedRef = useRef(false);
  const prevSlugSetRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!connected || apps.length === 0) return;

    const currentSlugs = apps.map((a) => a.slug);

    if (!initializedRef.current) {
      initializedRef.current = true;
      AsyncStorage.getItem(SEEN_KEY)
        .then((raw) => {
          if (raw) {
            const seen: string[] = JSON.parse(raw);
            prevSlugSetRef.current = new Set(seen);
          } else {
            prevSlugSetRef.current = new Set(currentSlugs);
            AsyncStorage.setItem(SEEN_KEY, JSON.stringify(currentSlugs)).catch(() => {});
          }
        })
        .catch(() => {
          prevSlugSetRef.current = new Set(currentSlugs);
        });
      return;
    }

    const newApps = apps.filter((a) => !prevSlugSetRef.current.has(a.slug));
    if (newApps.length === 0) return;

    prevSlugSetRef.current = new Set(currentSlugs);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify(currentSlugs)).catch(() => {});

    notificationsEnabled().then((enabled) => {
      if (!enabled) return;
      if (newApps.length === 1) {
        notifyNewApp(newApps[0].name, newApps[0].category).catch(() => {});
      } else {
        notifyUpdateAvailable(newApps.length, newApps[0].name).catch(() => {});
      }
    });
  }, [connected, apps.length]);
}
