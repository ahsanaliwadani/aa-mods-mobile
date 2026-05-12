import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppUpdateChecker } from "@/hooks/useAppUpdateChecker";
import {
  logUpdateBannerClicked,
  logUpdateBannerDismissed,
  logUpdateBannerShown,
} from "@/lib/analytics";

function PulseRing({ delay, size, color }: { delay: number; size: number; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 1800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

export function AppUpdateModal() {
  const insets = useSafeAreaInsets();
  const { updateInfo, shouldShow, isMandatory, dismiss } = useAppUpdateChecker();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.90)).current;
  const slideAnim = useRef(new Animated.Value(90)).current;

  useEffect(() => {
    if (shouldShow && updateInfo) {
      logUpdateBannerShown(updateInfo.latestVersion, isMandatory);
      if (isMandatory) {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 9 }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 75, friction: 11 }),
        ]).start();
      }
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.90);
      slideAnim.setValue(90);
    }
  }, [shouldShow, isMandatory]);

  useEffect(() => {
    if (!isMandatory || !shouldShow || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [isMandatory, shouldShow]);

  // Only show on native — web users download APKs via browser natively
  if (Platform.OS === "web") return null;
  if (!shouldShow || !updateInfo) return null;

  const handleUpdate = () => {
    logUpdateBannerClicked(updateInfo.latestVersion);
    if (updateInfo.downloadUrl) {
      Linking.openURL(updateInfo.downloadUrl).catch(() => {});
    }
  };

  const handleDismiss = () => {
    if (isMandatory) return;
    logUpdateBannerDismissed(updateInfo.latestVersion);
    dismiss();
  };

  /* ─────────────────────────────────────────
     MANDATORY: full-screen takeover
  ───────────────────────────────────────── */
  if (isMandatory) {
    return (
      <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={undefined}>
        <Animated.View style={[styles.mandatoryOverlay, { opacity: fadeAnim }]}>

          {/* Soft glow blobs in background */}
          <View style={[styles.blob, styles.blobTR]} />
          <View style={[styles.blob, styles.blobBL]} />

          <Animated.View
            style={[
              styles.mandatoryInner,
              { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.mandatoryScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >

              {/* App icon with animated pulse rings */}
              <View style={styles.pulseWrap}>
                <PulseRing delay={0}   size={128} color="rgba(255,68,68,0.55)" />
                <PulseRing delay={600} size={128} color="rgba(255,68,68,0.35)" />
                <View style={styles.iconShell}>
                  <Image
                    source={require("@/assets/images/icon.png")}
                    style={styles.iconImg}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </View>
              </View>

              {/* Mandatory badge */}
              <View style={styles.mandatoryBadge}>
                <Ionicons name="lock-closed" size={10} color="#ff4444" />
                <Text style={styles.mandatoryBadgeText}>MANDATORY UPDATE</Text>
              </View>

              <Text style={styles.mandatoryTitle}>Update Required</Text>
              <Text style={styles.mandatorySubtitle}>
                You need to update AA Mods to continue using the app.
              </Text>

              {/* Current → New version chips */}
              <View style={styles.versionRow}>
                <View style={styles.versionChip}>
                  <Text style={styles.versionChipLabel}>Current</Text>
                  <Text style={styles.versionChipValue}>v1.0.0</Text>
                </View>
                <View style={styles.versionArrow}>
                  <Ionicons name="arrow-forward" size={13} color="#ff4444" />
                </View>
                <View style={[styles.versionChip, styles.versionChipHighlight]}>
                  <Ionicons name="sparkles" size={11} color="#ff4444" />
                  <Text style={[styles.versionChipLabel, { color: "#ffaaaa" }]}>Latest</Text>
                  <Text style={[styles.versionChipValue, { color: "#ff4444" }]}>v{updateInfo.latestVersion}</Text>
                </View>
              </View>

              {/* Release notes */}
              {updateInfo.releaseNotes ? (
                <View style={styles.notesCard}>
                  <View style={styles.notesCardHeader}>
                    <Ionicons name="list-outline" size={13} color="#64748b" />
                    <Text style={styles.notesCardTitle}>What's new</Text>
                  </View>
                  <Text style={styles.notesCardText}>{updateInfo.releaseNotes}</Text>
                </View>
              ) : null}

              {/* Warning notice */}
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#ff6b6b" />
                <Text style={styles.warningText}>
                  This update is required. The app cannot be used until you install the latest version.
                </Text>
              </View>

              {/* CTA button */}
              <Pressable
                onPress={handleUpdate}
                style={({ pressed }) => [
                  styles.mandatoryBtn,
                  pressed && { opacity: 0.87, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Ionicons name="cloud-download-outline" size={21} color="#fff" />
                <Text style={styles.mandatoryBtnText}>Update Now</Text>
              </Pressable>

              <Text style={styles.mandatoryFooter}>
                Tap "Update Now" to download the latest version
              </Text>

            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>
    );
  }

  /* ─────────────────────────────────────────
     OPTIONAL: elegant bottom sheet
  ───────────────────────────────────────── */
  return (
    <Modal
      visible={shouldShow}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <Animated.View style={[styles.optionalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />

        <Animated.View
          style={[
            styles.optionalSheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 10, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.sheetHandle} />

          {/* Header row */}
          <View style={styles.optHeader}>
            <View style={styles.optIconWrap}>
              <Image
                source={require("@/assets/images/icon.png")}
                style={styles.optIconImg}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={styles.optBadgeDot} />
            </View>

            <View style={{ flex: 1, gap: 3 }}>
              <View style={styles.optTitleRow}>
                <Text style={styles.optTitle}>Update Available</Text>
                <View style={styles.optVersionBadge}>
                  <Text style={styles.optVersionText}>v{updateInfo.latestVersion}</Text>
                </View>
              </View>
              <Text style={styles.optSubtitle}>AA Mods · New version ready to install</Text>
            </View>

            <Pressable onPress={handleDismiss} hitSlop={14} style={styles.optCloseBtn}>
              <Ionicons name="close" size={16} color="#64748b" />
            </Pressable>
          </View>

          <View style={styles.optDivider} />

          {/* Notes */}
          {updateInfo.releaseNotes ? (
            <View style={styles.optNotesBox}>
              <View style={styles.optNotesHeader}>
                <View style={styles.optNotesDot} />
                <Text style={styles.optNotesLabel}>What's new</Text>
              </View>
              <Text style={styles.optNotesText}>{updateInfo.releaseNotes}</Text>
            </View>
          ) : null}

          {/* Buttons */}
          <View style={styles.optActions}>
            <Pressable
              onPress={handleUpdate}
              style={({ pressed }) => [
                styles.optUpdateBtn,
                pressed && { opacity: 0.87, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#04131b" />
              <Text style={styles.optUpdateText}>Update Now</Text>
            </Pressable>

            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [styles.optLaterBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.optLaterText}>Maybe Later</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* ── MANDATORY overlay ── */
  mandatoryOverlay: {
    flex: 1,
    backgroundColor: "#050816",
    alignItems: "center",
    justifyContent: "center",
  },
  blob: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    opacity: 0.15,
  },
  blobTR: {
    top: -100,
    right: -100,
    backgroundColor: "#ff2222",
  },
  blobBL: {
    bottom: -100,
    left: -100,
    backgroundColor: "#cc0000",
  },
  mandatoryInner: {
    flex: 1,
    width: "100%",
  },
  mandatoryScroll: {
    alignItems: "center",
    paddingHorizontal: 28,
    gap: 20,
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 16,
  },

  pulseWrap: {
    width: 128,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconShell: {
    width: 86,
    height: 86,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "rgba(255,68,68,0.55)",
    shadowColor: "#ff4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 22,
    elevation: 18,
  },
  iconImg: {
    width: 86,
    height: 86,
  },

  mandatoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,68,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.28)",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 5,
  },
  mandatoryBadgeText: {
    color: "#ff4444",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.3,
  },
  mandatoryTitle: {
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#f0f4fc",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  mandatorySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  versionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#09111d",
    borderWidth: 1,
    borderColor: "#15304a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  versionChipHighlight: {
    backgroundColor: "rgba(255,68,68,0.07)",
    borderColor: "rgba(255,68,68,0.28)",
  },
  versionChipLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#64748b",
  },
  versionChipValue: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#94a3b8",
  },
  versionArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,68,68,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  notesCard: {
    width: "100%",
    backgroundColor: "#09111d",
    borderWidth: 1,
    borderColor: "#15304a",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  notesCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notesCardTitle: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  notesCardText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 20,
  },

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    width: "100%",
    backgroundColor: "rgba(255,68,68,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.16)",
    borderRadius: 12,
    padding: 13,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#ff9999",
    lineHeight: 18,
  },

  mandatoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    backgroundColor: "#ff4444",
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#ff4444",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 14,
  },
  mandatoryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  mandatoryFooter: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#2a3f55",
    textAlign: "center",
  },

  /* ── OPTIONAL sheet ── */
  optionalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  optionalSheet: {
    backgroundColor: "#09111d",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(0,230,115,0.18)",
    paddingTop: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#15304a",
    alignSelf: "center",
    marginBottom: 20,
  },

  optHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  optIconWrap: {
    width: 52,
    height: 52,
    position: "relative",
  },
  optIconImg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,230,115,0.25)",
  },
  optBadgeDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#00e673",
    borderWidth: 2.5,
    borderColor: "#09111d",
  },
  optTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#f0f4fc",
  },
  optVersionBadge: {
    backgroundColor: "rgba(0,230,115,0.10)",
    borderWidth: 1,
    borderColor: "rgba(0,230,115,0.28)",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  optVersionText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#00e673",
  },
  optSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#4a6280",
  },
  optCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0d1929",
    borderWidth: 1,
    borderColor: "#15304a",
    alignItems: "center",
    justifyContent: "center",
  },

  optDivider: {
    height: 1,
    backgroundColor: "#0d1929",
    marginHorizontal: 20,
    marginBottom: 14,
  },

  optNotesBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#0d1929",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#15304a",
    padding: 14,
    gap: 6,
  },
  optNotesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  optNotesDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00e673",
  },
  optNotesLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#4a6280",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  optNotesText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#94a3b8",
    lineHeight: 19,
  },

  optActions: {
    paddingHorizontal: 20,
    gap: 8,
  },
  optUpdateBtn: {
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
    shadowRadius: 14,
    elevation: 8,
  },
  optUpdateText: {
    color: "#04131b",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
  optLaterBtn: {
    alignItems: "center",
    paddingVertical: 13,
  },
  optLaterText: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    color: "#3d5570",
  },
});
