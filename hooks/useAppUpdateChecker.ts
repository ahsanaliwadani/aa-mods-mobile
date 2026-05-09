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
  const [rcUpdateInfo, setRcUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_VERSION_KEY)
      .then((v) => { if (isMounted.current) setDismissedVersion(v); })
      .catch(() => {})
      .finally(() => { if (isMounted.current) setStorageLoaded(true); });
  }, []);

  // Listen to app_config/appUpdate
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
            setUpdateInfo({ latestVersion, downloadUrl, releaseNotes, mandatory, hasUpdate, source: "appUpdate" });
          } catch {}
        },
        () => {},
      );
    } catch {}

    return () => {
      isMounted.current = false;
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  // Also listen to app_config/remoteConfig for updateBanner fields as a second source
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const configRef = ref(database, "app_config/remoteConfig");
      unsubscribe = onValue(
        configRef,
        (snapshot) => {
          if (!isMounted.current) return;
          try {
            const data = snapshot.val() as Record<string, unknown> | null;
            if (!data) return;
            const bannerVersion = (data.updateBannerVersion as string) || "";
            const bannerUrl = (data.updateBannerUrl as string) || "";
            const bannerMsg = (data.updateBannerMessage as string) || "";
            const bannerMandatory = Boolean(data.updateBannerMandatory);
            if (bannerVersion) {
              const hasUpdate = compareVersions(bannerVersion, CURRENT_VERSION) > 0;
              setRcUpdateInfo({
                latestVersion: bannerVersion,
                downloadUrl: bannerUrl,
                releaseNotes: bannerMsg,
                mandatory: bannerMandatory,
                hasUpdate,
                source: "remoteConfig",
              });
            }
          } catch {}
        },
        () => {},
      );
    } catch {}

    return () => {
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  const activeInfo = updateInfo?.hasUpdate
    ? updateInfo
    : rcUpdateInfo?.hasUpdate
    ? rcUpdateInfo
    : null;

  const dismiss = (): void => {
    const version = activeInfo?.latestVersion;
    if (!version) return;
    setDismissedVersion(version);
    AsyncStorage.setItem(DISMISSED_VERSION_KEY, version).catch(() => {});
  };

  const shouldShow =
    storageLoaded &&
    !!activeInfo?.hasUpdate &&
    dismissedVersion !== activeInfo?.latestVersion;

  const isMandatory = !!activeInfo?.mandatory;

  return { updateInfo: activeInfo, shouldShow, isMandatory, dismiss };
}
