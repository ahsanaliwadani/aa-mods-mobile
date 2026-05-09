import { Platform } from "react-native";
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
    OneSignal.Notifications.requestPermission(false);
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
