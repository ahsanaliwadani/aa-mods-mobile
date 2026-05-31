import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { AD_UNITS } from "@/lib/admob";

type AdState = "loading" | "loaded" | "showing" | "closed" | "error";

export function useInterstitialAd() {
  const adRef = useRef<{
    load: () => void;
    show: () => Promise<void>;
    addAdEventListener: (event: string, cb: () => void) => { remove: () => void };
  } | null>(null);
  const [state, setState] = useState<AdState>("loading");
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);

  const cleanup = useCallback(() => {
    for (const l of listenersRef.current) l.remove();
    listenersRef.current = [];
  }, []);

  const load = useCallback(() => {
    if (Platform.OS !== "android") return;
    try {
      const { InterstitialAd, AdEventType } = require("react-native-google-mobile-ads");
      cleanup();
      const ad = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
        requestNonPersonalizedAdsOnly: false,
      });
      adRef.current = ad;
      listenersRef.current.push(
        ad.addAdEventListener(AdEventType.LOADED, () => setState("loaded")),
        ad.addAdEventListener(AdEventType.CLOSED, () => {
          setState("closed");
          setTimeout(() => { setState("loading"); load(); }, 500);
        }),
        ad.addAdEventListener(AdEventType.ERROR, () => setState("error")),
      );
      ad.load();
      setState("loading");
    } catch {}
  }, [cleanup]);

  useEffect(() => {
    load();
    return cleanup;
  }, [load, cleanup]);

  const show = useCallback(async (): Promise<boolean> => {
    if (state !== "loaded" || !adRef.current) return false;
    try {
      setState("showing");
      await adRef.current.show();
      return true;
    } catch {
      setState("error");
      return false;
    }
  }, [state]);

  return { show, isReady: state === "loaded" };
}
