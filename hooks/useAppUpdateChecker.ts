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
};

const CURRENT_VERSION = Constants.expoConfig?.version ?? "1.0.0";
const DISMISSED_VERSION_KEY = "@aa_mods_dismissed_update_version";

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

export function useAppUpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_VERSION_KEY)
      .then((v) => { if (isMounted.current) setDismissedVersion(v); })
      .catch(() => {})
      .finally(() => { if (isMounted.current) setStorageLoaded(true); });
  }, []);

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
            if (!data) return;
            const latestVersion = (data.latestVersion as string) || CURRENT_VERSION;
            const downloadUrl = (data.downloadUrl as string) || "";
            const releaseNotes = (data.releaseNotes as string) || "";
            const mandatory = Boolean(data.mandatory);
            const hasUpdate = compareVersions(latestVersion, CURRENT_VERSION) > 0;
            setUpdateInfo({ latestVersion, downloadUrl, releaseNotes, mandatory, hasUpdate });
          } catch (parseErr) {
            console.warn("[UpdateChecker] Parse error:", parseErr);
          }
        },
        (err) => {
          console.warn("[UpdateChecker] Error:", err.message);
        },
      );
    } catch (setupErr) {
      console.warn("[UpdateChecker] Setup error:", setupErr);
    }

    return () => {
      isMounted.current = false;
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  const dismiss = (): void => {
    if (!updateInfo) return;
    const version = updateInfo.latestVersion;
    setDismissedVersion(version);
    AsyncStorage.setItem(DISMISSED_VERSION_KEY, version).catch(() => {});
  };

  const shouldShow =
    storageLoaded &&
    !!updateInfo?.hasUpdate &&
    dismissedVersion !== updateInfo?.latestVersion;

  const isMandatory = !!updateInfo?.mandatory;

  return { updateInfo, shouldShow, isMandatory, dismiss };
}
