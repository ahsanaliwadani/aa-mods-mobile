import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { resolveMediaFireLink, isMediaFireUrl, isDirectApkUrl } from "@/lib/mediafireResolver";
import {
  notifyDownloadStarted,
  notifyDownloadFinished,
  notifyDownloadFailed,
} from "@/lib/localNotifications";
import {
  logDownloadStarted,
  logDownloadCompleted,
  logDownloadFailed,
  logDownloadCancelled,
  logDownloadRetried,
  logMediafireResolved,
  logApkInstalled,
  logWifiOnlyBlocked,
  logWifiOnlyBypassed,
} from "@/lib/analytics";
import { startTrace } from "@/lib/firebasePerformance";
import {
  getConnectionType,
  isWifiOnlyEnabled,
  getNotifPrefs,
  showWifiOnlyAlert,
} from "@/lib/networkUtils";

import type { DownloadResumable as _DownloadResumable } from "expo-file-system/legacy";

const FileSystem =
  Platform.OS !== "web"
    ? (require("expo-file-system/legacy") as typeof import("expo-file-system/legacy"))
    : null;

const IntentLauncher =
  Platform.OS === "android"
    ? (require("expo-intent-launcher") as typeof import("expo-intent-launcher"))
    : null;

const INSTALLED_APPS_KEY = "@aa_mods_installed_apps_v1";
const DOWNLOADS_KEY = "@aa_mods_downloads_v1";

export type DownloadPhase =
  | "idle"
  | "resolving"
  | "downloading"
  | "done"
  | "error"
  | "installing";

export type DownloadEntry = {
  slug: string;
  appName: string;
  storeVersion: string;
  iconUri?: string;
  link: string;
  phase: DownloadPhase;
  progress: number;
  bytesWritten: number;
  bytesTotal: number;
  speedBps: number;
  apkPath?: string;
  error?: string;
  startedAt: number;
};

export type InstalledApp = {
  version: string;
  installedAt: string;
};

type DownloadManagerContextType = {
  downloads: Map<string, DownloadEntry>;
  startDownload: (
    slug: string,
    appName: string,
    storeVersion: string,
    link: string,
    iconUri?: string,
  ) => Promise<void>;
  installApk: (slug: string) => Promise<void>;
  cancelDownload: (slug: string) => Promise<void>;
  retryDownload: (slug: string) => Promise<void>;
  clearEntry: (slug: string) => void;
  clearAllCompleted: () => void;
  getEntry: (slug: string) => DownloadEntry | undefined;
  installedApps: Record<string, InstalledApp>;
  markInstalled: (slug: string, version: string) => void;
  isInstalled: (slug: string) => boolean;
  getInstalledVersion: (slug: string) => string | null;
  hasUpdate: (slug: string, storeVersion: string) => boolean;
  clearInstalledApp: (slug: string) => void;
};

const DownloadManagerContext = createContext<DownloadManagerContextType | null>(null);

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

