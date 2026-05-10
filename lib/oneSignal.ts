import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { OneSignal, LogLevel } from "react-native-onesignal";

const APP_ID = "c0dd2a7a-37c7-450e-89a0-08c8ec3f446d";

let _initialized = false;

type InboxAddFn = (item: {
  title: string;
  body: string;
  type: "onesignal" | "download_start" | "download_done" | "download_error" | "update_available" | "new_app" | "installed_update" | "general";
  data?: Record<string, unknown>;
  imageUrl?: string;
}) => void;

let _inboxCallback: InboxAddFn | null = null;

export function setInboxCallback(cb: InboxAddFn | null): void {
  _inboxCallback = cb;
}

function addToInbox(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  imageUrl?: string,
): void {
  if (_inboxCallback && title) {
    _inboxCallback({ title, body, type: "onesignal", data, imageUrl });
  }
}

export function initializeOneSignal(): void {
  if (Platform.OS === "web") return;
  if (_initialized) return;
  _initialized = true;

  try {
    OneSignal.Debug.setLogLevel(LogLevel.Warn);
    OneSignal.initialize(APP_ID);

    OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event) => {
      const notif = event.getNotification();
      const title = notif.title ?? "";
      const body = notif.body ?? "";
      const data = (notif.additionalData ?? {}) as Record<string, unknown>;
      const raw = notif as unknown as Record<string, unknown>;
      const imageUrl =
        (raw.bigPicture as string | undefined) ??
        (raw.largeIcon as string | undefined) ??
        undefined;

      addToInbox(title, body, data, imageUrl);
      event.getNotification().display();
    });

    OneSignal.Notifications.addEventListener("click", (event) => {
      try {
        const notif = event.notification;
        const title = notif.title ?? "";
        const body = notif.body ?? "";
        const data = (notif.additionalData ?? {}) as Record<string, unknown>;
        const raw = notif as unknown as Record<string, unknown>;
        const imageUrl =
          (raw.bigPicture as string | undefined) ??
          (raw.largeIcon as string | undefined) ??
          undefined;

        addToInbox(title, body, data, imageUrl);

        if (typeof data.url === "string" && data.url) {
          Linking.openURL(data.url).catch(() => {});
        } else if (typeof data.slug === "string" && data.slug) {
          Linking.openURL(`aa-mods:///app/${data.slug}`).catch(() => {});
        }
      } catch {}
    });

    OneSignal.Notifications.requestPermission(true);
  } catch (err) {
    console.warn("[OneSignal] Initialization error:", err);
  }
}

export function loginUser(externalId: string): void {
  if (Platform.OS === "web") return;
  try { OneSignal.login(externalId); } catch {}
}

export function logoutUser(): void {
  if (Platform.OS === "web") return;
  try { OneSignal.logout(); } catch {}
}

export function setUserEmail(email: string): void {
  if (Platform.OS === "web") return;
  try { OneSignal.User.addEmail(email); } catch {}
}

export function setUserTag(key: string, value: string): void {
  if (Platform.OS === "web") return;
  try { OneSignal.User.addTag(key, value); } catch {}
}

export function removeUserTag(key: string): void {
  if (Platform.OS === "web") return;
  try { OneSignal.User.removeTag(key); } catch {}
}

export function addInAppTrigger(key: string, value: string): void {
  if (Platform.OS === "web") return;
  try { OneSignal.InAppMessages.addTrigger(key, value); } catch {}
}

export function removeInAppTrigger(key: string): void {
  if (Platform.OS === "web") return;
  try { OneSignal.InAppMessages.removeTrigger(key); } catch {}
}

export function setExternalUserId(id: string): void {
  if (Platform.OS === "web") return;
  try { OneSignal.login(id); } catch {}
}
