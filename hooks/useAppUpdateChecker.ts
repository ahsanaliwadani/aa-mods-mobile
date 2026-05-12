import { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { database } from "@/lib/firebase";
import Constants from "expo-constants";

export type AppUpdateInfo = {
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  mandatory: boolean;
  hasUpdate: boolean;
  source: "appUpdate" | "remoteConfig";
};

// Read version from app.json/app.config.js, fallback to "1.0.0"
export const CURRENT_VERSION: string =
  Constants.expoConfig?.version ??
  Constants.manifest2?.runtimeVersion ??
  Constants.manifest?.version ??
  "1.0.0";

const DISMISSED_VERSION_KEY = "@aa_mods_dismissed_update_version";

export function compareVersions(a: string, b: string): number {
  try {
    const clean = (v: string) => v.replace(/^v/i, "").trim();
    const pa = clean(a).split(".").map((n) => parseInt(n, 10) || 0);
    const pb = clean(b).split(".").map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  } catch {
    return 0;
  }
}

export function useAppUpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const isMounted = useRef(true);

  // Load dismissed version from storage
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_VERSION_KEY)
      .then((v) => { if (isMounted.current) setDismissedVersion(v); })
      .catch(() => {})
      .finally(() => { if (isMounted.current) setStorageLoaded(true); });
  }, []);

  // Realtime listener on app_config/appUpdate
  useEffect(() => {
    isMounted.current = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const updateRef = ref(database, "app_config/appUpdate");
      unsubscribe = onValue(
        updateRef,
        (snapshot) => {
          if (!isMounted.current) return;
          try {
            const data = snapshot.val() as Record<string, unknown> | null;
            if (!data) {
              setUpdateInfo(null);
              return;
            }
            const latestVersion = String(data.latestVersion ?? "").trim();
            const downloadUrl = String(data.downloadUrl ?? "").trim();
            const releaseNotes = String(data.releaseNotes ?? "").trim();
            const mandatory = data.mandatory === true || data.mandatory === "true";
            // Only show banner if database version is strictly higher than current
            const hasUpdate = !!latestVersion && compareVersions(latestVersion, CURRENT_VERSION) > 0;
            setUpdateInfo({ latestVersion, downloadUrl, releaseNotes, mandatory, hasUpdate, source: "appUpdate" });
          } catch {
            setUpdateInfo(null);
          }
        },
        () => { setUpdateInfo(null); },
      );
    } catch {
      setUpdateInfo(null);
    }

    return () => {
      isMounted.current = false;
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  const dismiss = (): void => {
    const version = updateInfo?.latestVersion;
    if (!version) return;
    setDismissedVersion(version);
    AsyncStorage.setItem(DISMISSED_VERSION_KEY, version).catch(() => {});
  };

  const shouldShow =
    storageLoaded &&
    !!updateInfo?.hasUpdate &&
    dismissedVersion !== updateInfo?.latestVersion;

  const isMandatory = !!updateInfo?.mandatory;

  return { updateInfo, shouldShow, isMandatory, dismiss, currentVersion: CURRENT_VERSION };
}
