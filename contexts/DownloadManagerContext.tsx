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

const FileSystem =
  Platform.OS !== "web"
    ? (require("expo-file-system") as typeof import("expo-file-system"))
    : null;

const IntentLauncher =
  Platform.OS === "android"
    ? (require("expo-intent-launcher") as typeof import("expo-intent-launcher"))
    : null;

const INSTALLED_APPS_KEY = "@aa_mods_installed_apps_v1";

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

  const resumableRefs = useRef<Map<string, FileSystem.DownloadResumable>>(new Map());
  const speedTracker = useRef<Map<string, { lastBytes: number; lastTime: number }>>(new Map());

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
  }, []);

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
      const existing = downloads.get(slug);
      if (existing && (existing.phase === "downloading" || existing.phase === "resolving")) return;

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

      if (isMediaFireUrl(link)) {
        setDownloads((prev) => {
          const next = new Map(prev);
          const e = next.get(slug);
          if (e) next.set(slug, { ...e, phase: "resolving" });
          return next;
        });

        const direct = await resolveMediaFireLink(link);
        if (direct) {
          resolvedLink = direct;
          resolvedFromMediaFire = true;
        } else {
          updateEntry(slug, {
            phase: "error",
            error: "Could not resolve MediaFire link. Check your connection and try again.",
          });
          return;
        }
      }

      if (!resolvedFromMediaFire && !isDirectApkUrl(resolvedLink)) {
        updateEntry(slug, {
          phase: "error",
          error: "This link is not a direct APK download. Open it in a browser.",
        });
        return;
      }

      updateEntry(slug, { phase: "downloading", link: resolvedLink });
      notifyDownloadStarted(appName).catch(() => {});

      if (!FileSystem) {
        updateEntry(slug, { phase: "error", error: "Downloads are not supported on this platform." });
        return;
      }

      try {
        const safeName = appName.replace(/[^a-zA-Z0-9]/g, "_");
        const fileName = `${safeName}_${storeVersion}_${Date.now()}.apk`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

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
                const existing2 = downloads.get(slug);
                speedBps = existing2?.speedBps ?? 0;
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
          updateEntry(slug, {
            phase: "done",
            progress: 100,
            apkPath: result.uri,
          });
          notifyDownloadFinished(appName).catch(() => {});
        } else {
          updateEntry(slug, { phase: "error", error: "Download failed. Please try again." });
          notifyDownloadFailed(appName, "Download failed. Please try again.").catch(() => {});
        }
      } catch (e: unknown) {
        resumableRefs.current.delete(slug);
        speedTracker.current.delete(slug);
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (msg.includes("cancelled") || msg.includes("aborted")) {
          setDownloads((prev) => {
            const next = new Map(prev);
            next.delete(slug);
            return next;
          });
        } else {
          updateEntry(slug, { phase: "error", error: msg });
          notifyDownloadFailed(appName, msg).catch(() => {});
        }
      }
    },
    [downloads, updateEntry],
  );

  const installApk = useCallback(
    async (slug: string) => {
      const entry = downloads.get(slug);
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
    [downloads, updateEntry],
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
      const entry = downloads.get(slug);
      if (!entry) return;
      setDownloads((prev) => {
        const next = new Map(prev);
        next.delete(slug);
        return next;
      });
      await startDownload(slug, entry.appName, entry.storeVersion, entry.link, entry.iconUri);
    },
    [downloads, startDownload],
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
    (slug: string) => downloads.get(slug),
    [downloads],
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
