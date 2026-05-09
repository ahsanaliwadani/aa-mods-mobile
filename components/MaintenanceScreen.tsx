import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Props = {
  message?: string;
};

export function MaintenanceScreen({ message }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 1200, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  const topPad = Platform.OS === "web" ? 80 : insets.top + 20;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.iconWrap, { backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.3)" }]}>
        <Animated.View style={{ opacity: pulse }}>
          <Ionicons name="construct" size={40} color="#fbbf24" />
        </Animated.View>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Under Maintenance</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {message?.trim() || "AA Mods is undergoing maintenance.\nPlease check back soon."}
      </Text>
      <View style={[styles.badge, { backgroundColor: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.25)" }]}>
        <View style={styles.dot} />
        <Text style={styles.badgeText}>MAINTENANCE MODE ACTIVE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  iconWrap: { width: 96, height: 96, borderRadius: 28, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24, marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fbbf24" },
  badgeText: { fontSize: 10, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: 1.5, color: "#fbbf24" },
});
