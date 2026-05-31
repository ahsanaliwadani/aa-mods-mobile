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

let _initPromise: Promise<void> | null = null;

export function initializeAdMob(): void {
  if (Platform.OS !== "android") return;
  if (_initPromise) return;
  _initPromise = new Promise<void>((resolve) => {
    try {
      const mod = require("react-native-google-mobile-ads");
      const MobileAds = mod?.default ?? mod?.MobileAds;
      if (!MobileAds) { resolve(); return; }
      MobileAds()
        .initialize()
        .then(() => resolve())
        .catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

export function waitForAdMob(): Promise<void> {
  return _initPromise ?? Promise.resolve();
}

export function isAdMobAvailable(): boolean {
  return Platform.OS === "android";
}

export function getAdUnitId(key: keyof typeof AD_UNITS): string {
  if (__DEV__) {
    try {
      const { TestIds } = require("react-native-google-mobile-ads");
      const map: Partial<Record<keyof typeof AD_UNITS, string>> = {
        BANNER_1: TestIds.BANNER,
        BANNER_2: TestIds.BANNER,
        INTERSTITIAL: TestIds.INTERSTITIAL,
        REWARDED: TestIds.REWARDED,
        APP_OPEN: TestIds.APP_OPEN,
        NATIVE_ADVANCED: TestIds.ADAPTIVE_BANNER,
      };
      if (map[key]) return map[key]!;
    } catch {}
  }
  return AD_UNITS[key];
}
