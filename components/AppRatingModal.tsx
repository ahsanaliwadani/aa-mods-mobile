import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
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

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onRated: () => void;
  onSubmitRating: (stars: number) => Promise<void>;
  playStoreUrl?: string;
};

const STARS = [1, 2, 3, 4, 5];

const STAR_LABELS: Record<number, string> = {
  0: "Tap a star to rate",
  1: "We're sorry to hear that",
  2: "We can do better",
  3: "Pretty good!",
  4: "Great! We love hearing that",
  5: "Amazing! You're the best!",
};

export function AppRatingModal({ visible, onDismiss, onRated, onSubmitRating, playStoreUrl }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedStars, setSelectedStars] = useState(0);
  const [phase, setPhase] = useState<"rate" | "positive" | "negative">("rate");
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;
  const starAnims = useRef(STARS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    if (visible) {
      setSelectedStars(0);
      setPhase("rate");
      setSubmitting(false);
      fadeAnim.setValue(0);
      slideAnim.setValue(80);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== "web" }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: Platform.OS !== "web", tension: 75, friction: 11 }),
      ]).start();
    }
  }, [visible]);

  const handleStarPress = (star: number) => {
    if (submitting) return;
    setSelectedStars(star);
    const anim = starAnims[star - 1];
    Animated.sequence([
      Animated.timing(anim, { toValue: 1.4, duration: 110, useNativeDriver: Platform.OS !== "web" }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== "web", tension: 200, friction: 8 }),
    ]).start();
    setTimeout(() => setPhase(star >= 4 ? "positive" : "negative"), 480);
  };

  const handleRateOnStore = async () => {
    setSubmitting(true);
    await onSubmitRating(selectedStars || 5);
    const url = playStoreUrl || "https://play.google.com/store/apps/details?id=com.aa.mods";
    Linking.openURL(url).catch(() => {});
    onRated();
  };

  const handleNegativeDone = async () => {
    setSubmitting(true);
    await onSubmitRating(selectedStars);
    onDismiss();
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(slideAnim, { toValue: 80, duration: 180, useNativeDriver: Platform.OS !== "web" }),
    ]).start(() => onDismiss());
  };

  if (Platform.OS === "web") return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />

          {/* ── RATE phase ── */}
          {phase === "rate" && (
            <>
              <View style={styles.header}>
                <Image
                  source={require("@/assets/images/icon.png")}
                  style={styles.appIcon}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <Text style={styles.title}>Enjoying AA Mods?</Text>
                <Text style={styles.subtitle}>
                  Tell us what you think — your feedback helps improve the app for everyone.
                </Text>
              </View>

              <View style={styles.starsRow}>
                {STARS.map((star) => (
                  <Pressable key={star} onPress={() => handleStarPress(star)} hitSlop={10}>
                    <Animated.View style={{ transform: [{ scale: starAnims[star - 1] }] }}>
                      <Ionicons
                        name={star <= selectedStars ? "star" : "star-outline"}
                        size={44}
                        color={star <= selectedStars ? "#fbbf24" : "#1e3a52"}
                      />
                    </Animated.View>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.starHint}>{STAR_LABELS[selectedStars] ?? ""}</Text>

              <Pressable onPress={handleClose} style={styles.skipBtn}>
                <Text style={styles.skipText}>Maybe later</Text>
              </Pressable>
            </>
          )}

          {/* ── POSITIVE phase (4–5 stars) ── */}
          {phase === "positive" && (
            <>
              <View style={styles.header}>
                <View style={styles.successIcon}>
                  <Ionicons name="heart" size={34} color="#00e673" />
                </View>
                <Text style={styles.title}>Thank you! 🎉</Text>
                <Text style={styles.subtitle}>
                  We're so glad you're enjoying AA Mods! Rate us on the Play Store to help others find us.
                </Text>
              </View>

              <View style={styles.starsRow}>
                {STARS.map((s) => (
                  <Ionicons key={s} name="star" size={30} color="#fbbf24" />
                ))}
              </View>

              <Pressable
                onPress={handleRateOnStore}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { opacity: pressed || submitting ? 0.82 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Ionicons name="logo-google-playstore" size={18} color="#04131b" />
                <Text style={styles.primaryBtnText}>
                  {submitting ? "Opening…" : "Rate on Play Store"}
                </Text>
              </Pressable>

              <Pressable onPress={handleClose} style={styles.skipBtn}>
                <Text style={styles.skipText}>No thanks</Text>
              </Pressable>
            </>
          )}

          {/* ── NEGATIVE phase (1–3 stars) ── */}
          {phase === "negative" && (
            <>
              <View style={styles.header}>
                <View style={[styles.successIcon, { backgroundColor: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)" }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={30} color="#fbbf24" />
                </View>
                <Text style={styles.title}>Help us improve</Text>
                <Text style={styles.subtitle}>
                  We're sorry you're not fully satisfied yet. Your feedback helps us ship better updates for everyone.
                </Text>
              </View>

              {/* Show selected stars */}
              <View style={styles.starsRow}>
                {STARS.map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= selectedStars ? "star" : "star-outline"}
                    size={28}
                    color={s <= selectedStars ? "#fbbf24" : "#1e3a52"}
                  />
                ))}
              </View>

              <View style={styles.feedbackBox}>
                <Ionicons name="bulb-outline" size={14} color="#fbbf24" style={{ marginTop: 1 }} />
                <Text style={styles.feedbackText}>
                  We read every piece of feedback and use it to improve the app in future updates.
                </Text>
              </View>

              <Pressable
                onPress={handleNegativeDone}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.feedbackBtn,
                  { opacity: pressed || submitting ? 0.8 : 1 },
                ]}
              >
                <Text style={styles.feedbackBtnText}>
                  {submitting ? "Saving…" : "Submit Feedback"}
                </Text>
              </Pressable>

              <Pressable onPress={handleClose} style={styles.skipBtn}>
                <Text style={styles.skipText}>Dismiss</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#09111d",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(0,230,115,0.18)",
    paddingTop: 10,
    paddingHorizontal: 24,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#15304a",
    alignSelf: "center",
    marginBottom: 10,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(0,230,115,0.25)",
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(0,230,115,0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(0,230,115,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#f0f4fc",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  starHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#4a6280",
    textAlign: "center",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#334155",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00e673",
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: "#00e673",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnText: {
    color: "#04131b",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(251,191,36,0.04)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.18)",
    borderRadius: 12,
    padding: 14,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 19,
  },
  feedbackBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    borderRadius: 14,
    paddingVertical: 14,
  },
  feedbackBtnText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#fbbf24",
  },
});
