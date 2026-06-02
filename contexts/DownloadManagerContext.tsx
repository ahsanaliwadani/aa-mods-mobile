import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, Alert } from "react-native";
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
const DOWNLOAD_DIR_KEY = "@aa_mods_download_dir_v1";
const FOLDER_PROMPTED_KEY = "@aa_mods_folder_prompted_v1";
const SPEED_BOOST_KEY = "@aa_mods_speed_boost_until_v1";
const FILES_ACCESS_PROMPTED_KEY = "@aa_mods_files_access_prompted_v1";

export const SPEED_BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export type DownloadPhase =
  | "idle"
  | "resolving"
  | "downloading"
  | "done"
  | "error"
  | "installing"
  | "installed";

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

export type DownloadHistoryEntry = {
  id: string;
  slug: string;
  appName: string;
  storeVersion: string;
  iconUri?: string;
  bytesTotal: number;
  outcome: "downloaded" | "installed" | "failed";
  completedAt: number;
};

const HISTORY_KEY = "@aa_mods_download_history_v1";
const MAX_HISTORY = 200;

type DownloadManagerContextType = {
  downloads: Map<string, DownloadEntry>;
  isRestoreComplete: boolean;
  speedBoostUntil: number | null;
  isSpeedBoosted: boolean;
  activateSpeedBoost: (durationMs?: number) => void;
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
  saveApkToDownloads: (slug: string) => Promise<"saved" | "cancelled" | "error">;
  installedApps: Record<string, InstalledApp>;
  markInstalled: (slug: string, version: string) => void;
  isInstalled: (slug: string) => boolean;
  getInstalledVersion: (slug: string) => string | null;
  hasUpdate: (slug: string, storeVersion: string) => boolean;
  clearInstalledApp: (slug: string) => void;
  downloadDirUri: string | null;
  setDownloadDir: (uri: string | null) => void;
  pickDownloadDir: () => Promise<string | null>;
  downloadHistory: DownloadHistoryEntry[];
  clearHistory: () => void;
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

async function deleteApkFile(apkPath?: string): Promise<void> {
  if (!apkPath || !FileSystem) return;
  if (apkPath.startsWith("content://")) return; // SAF URIs managed by system
  try {
    const info = await FileSystem.getInfoAsync(apkPath);
    if (info.exists) {
      await FileSystem.deleteAsync(apkPath, { idempotent: true });
    }
  } catch {}
}

export function DownloadManagerProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<Map<string, DownloadEntry>>(new Map());
  const [installedApps, setInstalledApps] = useState<Record<string, InstalledApp>>({});
  const [downloadDirUri, setDownloadDirUriState] = useState<string | null>(null);
  const [isRestoreComplete, setIsRestoreComplete] = useState(false);
  const [speedBoostUntil, setSpeedBoostUntil] = useState<number | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryEntry[]>([]);

  const isSpeedBoosted = speedBoostUntil !== null && Date.now() < speedBoostUntil;

  const activateSpeedBoost = useCallback((durationMs: number = SPEED_BOOST_DURATION_MS) => {
    const until = Date.now() + durationMs;
    setSpeedBoostUntil(until);
    AsyncStorage.setItem(SPEED_BOOST_KEY, String(until)).catch(() => {});
  }, []);

  const resumableRefs = useRef<Map<string, _DownloadResumable>>(new Map());
  const speedTracker = useRef<Map<string, { lastBytes: number; lastTime: number }>>(new Map());

  const downloadsRef = useRef<Map<string, DownloadEntry>>(downloads);
  useEffect(() => {
    downloadsRef.current = downloads;
  }, [downloads]);

  // Keep a ref so startDownload can always read the latest downloadDirUri
  const downloadDirUriRef = useRef<string | null>(downloadDirUri);
  useEffect(() => {
    downloadDirUriRef.current = downloadDirUri;
  }, [downloadDirUri]);

  useEffect(() => {
    const loadInstalled = AsyncStorage.getItem(INSTALLED_APPS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            setInstalledApps(parsed as Record<string, InstalledApp>);
          }
        }
      })
      .catch(() => {});

    const loadDownloads = AsyncStorage.getItem(DOWNLOADS_KEY)
      .then(async (raw) => {
        if (!raw) return;
        const arr = JSON.parse(raw) as DownloadEntry[];
        if (!Array.isArray(arr) || arr.length === 0) return;

        const validEntries: DownloadEntry[] = [];
        for (const entry of arr) {
          if (!entry.slug) continue;
          if (entry.phase === "done" || entry.phase === "installed") {
            // Verify APK file still exists on disk before restoring
            if (entry.apkPath && !entry.apkPath.startsWith("content://") && FileSystem) {
              try {
                const info = await FileSystem.getInfoAsync(entry.apkPath);
                if (!info.exists) continue; // File gone — skip, user will need to re-download
              } catch {
                continue;
              }
            }
            validEntries.push(entry);
          } else if (entry.phase === "error") {
            validEntries.push(entry);
          }
        }

        if (validEntries.length > 0) {
          setDownloads((prev) => {
            const next = new Map(prev);
            for (const entry of validEntries) {
              next.set(entry.slug, entry);
            }
            return next;
          });
        }
      })
      .catch(() => {});

    const loadDir = AsyncStorage.getItem(DOWNLOAD_DIR_KEY)
      .then((uri) => {
        if (uri) {
          setDownloadDirUriState(uri);
          downloadDirUriRef.current = uri;
        }
      })
      .catch(() => {});

    const loadBoost = AsyncStorage.getItem(SPEED_BOOST_KEY)
      .then((val) => {
        if (val) {
          const until = Number(val);
          if (until > Date.now()) {
            setSpeedBoostUntil(until);
          } else {
            AsyncStorage.removeItem(SPEED_BOOST_KEY).catch(() => {});
          }
        }
      })
      .catch(() => {});

    const loadHistory = AsyncStorage.getItem(HISTORY_KEY)
      .then((raw) => {
        if (!raw) return;
        const arr = JSON.parse(raw) as DownloadHistoryEntry[];
        if (Array.isArray(arr) && arr.length > 0) {
          setDownloadHistory(arr);
        }
      })
      .catch(() => {});

    // Mark restore complete after all loads settle (success or failure)
    Promise.allSettled([loadInstalled, loadDownloads, loadDir, loadBoost, loadHistory]).then(() => {
      setIsRestoreComplete(true);
    });
  }, []);

  // Persist completed/installed/error entries
  useEffect(() => {
    const toSave: DownloadEntry[] = [];
    for (const entry of downloads.values()) {
      if (
        entry.phase === "done" ||
        entry.phase === "error" ||
        entry.phase === "installed"
      ) {
        toSave.push(entry);
      }
    }
    AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(toSave)).catch(() => {});
  }, [downloads]);

  const setDownloadDir = useCallback((uri: string | null) => {
    setDownloadDirUriState(uri);
    downloadDirUriRef.current = uri;
    if (uri) {
      AsyncStorage.setItem(DOWNLOAD_DIR_KEY, uri).catch(() => {});
    } else {
      AsyncStorage.removeItem(DOWNLOAD_DIR_KEY).catch(() => {});
    }
  }, []);

  const pickDownloadDir = useCallback(async (): Promise<string | null> => {
    if (Platform.OS !== "android" || !FileSystem) return null;
    try {
      const SAF = FileSystem.StorageAccessFramework;
      const result = await SAF.requestDirectoryPermissionsAsync();
      if (result.granted && result.directoryUri) {
        setDownloadDir(result.directoryUri);
        return result.directoryUri;
      }
    } catch {}
    return null;
  }, [setDownloadDir]);

  // ── Strategy 1: Direct file:// → file:// copy to public Downloads/AAMods folder ──
  // This is a native OS-level copy with zero JS bridge involvement — works for any file size.
  // Requires WRITE_EXTERNAL_STORAGE (Android < 10) or MANAGE_EXTERNAL_STORAGE (Android 10+).
  const tryCopyToPublicDownloads = useCallback(async (
    apkPath: string,
    fileName: string,
  ): Promise<string | null> => {
    if (!FileSystem || Platform.OS !== "android") return null;
    if (!apkPath.startsWith("file://")) return null;

    const tryPath = async (destPath: string): Promise<string | null> => {
      try {
        if (apkPath === destPath) return destPath;
        const dirPath = destPath.substring(0, destPath.lastIndexOf("/") + 1);
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true }).catch(() => {});
        await FileSystem.copyAsync({ from: apkPath, to: destPath });
        return destPath;
      } catch {
        return null;
      }
    };

    // Try AAMods subfolder in Downloads first, then root Downloads
    return (
      (await tryPath(`file:///storage/emulated/0/Download/AAMods/${fileName}`)) ??
      (await tryPath(`file:///storage/emulated/0/Download/${fileName}`))
    );
  }, []);

  // ── Strategy 2 (SAF fallback): Write APK to a user-picked SAF directory ──
  // Only used when direct Downloads path is inaccessible (Android 10+ without MANAGE_EXTERNAL_STORAGE).
  // Uses native copyAsync (no memory limit — works for any file size including 200MB+ APKs).
  const writeApkToSafDir = useCallback(async (
    apkPath: string,
    dirUri: string,
    fileName: string,
  ): Promise<string | null> => {
    if (!FileSystem) return null;
    const SAF = FileSystem.StorageAccessFramework;
    let destUri: string | null = null;
    try {
      const info = await FileSystem.getInfoAsync(apkPath);
      if (!info.exists) return null;

      destUri = await SAF.createFileAsync(
        dirUri,
        fileName,
        "application/vnd.android.package-archive",
      );

      // Primary: native OS-level copy — no JS memory involved, works for any file size
      try {
        await FileSystem.copyAsync({ from: apkPath, to: destUri });
        return destUri;
      } catch {
        // copyAsync to content:// not supported on this version — fall back to chunked Base64
      }

      // Fallback: chunked Base64 write (for smaller APKs where memory allows)
      const fileInfo = await FileSystem.getInfoAsync(apkPath, { size: true });
      const fileSizeBytes = (fileInfo as { size?: number }).size ?? 0;
      // Skip Base64 fallback for files > 40 MB to avoid OOM crash
      if (fileSizeBytes > 40 * 1024 * 1024) {
        throw new Error("file_too_large_for_base64_fallback");
      }
      const content = await FileSystem.readAsStringAsync(apkPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!content || content.length === 0) throw new Error("empty_content");
      await FileSystem.writeAsStringAsync(destUri, content, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return destUri;
    } catch {
      if (destUri) FileSystem.deleteAsync(destUri, { idempotent: true }).catch(() => {});
      return null;
    }
  }, []);

  // Returns true if the APK is already saved in phone-accessible storage
  const isInPhoneStorage = (apkPath: string): boolean =>
    apkPath.startsWith("content://") ||
    apkPath.includes("/storage/emulated/0/Download") ||
    apkPath.includes("/storage/emulated/0/Android/data");

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

  const saveApkToDownloads = useCallback(async (slug: string): Promise<"saved" | "cancelled" | "error"> => {
    if (Platform.OS !== "android" || !FileSystem) return "error";
    const entry = downloadsRef.current.get(slug);
    if (!entry?.apkPath) return "error";
    if (isInPhoneStorage(entry.apkPath)) return "saved";

    const safeName = entry.appName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${safeName}_v${entry.storeVersion}.apk`;
    const apkPath = entry.apkPath;

    // Strategy 1: Direct copy to public Downloads folder (file:// → file://, any file size)
    const publicPath = await tryCopyToPublicDownloads(apkPath, fileName);
    if (publicPath) {
      updateEntry(slug, { apkPath: publicPath });
      return "saved";
    }

    // Strategy 2: SAF — try previously saved directory first
    const currentDir = downloadDirUriRef.current;
    if (currentDir) {
      const destUri = await writeApkToSafDir(apkPath, currentDir, fileName);
      if (destUri) {
        updateEntry(slug, { apkPath: destUri });
        return "saved";
      }
      setDownloadDir(null);
    }

    // Strategy 3: SAF — request fresh directory permission from user
    try {
      const SAF = FileSystem.StorageAccessFramework;
      const result = await SAF.requestDirectoryPermissionsAsync();
      if (!result.granted || !result.directoryUri) return "cancelled";
      const newUri = result.directoryUri;
      setDownloadDir(newUri);
      const destUri = await writeApkToSafDir(apkPath, newUri, fileName);
      if (destUri) {
        updateEntry(slug, { apkPath: destUri });
        return "saved";
      }
      // Write failed even with fresh permission — clear saved dir so next
      // attempt shows the folder picker again instead of silently failing
      setDownloadDir(null);
      return "error";
    } catch {
      setDownloadDir(null);
      return "error";
    }
  }, [tryCopyToPublicDownloads, writeApkToSafDir, setDownloadDir, updateEntry]);

  const addToHistory = useCallback((
    slug: string,
    outcome: DownloadHistoryEntry["outcome"],
  ) => {
    const entry = downloadsRef.current.get(slug);
    if (!entry) return;
    const histEntry: DownloadHistoryEntry = {
      id: `${slug}_${Date.now()}`,
      slug,
      appName: entry.appName,
      storeVersion: entry.storeVersion,
      iconUri: entry.iconUri,
      bytesTotal: entry.bytesTotal,
      outcome,
      completedAt: Date.now(),
    };
    setDownloadHistory((prev) => {
      const filtered = prev.filter((h) => h.slug !== slug);
      const next = [histEntry, ...filtered].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)).catch(() => {});
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
      const existing = downloadsRef.current.get(slug);
      if (existing && (existing.phase === "downloading" || existing.phase === "resolving")) return;

      // ── Web platform: trigger native browser download ──────────────────
      if (Platform.OS === "web") {
        const entry: DownloadEntry = {
          slug, appName, storeVersion, iconUri, link,
          phase: "resolving", progress: 0,
          bytesWritten: 0, bytesTotal: 0, speedBps: 0,
          startedAt: Date.now(),
        };
        setDownloads((prev) => { const n = new Map(prev); n.set(slug, entry); return n; });

        let targetLink = link;
        if (isMediaFireUrl(link)) {
          const direct = await resolveMediaFireLink(link);
          if (direct) {
            targetLink = direct;
          } else {
            updateEntry(slug, { phase: "error", error: "Could not resolve MediaFire link." });
            return;
          }
        }

        // Trigger browser download via a temporary anchor element
        try {
          if (typeof window !== "undefined") {
            const a = document.createElement("a");
            a.href = targetLink;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          updateEntry(slug, { phase: "done", progress: 100, link: targetLink });
          logDownloadCompleted(slug, appName, storeVersion, 0, 0);
        } catch {
          updateEntry(slug, { phase: "error", error: "Could not start download. Try opening the link in your browser." });
          logDownloadFailed(slug, appName, "web_open_failed");
        }
        return;
      }

      // ── WiFi-only enforcement ──────────────────────────────────────────
      const [wifiOnly, connType] = await Promise.all([
        isWifiOnlyEnabled(),
        getConnectionType(),
      ]);

      if (wifiOnly && connType === "cellular") {
        const proceed = await showWifiOnlyAlert();
        if (!proceed) {
          logWifiOnlyBlocked(slug, appName);
          return;
        }
        logWifiOnlyBypassed(slug, appName);
      }

      // ── One-time "All Files Access" guidance prompt (Android only) ───────
      if (Platform.OS === "android") {
        try {
          const alreadyPrompted = await AsyncStorage.getItem(FILES_ACCESS_PROMPTED_KEY);
          if (!alreadyPrompted) {
            await AsyncStorage.setItem(FILES_ACCESS_PROMPTED_KEY, "1");
            await new Promise<void>((resolve) => {
              Alert.alert(
                "📂 Save APKs to Downloads",
                "For the best experience, grant 'All Files Access' so downloaded APKs are saved directly to your Downloads folder and accessible from any file manager.\n\nYou can also skip this and pick a folder manually later.",
                [
                  {
                    text: "Grant Access",
                    onPress: () => {
                      if (IntentLauncher) {
                        IntentLauncher.startActivityAsync(
                          "android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION",
                          { data: "package:com.aa.mods" },
                        ).catch(() =>
                          IntentLauncher?.startActivityAsync(
                            "android.settings.APPLICATION_DETAILS_SETTINGS",
                            { data: "package:com.aa.mods" },
                          ).catch(() => {}),
                        );
                      }
                      resolve();
                    },
                  },
                  {
                    text: "Skip for Now",
                    style: "cancel",
                    onPress: () => resolve(),
                  },
                ],
              );
            });
          }
        } catch {}
      }

      // ── Storage permission check (Android only) ───────────────────────
      if (Platform.OS === "android") {
        try {
          const { PermissionsAndroid } = require("react-native");
          const perms: string[] = [
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          ];
          const results = await PermissionsAndroid.requestMultiple(perms);
          const allGranted = Object.values(results).every(
            (r) => r === PermissionsAndroid.RESULTS.GRANTED || r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
          );
          // On Android 13+ these permissions are deprecated but SAF still works — proceed regardless
          if (!allGranted) {
            const proceed = await new Promise<boolean>((resolve) => {
              Alert.alert(
                "Storage Permission",
                "Storage permission was not granted. The APK will be saved to app-private storage only (you can still install it). Continue?",
                [
                  { text: "Continue Anyway", onPress: () => resolve(true) },
                  { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                ],
              );
            });
            if (!proceed) return;
          }
        } catch {}
      }

      // ── Download folder setup (Android only, prompt if no folder set) ───
      if (Platform.OS === "android" && FileSystem && !downloadDirUriRef.current) {
        const choice = await new Promise<"pick" | "default" | "cancel">((resolve) => {
          Alert.alert(
            "Save APK To Phone Storage?",
            "Choose where to save downloaded APK files so you can access them from your file manager.\n\nYou can change this later in Settings.",
            [
              {
                text: "Pick Folder",
                onPress: () => resolve("pick"),
              },
              {
                text: "App Storage Only",
                style: "default",
                onPress: () => resolve("default"),
              },
              {
                text: "Cancel Download",
                style: "cancel",
                onPress: () => resolve("cancel"),
              },
            ],
            { cancelable: true, onDismiss: () => resolve("cancel") },
          );
        });

        if (choice === "cancel") return;

        if (choice === "pick") {
          await pickDownloadDir().catch(() => null);
        }
        // "default" → use internal AAMods dir (handled below), no SAF folder set
      }

      const entry: DownloadEntry = {
        slug, appName, storeVersion, iconUri, link,
        phase: "idle", progress: 0,
        bytesWritten: 0, bytesTotal: 0, speedBps: 0,
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

          // ── Auto-save to phone storage (always attempted on Android) ──
          let finalApkPath = result.uri;
          if (Platform.OS === "android") {
            const permFileName = `${safeName}_v${storeVersion}.apk`;

            // Strategy 1: direct file:// → file:// copy to Downloads/AAMods (any file size)
            const publicPath = await tryCopyToPublicDownloads(result.uri, permFileName);
            if (publicPath) {
              await deleteApkFile(result.uri).catch(() => {});
              finalApkPath = publicPath;
            } else {
              // Strategy 2: SAF fallback — only if folder was pre-selected by user
              const savedDirUri = downloadDirUriRef.current;
              if (savedDirUri) {
                const permUri = await writeApkToSafDir(result.uri, savedDirUri, permFileName).catch(() => null);
                if (permUri) {
                  await deleteApkFile(result.uri).catch(() => {});
                  finalApkPath = permUri;
                }
              }
            }
          }

          updateEntry(slug, {
            phase: "done",
            progress: 100,
            apkPath: finalApkPath,
          });

          addToHistory(slug, "downloaded");

          getNotifPrefs().then((notifPrefs) => {
            if (notifPrefs.showDownloadNotifications && notifPrefs.notifyOnDownloadComplete) {
              notifyDownloadFinished(appName, storeVersion).catch(() => {});
            }
          }).catch(() => {});

          logDownloadCompleted(slug, appName, storeVersion, durationMs, fileSizeMb);
        } else {
          downloadTrace.stop({ app_slug: slug, success: "false" });
          updateEntry(slug, { phase: "error", error: "Download failed. Please try again." });

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

          getNotifPrefs().then((notifPrefs) => {
            if (notifPrefs.showDownloadNotifications) {
              notifyDownloadFailed(appName, msg).catch(() => {});
            }
          }).catch(() => {});

          logDownloadFailed(slug, appName, msg.slice(0, 80));
        }
      }
    },
    [updateEntry, writeApkToSafDir, tryCopyToPublicDownloads],
  );

  const installApk = useCallback(
    async (slug: string) => {
      const entry = downloadsRef.current.get(slug);
      if (!entry?.apkPath || Platform.OS !== "android") return;

      // Verify the APK file still exists on disk before attempting install
      if (FileSystem && !entry.apkPath.startsWith("content://")) {
        try {
          const info = await FileSystem.getInfoAsync(entry.apkPath);
          if (!info.exists) {
            setDownloads((prev) => {
              const next = new Map(prev);
              next.delete(slug);
              return next;
            });
            Alert.alert(
              "APK Not Found",
              "The APK file was removed from device storage. Please download it again.",
            );
            return;
          }
        } catch {
          setDownloads((prev) => {
            const next = new Map(prev);
            next.delete(slug);
            return next;
          });
          Alert.alert(
            "APK Not Found",
            "Could not access the APK file. Please download it again.",
          );
          return;
        }
      }

      updateEntry(slug, { phase: "installing" });
      try {
        if (!FileSystem || !IntentLauncher) {
          updateEntry(slug, { phase: "error", error: "Installation not supported on this platform." });
          return;
        }

        let contentUri: string;
        if (entry.apkPath.startsWith("content://")) {
          contentUri = entry.apkPath;
        } else {
          contentUri = await FileSystem.getContentUriAsync(entry.apkPath);
        }

        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          flags: 1,
          type: "application/vnd.android.package-archive",
        });

        markInstalled(slug, entry.storeVersion);
        logApkInstalled(slug, entry.appName, entry.storeVersion);
        addToHistory(slug, "installed");

        updateEntry(slug, { phase: "installed" });
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

  // clearEntry removes from map AND deletes the APK file from disk
  const clearEntry = useCallback((slug: string) => {
    const entry = downloadsRef.current.get(slug);
    deleteApkFile(entry?.apkPath).catch(() => {});
    setDownloads((prev) => {
      const next = new Map(prev);
      next.delete(slug);
      return next;
    });
  }, []);

  // clearAllCompleted removes all done/error/installed entries AND their APK files
  const clearAllCompleted = useCallback(() => {
    setDownloads((prev) => {
      const next = new Map(prev);
      for (const [slug, entry] of next) {
        if (
          entry.phase === "done" ||
          entry.phase === "error" ||
          entry.phase === "installed"
        ) {
          deleteApkFile(entry.apkPath).catch(() => {});
          next.delete(slug);
        }
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setDownloadHistory([]);
    AsyncStorage.removeItem(HISTORY_KEY).catch(() => {});
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
        isRestoreComplete,
        speedBoostUntil,
        isSpeedBoosted,
        activateSpeedBoost,
        startDownload,
        installApk,
        cancelDownload,
        retryDownload,
        clearEntry,
        clearAllCompleted,
        getEntry,
        saveApkToDownloads,
        installedApps,
        markInstalled,
        isInstalled,
        getInstalledVersion,
        hasUpdate,
        clearInstalledApp,
        downloadDirUri,
        setDownloadDir,
        pickDownloadDir,
        downloadHistory,
        clearHistory,
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
