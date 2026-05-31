import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import type { AppStateStatus } from "react-native";
import { getAdUnitId, waitForAdMob } from "@/lib/admob";

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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (Platform.OS !== "android") return;

    const load = () => {
      if (!mountedRef.current) return;
      waitForAdMob().then(() => {
        if (!mountedRef.current) return;
        try {
          const mod = require("react-native-google-mobile-ads");
          if (!mod?.AppOpenAd || !mod?.AdEventType) return;
          const { AppOpenAd, AdEventType } = mod;

          for (const l of listenersRef.current) {
            try { l.remove(); } catch {}
          }
          listenersRef.current = [];
          adRef.current = null;

          const ad = AppOpenAd.createForAdRequest(getAdUnitId("APP_OPEN"), {
            requestNonPersonalizedAdsOnly: false,
          });
          adRef.current = ad;
          listenersRef.current.push(
            ad.addAdEventListener(AdEventType.LOADED, () => {
              if (!mountedRef.current) return;
              if (!shownOnceRef.current) {
                shownOnceRef.current = true;
                ad.show().catch(() => {});
              }
            }),
            ad.addAdEventListener(AdEventType.CLOSED, () => {
              if (!mountedRef.current) return;
              shownOnceRef.current = false;
              adRef.current = null;
              load();
            }),
            ad.addAdEventListener(AdEventType.ERROR, () => {
              if (!mountedRef.current) return;
              adRef.current = null;
              setTimeout(load, 30_000);
            }),
          );
          ad.load();
        } catch {}
      }).catch(() => {});
    };

    load();

    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active" &&
        mountedRef.current
      ) {
        if (adRef.current?.loaded && !shownOnceRef.current) {
          shownOnceRef.current = true;
          adRef.current.show().catch(() => {});
        }
      }
      appStateRef.current = nextState;
    });

    return () => {
      mountedRef.current = false;
      sub.remove();
      for (const l of listenersRef.current) {
        try { l.remove(); } catch {}
      }
      listenersRef.current = [];
      adRef.current = null;
    };
  }, []);
}
