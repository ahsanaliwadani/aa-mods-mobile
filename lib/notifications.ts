import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { logNotificationPermission } from "@/lib/analytics";

const isExpoGo = Constants.appOwnership === "expo";

// Show local notifications (downloads etc.) in foreground.
// Remote push notifications from OneSignal are suppressed here — OneSignal
// handles their own display via its foregroundWillDisplay listener.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Remote FCM push has trigger.type === "push"; local scheduled have null/other types
      const trigger = notification.request.trigger as { type?: string } | null;
      const isRemotePush = trigger !== null && trigger?.type === "push";
      return {
        shouldShowAlert: !isRemotePush,
        shouldPlaySound: !isRemotePush,
        shouldSetBadge: !isRemotePush,
        shouldShowBanner: !isRemotePush,
        shouldShowList: !isRemotePush,
      };
    },
  });
}

// Create Android notification channels — call this early at app start,
// independently of whether EAS push tokens are available.
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android" || Platform.OS === "web") return;
  try {
    await Notifications.setNotificationChannelAsync("aa-mods-updates", {
      name: "App Updates",
      description: "Notifications for new and updated mods",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00e673",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
      bypassDnd: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch(() => {});

    await Notifications.setNotificationChannelAsync("aa-mods-general", {
      name: "General",
      description: "General AA Mods notifications",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#22d3ee",
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    }).catch(() => {});
  } catch {}
}

export async function setupPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    // Always set up channels and request permissions (even in Expo Go)
    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: false,
        },
      });
      finalStatus = status;
    }

    logNotificationPermission(finalStatus);

    if (finalStatus !== "granted") {
      return null;
    }

    // Push token is only available in full EAS builds (not Expo Go)
    if (isExpoGo) return null;

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
