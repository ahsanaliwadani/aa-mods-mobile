import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type BannerType = "info" | "warning" | "success";

type Props = {
  text: string;
  type?: BannerType;
};

const TYPE_CONFIG: Record<BannerType, { icon: "information-circle" | "warning" | "checkmark-circle"; color: string; bg: string; border: string }> = {
  info: { icon: "information-circle", color: "#22d3ee", bg: "rgba(34,211,238,0.1)", border: "rgba(34,211,238,0.25)" },
  warning: { icon: "warning", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)" },
  success: { icon: "checkmark-circle", color: "#00e673", bg: "rgba(0,230,115,0.1)", border: "rgba(0,230,115,0.25)" },
};

export function AnnouncementBanner({ text, type = "info" }: Props) {
  const colors = useColors();
  const [dismissed, setDismissed] = useState(false);
  const cfg = TYPE_CONFIG[type];

  if (dismissed || !text.trim()) return null;

  return (
    <View style={[styles.banner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons name={cfg.icon} size={16} color={cfg.color} style={styles.icon} />
      <Text style={[styles.text, { color: colors.foreground, flex: 1 }]} numberOfLines={3}>
        {text.trim()}
      </Text>
      <Pressable onPress={() => setDismissed(true)} style={styles.closeBtn} hitSlop={10}>
        <Ionicons name="close" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  icon: { marginTop: 1 },
  text: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  closeBtn: { padding: 2, marginTop: 1 },
});
