import { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";

export type AppRemoteConfig = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  showAnnouncement: boolean;
  announcementText: string;
  announcementType: "info" | "warning" | "success";
  updateBannerEnabled: boolean;
  updateBannerMandatory: boolean;
  updateBannerTitle: string;
  updateBannerMessage: string;
  updateBannerUrl: string;
  updateBannerVersion: string;
  updateBannerButtonText: string;
  // App rating controls
  appRatingEnabled: boolean;
  appRatingMinOpens: number;       // show prompt after N app opens
  appRatingMinDownloads: number;   // OR after N downloads
  appRatingForceShow: boolean;     // override: show to everyone ignoring history
  appRatingPlayStoreUrl: string;   // Play Store URL for the "Rate" button
  // Social / contact
  telegramUrl: string;
  websiteUrl: string;
  discordUrl: string;
  instagramUrl: string;
  supportEmail: string;
};

export const defaultRemoteConfig: AppRemoteConfig = {
  maintenanceMode: false,
  maintenanceMessage: "AA Mods is undergoing maintenance. Please check back soon.",
  showAnnouncement: false,
  announcementText: "",
  announcementType: "info",
  updateBannerEnabled: true,
  updateBannerMandatory: false,
  updateBannerTitle: "Update Available",
  updateBannerMessage: "",
  updateBannerUrl: "",
  updateBannerVersion: "",
  updateBannerButtonText: "Update Now",
  appRatingEnabled: false,
  appRatingMinOpens: 4,
  appRatingMinDownloads: 2,
  appRatingForceShow: false,
  appRatingPlayStoreUrl: "https://play.google.com/store/apps/details?id=com.aa.mods",
  telegramUrl: "https://t.me/aamods",
  websiteUrl: "https://aa-mods.replit.app",
  discordUrl: "",
  instagramUrl: "",
  supportEmail: "",
};

function safeBoolean(val: unknown, fallback: boolean): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return fallback;
}

function safeString(val: unknown, fallback: string): string {
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : fallback;
}

function safeNumber(val: unknown, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function parseConfig(raw: Record<string, unknown>): AppRemoteConfig {
  try {
    const announcementType = raw.announcementType as string;
    return {
      maintenanceMode: safeBoolean(raw.maintenanceMode, defaultRemoteConfig.maintenanceMode),
      maintenanceMessage: safeString(raw.maintenanceMessage, defaultRemoteConfig.maintenanceMessage),
      showAnnouncement: safeBoolean(raw.showAnnouncement, defaultRemoteConfig.showAnnouncement),
      announcementText: safeString(raw.announcementText, defaultRemoteConfig.announcementText),
      announcementType:
        announcementType === "info" || announcementType === "warning" || announcementType === "success"
          ? announcementType
          : defaultRemoteConfig.announcementType,
      updateBannerEnabled: safeBoolean(raw.updateBannerEnabled, defaultRemoteConfig.updateBannerEnabled),
      updateBannerMandatory: safeBoolean(raw.updateBannerMandatory, defaultRemoteConfig.updateBannerMandatory),
      updateBannerTitle: safeString(raw.updateBannerTitle, defaultRemoteConfig.updateBannerTitle),
      updateBannerMessage: safeString(raw.updateBannerMessage, defaultRemoteConfig.updateBannerMessage),
      updateBannerUrl: safeString(raw.updateBannerUrl, defaultRemoteConfig.updateBannerUrl),
      updateBannerVersion: safeString(raw.updateBannerVersion, defaultRemoteConfig.updateBannerVersion),
      updateBannerButtonText: safeString(raw.updateBannerButtonText, defaultRemoteConfig.updateBannerButtonText),
      appRatingEnabled: safeBoolean(raw.appRatingEnabled, defaultRemoteConfig.appRatingEnabled),
      appRatingMinOpens: safeNumber(raw.appRatingMinOpens, defaultRemoteConfig.appRatingMinOpens),
      appRatingMinDownloads: safeNumber(raw.appRatingMinDownloads, defaultRemoteConfig.appRatingMinDownloads),
      appRatingForceShow: safeBoolean(raw.appRatingForceShow, defaultRemoteConfig.appRatingForceShow),
      appRatingPlayStoreUrl: safeString(raw.appRatingPlayStoreUrl, defaultRemoteConfig.appRatingPlayStoreUrl),
      telegramUrl: safeString(raw.telegramUrl, defaultRemoteConfig.telegramUrl),
      websiteUrl: safeString(raw.websiteUrl, defaultRemoteConfig.websiteUrl),
      discordUrl: safeString(raw.discordUrl, defaultRemoteConfig.discordUrl),
      instagramUrl: safeString(raw.instagramUrl, defaultRemoteConfig.instagramUrl),
      supportEmail: safeString(raw.supportEmail, defaultRemoteConfig.supportEmail),
    };
  } catch {
    return defaultRemoteConfig;
  }
}

export function useRemoteConfig() {
  const [config, setConfig] = useState<AppRemoteConfig>(defaultRemoteConfig);
  const [loaded, setLoaded] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const configRef = ref(database, "app_config/remoteConfig");
      unsubscribe = onValue(
        configRef,
        (snapshot) => {
          if (!isMounted.current) return;
          try {
            const raw = snapshot.val() as Record<string, unknown> | null;
            setConfig(raw ? parseConfig(raw) : defaultRemoteConfig);
            setLoaded(true);
          } catch {
            if (isMounted.current) setLoaded(true);
          }
        },
        () => {
          if (isMounted.current) setLoaded(true);
        },
      );
    } catch {
      if (isMounted.current) setLoaded(true);
    }

    return () => {
      isMounted.current = false;
      try { unsubscribe?.(); } catch {}
    };
  }, []);

  return { config, loaded };
}
