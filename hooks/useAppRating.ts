import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, set, get } from "firebase/database";
import { database } from "@/lib/firebase";
import Constants from "expo-constants";
import type { AppRemoteConfig } from "./useRemoteConfig";

const RATING_STATE_KEY = "@aa_mods_rating_state_v2";
const DEVICE_ID_KEY = "@aa_mods_device_id";

type LocalRatingState = {
  promptShown: boolean;
  rated: boolean;
  openCount: number;
  downloadCount: number;
};

const DEFAULT_STATE: LocalRatingState = {
  promptShown: false,
  rated: false,
  openCount: 0,
  downloadCount: 0,
};

function generateDeviceId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "dev_";
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const newId = generateDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    return generateDeviceId();
  }
}

// ─── Submit a star rating to Firebase RTDB under user_ratings/{deviceId} ─────
export async function submitRatingToFirebase(stars: number): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    const deviceId = await getOrCreateDeviceId();
    const appVersion = Constants.expoConfig?.version ?? "1.0.0";
    const now = Date.now();
    const ratingRef = ref(database, `user_ratings/${deviceId}`);
    await set(ratingRef, {
      stars,
      timestamp: now,
      submittedAt: new Date(now).toISOString(),
      appVersion,
      platform: Platform.OS,
    });
  } catch {
    // Silent failure — rating submission is best-effort
  }
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useAppRating(config: Pick<AppRemoteConfig,
  "appRatingEnabled" | "appRatingMinOpens" | "appRatingMinDownloads" | "appRatingForceShow"
>) {
  const [shouldShowRating, setShouldShowRating] = useState(false);
  const evaluated = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!config.appRatingEnabled) {
      setShouldShowRating(false);
      return;
    }

    AsyncStorage.getItem(RATING_STATE_KEY)
      .then((raw) => {
        const state: LocalRatingState = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;

        // Increment open count on each app launch
        const updated: LocalRatingState = { ...state, openCount: state.openCount + 1 };
        AsyncStorage.setItem(RATING_STATE_KEY, JSON.stringify(updated)).catch(() => {});

        evaluated.current = true;

        // forceShow: bypass all history checks — always show
        if (config.appRatingForceShow) {
          setShouldShowRating(true);
          return;
        }

        // Normal flow: only show once, only when threshold is met
        if (updated.promptShown || updated.rated) return;

        const opensReached = updated.openCount >= config.appRatingMinOpens;
        const downloadsReached = updated.downloadCount >= config.appRatingMinDownloads;
        if (opensReached || downloadsReached) {
          setShouldShowRating(true);
        }
      })
      .catch(() => {});
  // Re-evaluate when remote config changes (e.g. forceShow toggled on)
  }, [config.appRatingEnabled, config.appRatingMinOpens, config.appRatingMinDownloads, config.appRatingForceShow]);

  const recordDownload = () => {
    if (Platform.OS === "web" || !config.appRatingEnabled) return;
    AsyncStorage.getItem(RATING_STATE_KEY)
      .then((raw) => {
        const state: LocalRatingState = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
        const updated: LocalRatingState = { ...state, downloadCount: state.downloadCount + 1 };
        AsyncStorage.setItem(RATING_STATE_KEY, JSON.stringify(updated)).catch(() => {});
        if (config.appRatingForceShow || (!updated.promptShown && !updated.rated && updated.downloadCount >= config.appRatingMinDownloads)) {
          setShouldShowRating(true);
        }
      })
      .catch(() => {});
  };

  const dismiss = () => {
    setShouldShowRating(false);
    // Mark as shown but NOT rated so we don't show again
    AsyncStorage.getItem(RATING_STATE_KEY)
      .then((raw) => {
        const state: LocalRatingState = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
        AsyncStorage.setItem(RATING_STATE_KEY, JSON.stringify({ ...state, promptShown: true })).catch(() => {});
      })
      .catch(() => {});
  };

  const markRated = () => {
    setShouldShowRating(false);
    AsyncStorage.getItem(RATING_STATE_KEY)
      .then((raw) => {
        const state: LocalRatingState = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
        AsyncStorage.setItem(RATING_STATE_KEY, JSON.stringify({ ...state, promptShown: true, rated: true })).catch(() => {});
      })
      .catch(() => {});
  };

  return { shouldShowRating, recordDownload, dismiss, markRated };
}
