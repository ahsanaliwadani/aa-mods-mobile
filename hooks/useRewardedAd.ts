import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import { AD_UNITS, REWARDED_ITEM } from "@/lib/admob";

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

  const cleanup = useCallback(() => {
    for (const l of listenersRef.current) l.remove();
    listenersRef.current = [];
  }, []);

  const load = useCallback(() => {
    if (Platform.OS !== "android") return;
    try {
      const { RewardedAd, RewardedAdEventType, AdEventType } = require("react-native-google-mobile-ads");
      cleanup();
      const ad = RewardedAd.createForAdRequest(AD_UNITS.REWARDED, {
        requestNonPersonalizedAdsOnly: false,
      });
      adRef.current = ad;
      listenersRef.current.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => setState("loaded")),
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward?: { amount: number; type: string }) => {
          const amount = reward?.amount ?? REWARDED_ITEM.amount;
          const type = reward?.type ?? REWARDED_ITEM.type;
          onEarnedRef.current?.(amount, type);
        }),
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
