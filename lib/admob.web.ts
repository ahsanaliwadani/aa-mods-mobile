export const ADMOB_APP_ID = "";
export const AD_UNITS = {
  BANNER_1: "",
  BANNER_2: "",
  NATIVE_ADVANCED: "",
  APP_OPEN: "",
  INTERSTITIAL: "",
  REWARDED: "",
} as const;
export const REWARDED_ITEM = { type: "download_booster", amount: 1 };
export function initializeAdMob(): void {}
export function waitForAdMob(): Promise<void> { return Promise.resolve(); }
export function isAdMobAvailable(): boolean { return false; }
export function getAdUnitId(_key: string): string { return ""; }
