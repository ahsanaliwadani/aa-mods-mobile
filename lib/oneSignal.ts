import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { OneSignal, LogLevel } from "react-native-onesignal";

const APP_ID = "c0dd2a7a-37c7-450e-89a0-08c8ec3f446d";

let _initialized = false;

export function initializeOneSignal(): void {
  if (Platform.OS === "web") return;
  if (_initialized) return;
  _initialized = true;

  try {
    OneSignal.Debug.setLogLevel(LogLevel.Warn);
    OneSignal.initialize(APP_ID);

    // Show notifications in foreground correctly
    OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event) => {
      // Display the notification as-is in the foreground
      event.getNotification().display();
    });

    // Handle notification tap — deep link into the app
    OneSignal.Notifications.addEventListener("click", (event) => {
      try {
        const data = event.notification.additionalData as Record<string, unknown> | null;
        if (!data) return;
        if (typeof data.url === "string" && data.url) {
          Linking.openURL(data.url).catch(() => {});
        } else if (typeof data.slug === "string" && data.slug) {
          Linking.openURL(`aa-mods:///app/${data.slug}`).catch(() => {});
        }
      } catch {}
    });

    // Proactively prompt for notification permission
    OneSignal.Notifications.requestPermission(true);
  } catch (err) {
    console.warn("[OneSignal] Initialization error:", err);
  }
}

export function loginUser(externalId: string): void {
  if (Platform.OS === "web") return;
  try {
    OneSignal.login(externalId);
  } catch (err) {
    console.warn("[OneSignal] login error:", err);
  }
}

export function logoutUser(): void {
  if (Platform.OS === "web") return;
  try {
    OneSignal.logout();
  } catch (err) {
    console.warn("[OneSignal] logout error:", err);
  }
}

export function setUserEmail(email: string): void {
  if (Platform.OS === "web") return;
  try {
    OneSignal.User.addEmail(email);
  } catch (err) {
    console.warn("[OneSignal] addEmail error:", err);
  }
}

export function setUserTag(key: string, value: string): void {
  if (Platform.OS === "web") return;
  try {
    OneSignal.User.addTag(key, value);
  } catch (err) {
    console.warn("[OneSignal] addTag error:", err);
  }
}

export function removeUserTag(key: string): void {
  if (Platform.OS === "web") return;
  try {
    OneSignal.User.removeTag(key);
  } catch (err) {
    console.warn("[OneSignal] removeTag error:", err);
  }
}

export function addInAppTrigger(key: string, value: string): void {
  if (Platform.OS === "web") return;
  try {
    OneSignal.InAppMessages.addTrigger(key, value);
  } catch (err) {
    console.warn("[OneSignal] addTrigger error:", err);
  }
}

export function removeInAppTrigger(key: string): void {
  if (Platform.OS === "web") return;
  try {
    OneSignal.InAppMessages.removeTrigger(key);
  } catch (err) {
    console.warn("[OneSignal] removeTrigger error:", err);
  }
}

export function setExternalUserId(id: string): void {
  if (Platform.OS === "web") return;
  try {
    OneSignal.login(id);
  } catch (err) {
    console.warn("[OneSignal] setExternalUserId error:", err);
  }
}
