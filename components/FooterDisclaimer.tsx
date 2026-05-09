import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function FooterDisclaimer() {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        ⚠️ All mods are for educational purposes only.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 24,
    gap: 10,
  },
  divider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  text: {
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: "center",
    opacity: 0.7,
  },
});
