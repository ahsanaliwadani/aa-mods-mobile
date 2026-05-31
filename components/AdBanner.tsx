import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import { AD_UNITS } from "@/lib/admob";

type BannerVariant = "banner1" | "banner2";

interface AdBannerProps {
  variant?: BannerVariant;
  style?: object;
}

const UNIT_MAP: Record<BannerVariant, string> = {
  banner1: AD_UNITS.BANNER_1,
  banner2: AD_UNITS.BANNER_2,
};

let BannerAd: React.ComponentType<{
  unitId: string;
  size: string;
  requestOptions?: object;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: Error) => void;
}> | null = null;

let BannerAdSize: { BANNER: string; LARGE_BANNER: string } | null = null;

if (Platform.OS === "android") {
  try {
    const mod = require("react-native-google-mobile-ads");
    BannerAd = mod.BannerAd;
    BannerAdSize = mod.BannerAdSize;
  } catch {}
}

export function AdBanner({ variant = "banner1", style }: AdBannerProps) {
  if (!BannerAd || !BannerAdSize || Platform.OS !== "android") return null;

  const unitId = UNIT_MAP[variant];
  const Comp = BannerAd;

  return (
    <View style={[styles.wrap, style]}>
      <Comp
        unitId={unitId}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

export function AdBannerLarge({ variant = "banner2", style }: AdBannerProps) {
  if (!BannerAd || !BannerAdSize || Platform.OS !== "android") return null;

  const unitId = UNIT_MAP[variant];
  const Comp = BannerAd;

  return (
    <View style={[styles.wrap, style]}>
      <Comp
        unitId={unitId}
        size={BannerAdSize.LARGE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
    overflow: "hidden",
  },
});
