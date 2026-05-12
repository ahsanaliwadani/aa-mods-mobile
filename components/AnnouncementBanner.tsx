import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BannerType = "info" | "warning" | "success";

type Props = {
  text: string;
  type?: BannerType;
};

const TYPE_CONFIG: Record<
  BannerType,
  {
    icon: "information-circle" | "warning" | "checkmark-circle";
    iconBg: string;
    color: string;
    bg: string;
    border: string;
    glow: string;
    label: string;
  }
> = {
  info: {
    icon: "information-circle",
    label: "ANNOUNCEMENT",
    color: "#22d3ee",
    iconBg: "rgba(34,211,238,0.12)",
    bg: "#09111d",
    border: "rgba(34,211,238,0.28)",
    glow: "rgba(34,211,238,0.08)",
  },
  warning: {
    icon: "warning",
    label: "IMPORTANT NOTICE",
    color: "#fbbf24",
    iconBg: "rgba(251,191,36,0.12)",
    bg: "#09111d",
    border: "rgba(251,191,36,0.28)",
    glow: "rgba(251,191,36,0.06)",
  },
  success: {
    icon: "checkmark-circle",
    label: "GOOD NEWS",
    color: "#00e673",
    iconBg: "rgba(0,230,115,0.10)",
    bg: "#09111d",
    border: "rgba(0,230,115,0.28)",
    glow: "rgba(0,230,115,0.06)",
  },
};

export function AnnouncementBanner({ text, type = "info" }: Props) {
  const insets = useSafeAreaInsets();
  const cfg = TYPE_CONFIG[type];
  const [visible, setVisible] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (visible && text.trim()) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: Platform.OS !== "web" }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: Platform.OS !== "web", tension: 70, friction: 10 }),
      ]).start();
    }
  }, [visible, text]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 200, useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => setVisible(false));
  };

  if (!visible || !text.trim()) return null;

  const paddingTop = Platform.OS === "web" ? 80 : insets.top + 16;

  const inner = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Glow background */}
      <View style={[styles.glowBg, { backgroundColor: cfg.glow }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg, borderColor: cfg.border }]}>
        <Ionicons name={cfg.icon} size={28} color={cfg.color} />
      </View>

      {/* Badge */}
      <View style={[styles.badge, { backgroundColor: cfg.iconBg, borderColor: cfg.border }]}>
        <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
        <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>

      {/* Message */}
      <Text style={styles.messageText}>{text.trim()}</Text>

      {/* Dismiss */}
      <Pressable
        onPress={handleDismiss}
        style={({ pressed }) => [
          styles.dismissBtn,
          { borderColor: cfg.border, opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <Text style={[styles.dismissText, { color: cfg.color }]}>Got it</Text>
      </Pressable>

      {/* Close icon top-right */}
      <Pressable onPress={handleDismiss} hitSlop={14} style={styles.closeIcon}>
        <Ionicons name="close" size={18} color="#475569" />
      </Pressable>
    </Animated.View>
  );

  // On native: render as a Modal overlay centered on screen
  if (Platform.OS !== "web") {
    return (
      <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleDismiss}>
        <Pressable style={styles.overlay} onPress={handleDismiss}>
          <Pressable style={[styles.modalWrap, { paddingTop }]}>
            {inner}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  // On web: render as a fixed-position centered overlay
  return (
    <View style={styles.webOverlay} pointerEvents="box-none">
      <View style={styles.webWrap}>{inner}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Native modal */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalWrap: {
    width: "100%",
    alignItems: "center",
  },

  /* Web overlay */
  webOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 9999,
    padding: 24,
  },
  webWrap: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
  },

  /* Card */
  card: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 24,
  },
  glowBg: {
    position: "absolute",
    top: -60,
    left: -60,
    right: -60,
    height: 180,
    borderRadius: 90,
  },

  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.3,
  },

  messageText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#d1d5db",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 4,
  },

  dismissBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 11,
    marginTop: 4,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },

  closeIcon: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
});
