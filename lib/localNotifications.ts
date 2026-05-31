import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";
export const canLocalNotify = Platform.OS !== "web" && !isExpoGo;

const BRAND_COLOR = "#00e673";

async function schedule(content: Notifications.NotificationContentInput): Promise<void> {
  if (!canLocalNotify) return;
  try {
    const { status } = await Notifications.getPermissionsAsync().catch(() => ({
      status: "denied" as const,
    }));
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
  } catch (err) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[LocalNotifications] schedule error:", err);
    }
  }
}

function androidExtra(channelId: string, priority: "default" | "high" | "max" = "default") {
  if (Platform.OS !== "android") return {};
  return {
    channelId,
    color: BRAND_COLOR,
    priority,
    sticky: false,
  };
}

export async function notifyDownloadStarted(appName: string, iconUri?: string): Promise<void> {
  await schedule({
    title: "⬇️ Download Started",
    body: `Downloading ${appName}…`,
    data: { type: "download_start", appName },
    sound: undefined,
    ...androidExtra("aa-mods-general"),
    ...(iconUri ? { attachments: [] } : {}),
  });
}

export async function notifyDownloadProgress(
  appName: string,
  progressPct: number,
  mbWritten: number,
  mbTotal: number,
): Promise<void> {
  if (progressPct % 25 !== 0 || progressPct === 0) return;
  const sizeStr = mbTotal > 0 ? ` · ${mbWritten.toFixed(1)}/${mbTotal.toFixed(1)} MB` : "";
  await schedule({
    title: `⬇️ ${progressPct}% — ${appName}`,
    body: `Downloading${sizeStr}`,
    data: { type: "download_progress", appName, progressPct },
    sound: undefined,
    ...androidExtra("aa-mods-general"),
  });
}

export async function notifyDownloadFinished(appName: string, version?: string): Promise<void> {
  await schedule({
    title: "✅ Download Complete",
    body: version
      ? `${appName} v${version} is ready to install!`
      : `${appName} is ready to install — tap to open.`,
    data: { type: "download_done", appName },
    sound: "default",
    ...androidExtra("aa-mods-updates", "high"),
  });
}

export async function notifyDownloadFailed(
  appName: string,
  error?: string,
): Promise<void> {
  await schedule({
    title: "❌ Download Failed",
    body: error
      ? `${appName}: ${error.slice(0, 80)}`
      : `Failed to download ${appName}. Tap to retry.`,
    data: { type: "download_error", appName },
    sound: "default",
    ...androidExtra("aa-mods-general", "high"),
  });
}

export async function notifyUpdateAvailable(
  count: number,
  firstAppName?: string,
): Promise<void> {
  const title =
    count === 1 ? "🆕 1 Update Available" : `🆕 ${count} Updates Available`;
  const body =
    count === 1 && firstAppName
      ? `${firstAppName} has been updated — tap to download.`
      : `${count} apps have been updated in AA Mods Store.`;
  await schedule({
    title,
    body,
    data: { type: "update_available", count },
    sound: "default",
    ...androidExtra("aa-mods-updates", "high"),
  });
}

export async function notifyNewApp(
  appName: string,
  category: string,
): Promise<void> {
  await schedule({
    title: "🎉 New Mod Added",
    body: `${appName} (${category}) is now available on AA Mods Store.`,
    data: { type: "new_app", appName },
    sound: "default",
    ...androidExtra("aa-mods-updates"),
  });
}

export async function notifyInstalledAppsUpdated(
  appNames: string[],
  count: number,
): Promise<void> {
  const title = count === 1 ? "🔔 App Update Available" : `🔔 ${count} Apps Need Updates`;
  const body =
    count === 1
      ? `${appNames[0]} has a new version — tap to update now.`
      : `${appNames.slice(0, 2).join(", ")}${count > 2 ? ` +${count - 2} more` : ""} have new versions available.`;
  await schedule({
    title,
    body,
    data: { type: "installed_update", count, appNames },
    sound: "default",
    ...androidExtra("aa-mods-updates", "high"),
  });
}
