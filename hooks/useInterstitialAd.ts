import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAdUnitId, waitForAdMob } from "@/lib/admob";

type AdState = "loading" | "loaded" | "showing" | "closed" | "error";

const FREQ_CAP = 3;
const COUNTER_KEY = "@aa_mods_interstitial_counter_v1";

async function shouldShowAd(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(COUNTER_KEY);
    const count = raw ? parseInt(raw, 10) : 0;
    const next = count + 1;
    await AsyncStorage.setItem(COUNTER_KEY, String(next));
    return next % FREQ_CAP === 0;
  } catch {
    return false;
  }
}

export function useInterstitialAd() {
  const adRef = useRef<{
    load: () => void;
    show: () => Promise<void>;
    addAdEventListener: (event: string, cb: () => void) => { remove: () => void };
  } | null>(null);
  const [state, setState] = useState<AdState>("loading");
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const cleanup = useCallback(() => {
    for (const l of listenersRef.current) {
      try { l.remove(); } catch {}
    }
    listenersRef.current = [];
    adRef.current = null;
  }, []);

  const load = useCallback(() => {
    if (Platform.OS !== "android") return;
    waitForAdMob().then(() => {
      if (!mountedRef.current) return;
      try {
        const mod = require("react-native-google-mobile-ads");
        if (!mod?.InterstitialAd || !mod?.AdEventType) return;
        const { InterstitialAd, AdEventType } = mod;
        cleanup();
        const ad = InterstitialAd.createForAdRequest(getAdUnitId("INTERSTITIAL"), {
          requestNonPersonalizedAdsOnly: false,
        });
        adRef.current = ad;
        listenersRef.current.push(
          ad.addAdEventListener(AdEventType.LOADED, () => {
            if (mountedRef.current) setState("loaded");
          }),
          ad.addAdEventListener(AdEventType.CLOSED, () => {
            if (!mountedRef.current) return;
            setState("closed");
            setTimeout(() => {
              if (!mountedRef.current) return;
              setState("loading");
              load();
            }, 500);
          }),
          ad.addAdEventListener(AdEventType.ERROR, () => {
            if (mountedRef.current) setState("error");
          }),
        );
        ad.load();
        if (mountedRef.current) setState("loading");
      } catch {}
    }).catch(() => {});
  }, [cleanup]);

  useEffect(() => {
    load();
    return cleanup;
  }, [load, cleanup]);

  const show = useCallback(async (): Promise<boolean> => {
    if (state !== "loaded" || !adRef.current) return false;
    const allowed = await shouldShowAd();
    if (!allowed) return false;
    if (!mountedRef.current || !adRef.current) return false;
    try {
      if (mountedRef.current) setState("showing");
      await adRef.current.show();
      return true;
    } catch {
      if (mountedRef.current) setState("error");
      return false;
    }
  }, [state]);

  return { show, isReady: state === "loaded" };
}
