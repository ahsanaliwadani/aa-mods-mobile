import { Platform } from "react-native";

export const ADMOB_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_APP_ID ?? "ca-app-pub-7386485617389952~7325371535";

export const AD_UNITS = {
  BANNER_1: process.env.EXPO_PUBLIC_ADMOB_BANNER_1 ?? "ca-app-pub-7386485617389952/7663752652",
  BANNER_2: process.env.EXPO_PUBLIC_ADMOB_BANNER_2 ?? "ca-app-pub-7386485617389952/9758596209",
  NATIVE_ADVANCED: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ADVANCED ?? "ca-app-pub-7386485617389952/5429984321",
  APP_OPEN: process.env.EXPO_PUBLIC_ADMOB_APP_OPEN ?? "ca-app-pub-7386485617389952/9177657642",
  INTERSTITIAL: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL ?? "ca-app-pub-7386485617389952/4082233314",
  REWARDED: process.env.EXPO_PUBLIC_ADMOB_REWARDED ?? "ca-app-pub-7386485617389952/3085376641",
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
  return AD_UNITS[key];
}
