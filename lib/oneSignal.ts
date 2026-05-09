import { Alert, Platform } from "react-native";
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

    // Register push subscription observer — show welcome dialog on first registration
    OneSignal.User.pushSubscription.addEventListener("change", (event) => {
      try {
        const prev = event.previous?.id;
        const curr = event.current?.id;
        if (!prev && curr) {
          showWelcomeDialog();
        }
      } catch (err) {
        console.warn("[OneSignal] Subscription change handler error:", err);
      }
    });
  } catch (err) {
    console.warn("[OneSignal] Initialization error:", err);
  }
}

function showWelcomeDialog(): void {
  Alert.alert(
    "Your OneSignal integration is complete!",
    "Click the button below to trigger your first journey via an in-app message.",
    [
      {
        text: "Trigger your first journey",
        onPress: () => {
          try {
            OneSignal.InAppMessages.addTrigger(
              "ai_implementation_campaign_email_journey",
              "true",
            );
          } catch (err) {
            console.warn("[OneSignal] Trigger error:", err);
          }
        },
      },
    ],
    { cancelable: false },
  );
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
