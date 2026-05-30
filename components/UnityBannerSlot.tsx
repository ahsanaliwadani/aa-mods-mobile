import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { PLACEMENT_BANNER } from "@/lib/unityAds";

export function UnityBannerSlot() {
  const colors = useColors();
  const shimmerX = useRef(new Animated.Value(-200)).current;
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (Platform.OS === "web") return;
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 420,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmerX, pulse]);

  if (Platform.OS === "web") return null;

  return (
    <View style={[styles.wrapper, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[styles.adLabel, { color: colors.mutedForeground }]}>ADVERTISEMENT</Text>
      <View style={[styles.bannerOuter, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[styles.shimmer, { transform: [{ translateX: shimmerX }] }]}
          />
        </View>
        <Animated.View style={[styles.iconWrap, { opacity: pulse }]}>
          <View style={[styles.iconDot, { backgroundColor: "#00e673" }]} />
          <View style={[styles.iconRect, { backgroundColor: colors.border }]} />
          <View style={[styles.iconRectShort, { backgroundColor: colors.border }]} />
        </Animated.View>
        <View style={styles.textWrap}>
          <View style={[styles.titleBar, { backgroundColor: colors.border }]} />
          <View style={[styles.subtitleBar, { backgroundColor: colors.border }]} />
        </View>
        <View style={[styles.ctaBtn, { backgroundColor: "rgba(0,230,115,0.18)", borderColor: "rgba(0,230,115,0.35)" }]}>
          <Text style={styles.ctaText}>Install</Text>
        </View>
        <View style={[styles.adBadge, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.border }]}>
          <Text style={[styles.adBadgeText, { color: colors.mutedForeground }]}>Ad</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  adLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    fontFamily: "Inter_700Bold",
  },
  bannerOuter: {
    width: 320,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 10,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(0,230,115,0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconRect: {
    width: 18,
    height: 4,
    borderRadius: 2,
  },
  iconRectShort: {
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  textWrap: {
    flex: 1,
    gap: 6,
  },
  titleBar: {
    height: 9,
    borderRadius: 5,
    width: "75%",
  },
  subtitleBar: {
    height: 7,
    borderRadius: 4,
    width: "50%",
  },
  ctaBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#00e673",
    fontFamily: "Inter_700Bold",
  },
  adBadge: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  adBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
