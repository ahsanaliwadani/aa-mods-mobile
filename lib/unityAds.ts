import { Platform } from "react-native";

const GAME_ID_ANDROID = "6125972";
const GAME_ID_IOS = "6125973";

export const PLACEMENT_INTERSTITIAL = Platform.OS === "ios"
  ? "Interstitial_iOS"
  : "Interstitial_Android";

export const PLACEMENT_REWARDED = Platform.OS === "ios"
  ? "Rewarded_iOS"
  : "Rewarded_Android";

let _initialized = false;
let _lastInterstitialTime = 0;
const MIN_INTERSTITIAL_INTERVAL_MS = 45_000; // min 45s between interstitials

function getRNUnityAds() {
  if (Platform.OS === "web") return null;
  try {
    return require("react-native-unity-ads").default;
  } catch {
    return null;
  }
}

/**
 * Initialize Unity Ads. Call once on app start.
 * testMode=true during development, false for production.
 */
export function initializeUnityAds(testMode = false): void {
  if (Platform.OS === "web") return;
  if (_initialized) return;
  try {
    const UnityAds = getRNUnityAds();
    if (!UnityAds) return;

    const gameId = Platform.OS === "ios" ? GAME_ID_IOS : GAME_ID_ANDROID;
    UnityAds.initialize(gameId, testMode);
    _initialized = true;

    UnityAds.addEventListener("onReady", (placementId: string) => {
      console.log(`[UnityAds] Ready: ${placementId}`);
    });

    UnityAds.addEventListener("onError", (error: string, message: string) => {
      console.warn(`[UnityAds] Error: ${error} — ${message}`);
    });

    UnityAds.addEventListener("onFinish", (placementId: string, result: string) => {
      console.log(`[UnityAds] Finish: ${placementId}, result: ${result}`);
    });
  } catch (e) {
    console.warn("[UnityAds] Init failed:", e);
  }
}

/**
 * Check if an interstitial ad is ready to show.
 */
export function isInterstitialReady(): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === "web" || !_initialized) { resolve(false); return; }
    try {
      const UnityAds = getRNUnityAds();
      if (!UnityAds) { resolve(false); return; }
      UnityAds.isReady(PLACEMENT_INTERSTITIAL, (ready: boolean) => {
        resolve(Boolean(ready));
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Show an interstitial ad. Respects minimum interval between ads.
 * Returns true if the ad was shown.
 */
export async function showInterstitial(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!_initialized) return false;

  const now = Date.now();
  if (now - _lastInterstitialTime < MIN_INTERSTITIAL_INTERVAL_MS) return false;

  try {
    const UnityAds = getRNUnityAds();
    if (!UnityAds) return false;

    const ready = await isInterstitialReady();
    if (!ready) return false;

    UnityAds.show(PLACEMENT_INTERSTITIAL);
    _lastInterstitialTime = now;
    return true;
  } catch (e) {
    console.warn("[UnityAds] Show interstitial failed:", e);
    return false;
  }
}

/**
 * Show a rewarded ad. Returns a promise that resolves to the result string
 * ('SKIPPED', 'COMPLETED', 'ERROR') or null if the ad couldn't be shown.
 */
export async function showRewarded(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!_initialized) return null;

  return new Promise((resolve) => {
    try {
      const UnityAds = getRNUnityAds();
      if (!UnityAds) { resolve(null); return; }

      let resolved = false;
      const handler = (placementId: string, result: string) => {
        if (placementId === PLACEMENT_REWARDED && !resolved) {
          resolved = true;
          UnityAds.removeEventListener("onFinish", handler);
          resolve(result);
        }
      };

      UnityAds.isReady(PLACEMENT_REWARDED, (ready: boolean) => {
        if (!ready) { resolve(null); return; }
        UnityAds.addEventListener("onFinish", handler);
        UnityAds.show(PLACEMENT_REWARDED);
      });

      // Safety timeout
      setTimeout(() => {
        if (!resolved) { resolved = true; resolve(null); }
      }, 30_000);
    } catch {
      resolve(null);
    }
  });
}
