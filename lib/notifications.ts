import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { logNotificationPermission } from "@/lib/analytics";

const isExpoGo = Constants.appOwnership === "expo";

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function setupPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (isExpoGo) return null;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("aa-mods-updates", {
        name: "App Updates",
        description: "Notifications for new and updated mods",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#00e673",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      }).catch(() => {});

      await Notifications.setNotificationChannelAsync("aa-mods-general", {
        name: "General",
        description: "General AA Mods notifications",
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: "#22d3ee",
      }).catch(() => {});

      await Notifications.setNotificationChannelAsync("aa-mods-critical", {
        name: "Critical Alerts",
        description: "Important announcements and mandatory updates",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: "#ff4444",
        sound: "default",
        enableVibrate: true,
        showBadge: true,
      }).catch(() => {});
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    logNotificationPermission(finalStatus);

    if (finalStatus !== "granted") {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      undefined;

    if (!projectId) {
      console.warn("[Notifications] No EAS project ID — run: eas init");
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId }).catch(() => null);
    return token?.data ?? null;
  } catch (err) {
    console.warn("[Notifications] Setup failed:", err);
  }
  return null;
}
