import { Platform } from "react-native";

export const ADMOB_APP_ID = "ca-app-pub-7386485617389952~7325371535";

export const AD_UNITS = {
  BANNER_1: "ca-app-pub-7386485617389952/7663752652",
  BANNER_2: "ca-app-pub-7386485617389952/9758596209",
  NATIVE_ADVANCED: "ca-app-pub-7386485617389952/542998432",
  APP_OPEN: "ca-app-pub-7386485617389952/9177657642",
  INTERSTITIAL: "ca-app-pub-7386485617389952/4082233314",
  REWARDED: "ca-app-pub-7386485617389952/3085376641",
} as const;

export const REWARDED_ITEM = { type: "download_booster", amount: 1 };

let _initialized = false;

export function initializeAdMob(): void {
  if (Platform.OS === "web" || _initialized) return;
  try {
    const MobileAds = require("react-native-google-mobile-ads").default;
    MobileAds()
      .initialize()
      .then(() => {
        _initialized = true;
      })
      .catch(() => {});
  } catch {}
}

export function isAdMobAvailable(): boolean {
  return Platform.OS === "android";
}
