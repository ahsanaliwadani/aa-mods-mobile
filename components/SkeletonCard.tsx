import React, { useEffect, useRef } from "react";
import { Animated, Platform, View, StyleSheet } from "react-native";

import { useColors } from "@/hooks/useColors";

function SkeletonBox({
  width,
  height,
  borderRadius = 6,
}: {
  width: number;
  height: number;
  borderRadius?: number;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 750, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ width, height, borderRadius, backgroundColor: colors.border, opacity }}
    />
  );
}

export function SkeletonAppCard() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <SkeletonBox width={56} height={56} borderRadius={14} />
        <View style={styles.meta}>
          <SkeletonBox width={60} height={9} borderRadius={5} />
          <SkeletonBox width={150} height={16} borderRadius={5} />
          <SkeletonBox width={90} height={12} borderRadius={5} />
        </View>
        <SkeletonBox width={44} height={28} borderRadius={10} />
      </View>
      <View style={styles.descBlock}>
        <SkeletonBox width={280} height={12} borderRadius={5} />
        <SkeletonBox width={210} height={12} borderRadius={5} />
      </View>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <SkeletonBox width={70} height={10} borderRadius={5} />
        <SkeletonBox width={80} height={10} borderRadius={5} />
        <SkeletonBox width={54} height={22} borderRadius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  meta: {
    flex: 1,
    gap: 5,
  },
  descBlock: {
    marginTop: 12,
    gap: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
