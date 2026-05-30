import { Platform, Alert } from "react-native";

export type WifiCheckResult =
  | "wifi"
  | "cellular"
  | "unknown"
  | "web";

export type NetworkStatus = {
  isConnected: boolean;
  isAirplaneMode: boolean;
  isCellularOff: boolean;
  type: "wifi" | "cellular" | "none" | "unknown" | "web";
};

/**
 * Returns the current network connection type.
 * Only meaningful on Android/iOS — returns "web" on web platform.
 */
export async function getConnectionType(): Promise<WifiCheckResult> {
  if (Platform.OS === "web") return "web";
  try {
    const Network = require("expo-network") as typeof import("expo-network");
    const state = await Network.getNetworkStateAsync();
    const t = state.type;
    if (
      t === Network.NetworkStateType.WIFI ||
      t === Network.NetworkStateType.ETHERNET
    ) {
      return "wifi";
    }
    if (t === Network.NetworkStateType.CELLULAR) {
      return "cellular";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Returns a detailed network status object including airplane mode detection.
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (Platform.OS === "web") {
    return { isConnected: true, isAirplaneMode: false, isCellularOff: false, type: "web" };
  }
  try {
    const Network = require("expo-network") as typeof import("expo-network");
    const state = await Network.getNetworkStateAsync();

    const t = state.type;
    const isConnected = state.isConnected === true;

    const isNoneType =
      t === Network.NetworkStateType.NONE ||
      t === Network.NetworkStateType.UNKNOWN;

    // Airplane mode: type is NONE and no connection at all
    const isAirplaneMode = isNoneType && !isConnected;

    // Cellular off: type is NONE but not explicitly airplane mode
    // (network type unknown but not connected — most likely data off)
    const isCellularOff = !isConnected && !isAirplaneMode;

    let type: NetworkStatus["type"] = "none";
    if (
      t === Network.NetworkStateType.WIFI ||
      t === Network.NetworkStateType.ETHERNET
    ) {
      type = "wifi";
    } else if (t === Network.NetworkStateType.CELLULAR) {
      type = isConnected ? "cellular" : "none";
    } else if (isNoneType) {
      type = "none";
    } else {
      type = "unknown";
    }

    return { isConnected, isAirplaneMode, isCellularOff, type };
  } catch {
    return { isConnected: false, isAirplaneMode: false, isCellularOff: false, type: "unknown" };
  }
}

/**
 * Checks the wifiOnlyDownloads preference from AsyncStorage.
 * Returns true if WiFi-only is enabled.
 */
export async function isWifiOnlyEnabled(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default as typeof import("@react-native-async-storage/async-storage").default;
    const raw = await AsyncStorage.getItem("@aa_mods_prefs_v1");
    if (!raw) return false;
    const prefs = JSON.parse(raw) as Record<string, unknown>;
    return prefs.wifiOnlyDownloads === true;
  } catch {
    return false;
  }
}

/**
 * Returns the notification prefs from AsyncStorage.
 */
export async function getNotifPrefs(): Promise<{
  showDownloadNotifications: boolean;
  notifyOnDownloadStart: boolean;
  notifyOnDownloadComplete: boolean;
}> {
  const defaults = {
    showDownloadNotifications: true,
    notifyOnDownloadStart: true,
    notifyOnDownloadComplete: true,
  };
  if (Platform.OS === "web") return defaults;
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default as typeof import("@react-native-async-storage/async-storage").default;
    const raw = await AsyncStorage.getItem("@aa_mods_prefs_v1");
    if (!raw) return defaults;
    const prefs = JSON.parse(raw) as Record<string, unknown>;
    return {
      showDownloadNotifications: prefs.showDownloadNotifications !== false,
      notifyOnDownloadStart: prefs.notifyOnDownloadStart !== false,
      notifyOnDownloadComplete: prefs.notifyOnDownloadComplete !== false,
    };
  } catch {
    return defaults;
  }
}

/**
 * Shows a WiFi-only alert and returns a Promise that resolves to whether the
 * user chose to proceed (true) or cancel (false).
 */
export function showWifiOnlyAlert(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      "Wi-Fi Only Downloads",
      "You have Wi-Fi Only Downloads enabled, but you're currently on mobile data. Downloading may use significant mobile data.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "Download Anyway",
          style: "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
