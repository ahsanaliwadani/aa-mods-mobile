import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/AppIcon";
import { useColors } from "@/hooks/useColors";
import { haptics } from "@/lib/haptics";
import type { LiveStoreCatalogApp } from "@/hooks/useFirebaseCatalog";

const TOAST_DURATION = 5000;

interface UpdateToastProps {
  apps: LiveStoreCatalogApp[];
  onDismiss: () => void;
}

export function UpdateToast({ apps, onDismiss }: UpdateToastProps) {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const useND = Platform.OS !== "web";

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 280, useNativeDriver: useND }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: useND }),
    ]).start(() => onDismiss());
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: useND }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: useND }),
    ]).start();
    timerRef.current = setTimeout(dismiss, TOAST_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const count = apps.length;
  const app = apps[0];

  const handlePress = () => {
    haptics.light();
    dismiss();
    if (count === 1) {
      router.push(`/app/${app.slug}`);
    } else {
      router.push("/(tabs)/updates");
    }
  };

  const topPad = Platform.OS === "web" ? 16 : insets.top + 8;

  return (
    <Animated.View
      style={[toastStyles.container, { top: topPad, transform: [{ translateY }], opacity }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          toastStyles.toast,
          { backgroundColor: colors.card, borderColor: "rgba(251,191,36,0.5)", opacity: pressed ? 0.92 : 1 },
        ]}
      >
        <View style={[toastStyles.iconWrap, { backgroundColor: "rgba(251,191,36,0.12)" }]}>
          {count === 1 ? (
            <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={36} borderRadius={10} />
          ) : (
            <Ionicons name="arrow-up-circle" size={22} color="#fbbf24" />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[toastStyles.title, { color: colors.foreground }]} numberOfLines={1}>
            {count === 1 ? `${app.name} Updated` : `${count} Mods Updated`}
          </Text>
          <Text style={[toastStyles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {count === 1
              ? `v${app.version} available · tap to re-download`
              : `${apps.map((a) => a.name).slice(0, 2).join(", ")}${count > 2 ? ` +${count - 2}` : ""}`}
          </Text>
        </View>

        <View style={[toastStyles.badge, { backgroundColor: "#fbbf24" }]}>
          <Ionicons name="arrow-up" size={10} color="#04131b" />
          <Text style={toastStyles.badgeText}>UPDATE</Text>
        </View>

        <Pressable
          onPress={(e) => { e.stopPropagation(); dismiss(); }}
          hitSlop={12}
          style={toastStyles.closeBtn}
        >
          <Ionicons name="close" size={16} color={colors.mutedForeground} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 11,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 4,
    flexShrink: 0,
  },
  badgeText: { color: "#04131b", fontSize: 9, fontWeight: "800", fontFamily: "Inter_700Bold" },
  closeBtn: { paddingLeft: 2 },
});
