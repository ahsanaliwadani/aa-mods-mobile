import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === "expo";
export const canLocalNotify = Platform.OS !== "web" && !isExpoGo;

async function schedule(content: Notifications.NotificationContentInput): Promise<void> {
  if (!canLocalNotify) return;
  try {
    const { status } = await Notifications.getPermissionsAsync().catch(() => ({ status: "denied" as const }));
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({ content, trigger: null });
  } catch {}
}

export async function notifyDownloadStarted(appName: string): Promise<void> {
  await schedule({
    title: "Download Started",
    body: `Downloading ${appName}…`,
    data: { type: "download_start", appName },
    sound: undefined,
    ...(Platform.OS === "android" ? { channelId: "aa-mods-general" } : {}),
  });
}

export async function notifyDownloadFinished(appName: string): Promise<void> {
  await schedule({
    title: "Download Complete ✓",
    body: `${appName} is ready to install!`,
    data: { type: "download_done", appName },
    sound: "default",
    ...(Platform.OS === "android" ? { channelId: "aa-mods-updates" } : {}),
  });
}

export async function notifyDownloadFailed(appName: string, error?: string): Promise<void> {
  await schedule({
    title: "Download Failed",
    body: error
      ? `${appName}: ${error.slice(0, 80)}`
      : `Failed to download ${appName}. Tap to retry.`,
    data: { type: "download_error", appName },
    sound: "default",
    ...(Platform.OS === "android" ? { channelId: "aa-mods-general" } : {}),
  });
}

export async function notifyUpdateAvailable(count: number, firstAppName?: string): Promise<void> {
  const title =
    count === 1 ? "1 Update Available" : `${count} Updates Available`;
  const body =
    count === 1 && firstAppName
      ? `${firstAppName} has been updated — tap to download.`
      : `${count} apps have been updated in AA Mods Store.`;
  await schedule({
    title,
    body,
    data: { type: "update_available", count },
    sound: "default",
    ...(Platform.OS === "android" ? { channelId: "aa-mods-updates" } : {}),
  });
}

export async function notifyNewApp(appName: string, category: string): Promise<void> {
  await schedule({
    title: "New Mod Added 🎉",
    body: `${appName} (${category}) is now available on AA Mods Store.`,
    data: { type: "new_app", appName },
    sound: "default",
    ...(Platform.OS === "android" ? { channelId: "aa-mods-updates" } : {}),
  });
}
