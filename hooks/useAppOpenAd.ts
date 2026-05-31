import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import type { AppStateStatus } from "react-native";
import { AD_UNITS } from "@/lib/admob";

export function useAppOpenAd() {
  const adRef = useRef<{
    load: () => void;
    show: () => Promise<void>;
    loaded: boolean;
    addAdEventListener: (event: string, cb: () => void) => { remove: () => void };
  } | null>(null);
  const listenersRef = useRef<Array<{ remove: () => void }>>([]);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const shownOnceRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    const load = () => {
      try {
        const { AppOpenAd, AdEventType } = require("react-native-google-mobile-ads");
        for (const l of listenersRef.current) l.remove();
        listenersRef.current = [];

        const ad = AppOpenAd.createForAdRequest(AD_UNITS.APP_OPEN, {
          requestNonPersonalizedAdsOnly: false,
        });
        adRef.current = ad;
        listenersRef.current.push(
          ad.addAdEventListener(AdEventType.LOADED, () => {
            if (!shownOnceRef.current) {
              shownOnceRef.current = true;
              ad.show().catch(() => {});
            }
          }),
          ad.addAdEventListener(AdEventType.CLOSED, () => {
            shownOnceRef.current = false;
            load();
          }),
          ad.addAdEventListener(AdEventType.ERROR, () => {
            setTimeout(load, 30_000);
          }),
        );
        ad.load();
      } catch {}
    };

    load();

    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        if (adRef.current?.loaded && !shownOnceRef.current) {
          shownOnceRef.current = true;
          adRef.current.show().catch(() => {});
        }
      }
      appStateRef.current = nextState;
    });

    return () => {
      sub.remove();
      for (const l of listenersRef.current) l.remove();
    };
  }, []);
}
