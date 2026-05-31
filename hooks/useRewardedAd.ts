import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { getAdUnitId, waitForAdMob, REWARDED_ITEM } from "@/lib/admob";

type AdState = "loading" | "loaded" | "showing" | "closed" | "error";

export function useRewardedAd(onEarned?: (amount: number, type: string) => void) {
  const adRef = useRef<{
    load: () => void;
    show: () => Promise<void>;
    addAdEventListener: (event: string, cb: (reward?: { amount: number; type: string }) => void) => { remove: () => void };
  } | null>(null);
  const [state, setState] = useState<AdState>("loading");
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);
  const onEarnedRef = useRef(onEarned);
  onEarnedRef.current = onEarned;
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
        if (!mod?.RewardedAd || !mod?.RewardedAdEventType || !mod?.AdEventType) return;
        const { RewardedAd, RewardedAdEventType, AdEventType } = mod;
        cleanup();
        const ad = RewardedAd.createForAdRequest(getAdUnitId("REWARDED"), {
          requestNonPersonalizedAdsOnly: false,
        });
        adRef.current = ad;
        listenersRef.current.push(
          ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
            if (mountedRef.current) setState("loaded");
          }),
          ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward?: { amount: number; type: string }) => {
            const amount = reward?.amount ?? REWARDED_ITEM.amount;
            const type = reward?.type ?? REWARDED_ITEM.type;
            onEarnedRef.current?.(amount, type);
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