export function DownloadManagerProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Map<string, DownloadEntry>>(new Map());
  const [installedApps, setInstalledApps] = useState<Record<string, InstalledApp>>({});

  const resumableRefs = useRef<Map<string, _DownloadResumable>>(new Map());
  const speedTracker = useRef<Map<string, { lastBytes: number; lastTime: number }>>(new Map());

  // Keep a ref in sync with state to avoid stale closures in callbacks
  const downloadsRef = useRef<Map<string, DownloadEntry>>(downloads);
  useEffect(() => {
    downloadsRef.current = downloads;
  }, [downloads]);

  useEffect(() => {
    AsyncStorage.getItem(INSTALLED_APPS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            setInstalledApps(parsed as Record<string, InstalledApp>);
          }
        }
      })
      .catch(() => {});

    AsyncStorage.getItem(DOWNLOADS_KEY)
      .then((raw) => {
        if (!raw) return;
        const arr = JSON.parse(raw) as DownloadEntry[];
        if (!Array.isArray(arr) || arr.length === 0) return;
        setDownloads((prev) => {
          const next = new Map(prev);
          for (const entry of arr) {
            if (entry.slug && (entry.phase === "done" || entry.phase === "error")) {
              next.set(entry.slug, entry);
            }
          }
          return next;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const completed: DownloadEntry[] = [];
    for (const entry of downloads.values()) {
      if (entry.phase === "done" || entry.phase === "error") {
        completed.push(entry);
      }
    }
    AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(completed)).catch(() => {});
  }, [downloads]);

  const updateEntry = useCallback((slug: string, patch: Partial<DownloadEntry>) => {
    setDownloads((prev) => {
      const next = new Map(prev);
      const existing = next.get(slug);
      if (existing) {
        next.set(slug, { ...existing, ...patch });
      }
      return next;
    });
  }, []);

  const startDownload = useCallback(
    async (
      slug: string,
      appName: string,
      storeVersion: string,
      link: string,
      iconUri?: string,
    ) => {
      // Use ref to avoid stale closure when checking existing downloads
      const existing = downloadsRef.current.get(slug);
      if (existing && (existing.phase === "downloading" || existing.phase === "resolving")) return;

      // ── WiFi-only enforcement ──────────────────────────────────────────
      if (Platform.OS !== "web") {
        const [wifiOnly, connType] = await Promise.all([
          isWifiOnlyEnabled(),
          getConnectionType(),
        ]);

        if (wifiOnly && connType === "cellular") {
          // Show alert and wait for user decision
          const proceed = await showWifiOnlyAlert();
          if (!proceed) {
            logWifiOnlyBlocked(slug, appName);
            return;
          }
          logWifiOnlyBypassed(slug, appName);
        }
      }

      const entry: DownloadEntry = {
        slug,
        appName,
        storeVersion,
        iconUri,
        link,
        phase: "idle",
        progress: 0,
        bytesWritten: 0,
        bytesTotal: 0,
        speedBps: 0,
        startedAt: Date.now(),
      };

      setDownloads((prev) => {
        const next = new Map(prev);
        next.set(slug, entry);
        return next;
      });

      speedTracker.current.set(slug, { lastBytes: 0, lastTime: Date.now() });

      let resolvedLink = link;
      let resolvedFromMediaFire = false;
      let linkType: "direct" | "mediafire" | "mirror" = "direct";

      if (isMediaFireUrl(link)) {
        linkType = "mediafire";
        setDownloads((prev) => {
          const next = new Map(prev);
          const e = next.get(slug);
          if (e) next.set(slug, { ...e, phase: "resolving" });
          return next;
        });

        const mfTrace = startTrace("mediafire_resolve");
        const direct = await resolveMediaFireLink(link);
        if (direct) {
          resolvedLink = direct;
          resolvedFromMediaFire = true;
          mfTrace.stop({ app_slug: slug, success: "true" });
          logMediafireResolved(slug, 0, true);
        } else {
          mfTrace.stop({ app_slug: slug, success: "false" });
          logMediafireResolved(slug, 0, false);
          updateEntry(slug, {
            phase: "error",
            error: "Could not resolve MediaFire link. Check your connection and try again.",
          });
          logDownloadFailed(slug, appName, "mediafire_resolve_failed");
          return;
        }
      }

      if (!resolvedFromMediaFire && !isDirectApkUrl(resolvedLink)) {
        updateEntry(slug, {
          phase: "error",
          error: "This link is not a direct APK download. Open it in a browser.",
        });
        logDownloadFailed(slug, appName, "not_direct_apk_url");
        return;
      }

      updateEntry(slug, { phase: "downloading", link: resolvedLink });

      // ── Notify download started (respects user prefs) ──────────────────
      getNotifPrefs().then((notifPrefs) => {
        if (notifPrefs.showDownloadNotifications && notifPrefs.notifyOnDownloadStart) {
          notifyDownloadStarted(appName).catch(() => {});
        }
      }).catch(() => {});

      logDownloadStarted(slug, appName, storeVersion, linkType);

      const downloadTrace = startTrace("apk_download");
      const downloadStartTime = Date.now();

      if (!FileSystem) {
        updateEntry(slug, { phase: "error", error: "Downloads are not supported on this platform." });
        logDownloadFailed(slug, appName, "platform_not_supported");
        return;
      }

      try {
        const safeName = appName.replace(/[^a-zA-Z0-9]/g, "_");
        const fileName = `${safeName}_${storeVersion}_${Date.now()}.apk`;
        const aaModsDir = `${FileSystem.documentDirectory}AAMods/`;
        await FileSystem.makeDirectoryAsync(aaModsDir, { intermediates: true }).catch(() => {});
        const fileUri = `${aaModsDir}${fileName}`;

        const downloadResumable = FileSystem.createDownloadResumable(
          resolvedLink,
          fileUri,
          {},
          (downloadProgress) => {
            const total = downloadProgress.totalBytesExpectedToWrite;
            const written = downloadProgress.totalBytesWritten;
            const pct = total > 0 ? Math.min(99, Math.round((written / total) * 100)) : 0;

            const tracker = speedTracker.current.get(slug);
            let speedBps = 0;
            if (tracker) {
              const now = Date.now();
              const dt = (now - tracker.lastTime) / 1000;
              if (dt > 0.5) {
                speedBps = (written - tracker.lastBytes) / dt;
                speedTracker.current.set(slug, { lastBytes: written, lastTime: now });
              } else {
                speedBps = downloadsRef.current.get(slug)?.speedBps ?? 0;
              }
            }

            updateEntry(slug, {
              progress: pct,
              bytesWritten: written,
              bytesTotal: total > 0 ? total : 0,
              speedBps,
            });
          },
        );

        resumableRefs.current.set(slug, downloadResumable);

        const result = await downloadResumable.downloadAsync();
        resumableRefs.current.delete(slug);
        speedTracker.current.delete(slug);

        if (result?.uri) {
          const durationMs = Date.now() - downloadStartTime;
          const fileSizeMb = (downloadsRef.current.get(slug)?.bytesTotal ?? 0) / 1024 / 1024;
          downloadTrace.stop({ app_slug: slug, success: "true" });
          updateEntry(slug, {
            phase: "done",
            progress: 100,
            apkPath: result.uri,
          });

          // ── Notify download complete (respects user prefs) ───────────
          getNotifPrefs().then((notifPrefs) => {
            if (notifPrefs.showDownloadNotifications && notifPrefs.notifyOnDownloadComplete) {
              notifyDownloadFinished(appName).catch(() => {});
            }
          }).catch(() => {});

          logDownloadCompleted(slug, appName, storeVersion, durationMs, fileSizeMb);
        } else {
          downloadTrace.stop({ app_slug: slug, success: "false" });
          updateEntry(slug, { phase: "error", error: "Download failed. Please try again." });

          // ── Notify download failed (always shown regardless of prefs) ─
          getNotifPrefs().then((notifPrefs) => {
            if (notifPrefs.showDownloadNotifications) {
              notifyDownloadFailed(appName, "Download failed. Please try again.").catch(() => {});
            }
          }).catch(() => {});

          logDownloadFailed(slug, appName, "result_missing_uri");
        }
      } catch (e: unknown) {
        resumableRefs.current.delete(slug);
        speedTracker.current.delete(slug);
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (msg.includes("cancelled") || msg.includes("aborted")) {
          const progressPct = downloadsRef.current.get(slug)?.progress ?? 0;
          logDownloadCancelled(slug, appName, progressPct);
          downloadTrace.stop({ app_slug: slug, success: "cancelled" });
          setDownloads((prev) => {
            const next = new Map(prev);
            next.delete(slug);
            return next;
          });
        } else {
          downloadTrace.stop({ app_slug: slug, success: "false" });
          updateEntry(slug, { phase: "error", error: msg });

          // ── Notify download failed on exception ───────────────────────
          getNotifPrefs().then((notifPrefs) => {
            if (notifPrefs.showDownloadNotifications) {
              notifyDownloadFailed(appName, msg).catch(() => {});
            }
          }).catch(() => {});

          logDownloadFailed(slug, appName, msg.slice(0, 80));
        }
      }
    },
    [updateEntry],
  );

  const installApk = useCallback(
    async (slug: string) => {
      const entry = downloadsRef.current.get(slug);
      if (!entry?.apkPath || Platform.OS !== "android") return;

      updateEntry(slug, { phase: "installing" });
      try {
        if (!FileSystem || !IntentLauncher) {
          updateEntry(slug, { phase: "error", error: "Installation not supported on this platform." });
          return;
        }
        const contentUri = await FileSystem.getContentUriAsync(entry.apkPath);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
          type: "application/vnd.android.package-archive",
        });
        markInstalled(slug, entry.storeVersion);
        logApkInstalled(slug, entry.appName, entry.storeVersion);
        setDownloads((prev) => {
          const next = new Map(prev);
          next.delete(slug);
          return next;
        });
      } catch {
        updateEntry(slug, {
          phase: "error",
          error: "Could not launch installer. Enable 'Install unknown apps' in Settings.",
        });
      }
    },
    [updateEntry],
  );

  const cancelDownload = useCallback(
    async (slug: string) => {
      try {
        const resumable = resumableRefs.current.get(slug);
        if (resumable) {
          await resumable.cancelAsync();
          resumableRefs.current.delete(slug);
        }
      } catch {}
      speedTracker.current.delete(slug);
      setDownloads((prev) => {
        const next = new Map(prev);
        next.delete(slug);
        return next;
      });
    },
    [],
  );

  const retryDownload = useCallback(
    async (slug: string) => {
      const entry = downloadsRef.current.get(slug);
      if (!entry) return;
      logDownloadRetried(slug, entry.appName);
      setDownloads((prev) => {
        const next = new Map(prev);
        next.delete(slug);
        return next;
      });
      await startDownload(slug, entry.appName, entry.storeVersion, entry.link, entry.iconUri);
    },
    [startDownload],
  );

  const clearEntry = useCallback((slug: string) => {
    setDownloads((prev) => {
      const next = new Map(prev);
      next.delete(slug);
      return next;
    });
  }, []);

  const clearAllCompleted = useCallback(() => {
    setDownloads((prev) => {
      const next = new Map(prev);
      for (const [slug, entry] of next) {
        if (entry.phase === "done" || entry.phase === "error") {
          next.delete(slug);
        }
      }
      return next;
    });
  }, []);

  const getEntry = useCallback(
    (slug: string) => downloadsRef.current.get(slug),
    [],
  );

  const markInstalled = useCallback((slug: string, version: string) => {
    setInstalledApps((prev) => {
      const next = { ...prev, [slug]: { version, installedAt: new Date().toISOString() } };
      AsyncStorage.setItem(INSTALLED_APPS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isInstalled = useCallback(
    (slug: string) => Boolean(installedApps[slug]),
    [installedApps],
  );

  const getInstalledVersion = useCallback(
    (slug: string) => installedApps[slug]?.version ?? null,
    [installedApps],
  );

  const hasUpdate = useCallback(
    (slug: string, storeVersion: string) => {
      const installedVersion = installedApps[slug]?.version;
      if (!installedVersion) return false;
      return compareVersions(storeVersion, installedVersion) > 0;
    },
    [installedApps],
  );

  const clearInstalledApp = useCallback((slug: string) => {
    setInstalledApps((prev) => {
      const next = { ...prev };
      delete next[slug];
      AsyncStorage.setItem(INSTALLED_APPS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <DownloadManagerContext.Provider
      value={{
        downloads,
        startDownload,
        installApk,
        cancelDownload,
        retryDownload,
        clearEntry,
        clearAllCompleted,
        getEntry,
        installedApps,
        markInstalled,
        isInstalled,
        getInstalledVersion,
        hasUpdate,
        clearInstalledApp,
      }}
    >
      {children}
    </DownloadManagerContext.Provider>
  );
}

export function useDownloadManager(): DownloadManagerContextType {
  const ctx = useContext(DownloadManagerContext);
  if (!ctx) throw new Error("useDownloadManager must be used within DownloadManagerProvider");
  return ctx;
}
