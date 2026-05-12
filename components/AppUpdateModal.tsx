import { Ionicons } from "@expo/vector-icons";
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
import { useColors } from "@/hooks/useColors";
import {
  logUpdateBannerClicked,
  logUpdateBannerDismissed,
  logUpdateBannerShown,
} from "@/lib/analytics";

export function AppUpdateModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateInfo, shouldShow, isMandatory, dismiss } = useAppUpdateChecker();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  useEffect(() => {
    if (shouldShow && updateInfo) {
      logUpdateBannerShown(updateInfo.latestVersion, isMandatory);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== "web" }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: Platform.OS !== "web", tension: 80, friction: 10 }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(60);
    }
  }, [shouldShow, updateInfo, isMandatory]);

  // Block Android hardware back button when mandatory
  useEffect(() => {
    if (!isMandatory || !shouldShow || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [isMandatory, shouldShow]);

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

  const accentColor = isMandatory ? "#ff4444" : "#00e673";
  const accentBg = isMandatory ? "rgba(255,68,68,0.10)" : "rgba(0,230,115,0.10)";
  const accentBorder = isMandatory ? "rgba(255,68,68,0.35)" : "rgba(0,230,115,0.35)";

  return (
    <Modal
      visible={shouldShow}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={isMandatory ? undefined : handleDismiss}
    >
      <View style={[
        styles.overlay,
        isMandatory
          ? { backgroundColor: colors.background }
          : { backgroundColor: "rgba(0,0,0,0.72)" },
      ]}>
        {/* Non-mandatory: tap outside to dismiss */}
        {!isMandatory && (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        )}

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: accentBorder,
              paddingBottom: Math.max(insets.bottom, 20) + 16,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
            isMandatory && styles.sheetFullScreen,
          ]}
        >
          {/* Mandatory: full-screen centered layout */}
          {isMandatory ? (
            <ScrollView
              contentContainerStyle={[styles.mandatoryContent, { paddingTop: insets.top + 20 }]}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.iconCircle, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                <Ionicons name="alert-circle" size={52} color={accentColor} />
              </View>

              <View style={[styles.requiredBadge, { backgroundColor: "rgba(255,68,68,0.12)", borderColor: "rgba(255,68,68,0.3)" }]}>
                <Ionicons name="lock-closed" size={10} color="#ff4444" />
                <Text style={styles.requiredBadgeText}>MANDATORY UPDATE</Text>
              </View>

              <Text style={[styles.mandatoryTitle, { color: colors.foreground }]}>
                Update Required
              </Text>
              <Text style={[styles.mandatoryVersionLine, { color: accentColor }]}>
                Version {updateInfo.latestVersion} is now available
              </Text>

              {updateInfo.releaseNotes ? (
                <View style={[styles.notesBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>What's new</Text>
                  <Text style={[styles.notesText, { color: colors.foreground }]}>{updateInfo.releaseNotes}</Text>
                </View>
              ) : null}

              <View style={[styles.infoRow, { backgroundColor: "rgba(255,68,68,0.06)", borderColor: "rgba(255,68,68,0.2)" }]}>
                <Ionicons name="information-circle-outline" size={15} color="#ff4444" />
                <Text style={[styles.infoRowText, { color: colors.mutedForeground }]}>
                  This update is required to continue using the app. Please update to the latest version.
                </Text>
              </View>

              <Pressable
                onPress={handleUpdate}
                style={({ pressed }) => [
                  styles.updateBtn,
                  { backgroundColor: accentColor, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Ionicons name="arrow-up-circle" size={20} color="#fff" />
                <Text style={styles.updateBtnText}>Update Now</Text>
              </Pressable>
            </ScrollView>
          ) : (
            /* Optional: bottom-sheet style */
            <>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />

              <View style={styles.optionalHeader}>
                <View style={[styles.iconCircleSmall, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                  <Ionicons name="arrow-up-circle" size={28} color={accentColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={[styles.optionalTitle, { color: colors.foreground }]}>Update Available</Text>
                    <View style={[styles.versionBadge, { backgroundColor: accentBg, borderColor: accentBorder }]}>
                      <Text style={[styles.versionBadgeText, { color: accentColor }]}>v{updateInfo.latestVersion}</Text>
                    </View>
                  </View>
                  <Text style={[styles.optionalSub, { color: colors.mutedForeground }]}>
                    A new version of AA Mods is ready
                  </Text>
                </View>
                <Pressable onPress={handleDismiss} style={styles.closeBtn} hitSlop={12}>
                  <Ionicons name="close" size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>

              {updateInfo.releaseNotes ? (
                <View style={[styles.notesBox, { backgroundColor: colors.secondary, borderColor: colors.border, marginHorizontal: 20 }]}>
                  <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>What's new</Text>
                  <Text style={[styles.notesText, { color: colors.foreground }]}>{updateInfo.releaseNotes}</Text>
                </View>
              ) : null}

              <View style={styles.optionalActions}>
                <Pressable
                  onPress={handleUpdate}
                  style={({ pressed }) => [
                    styles.updateBtn,
                    { backgroundColor: accentColor, flex: 1, opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                  ]}
                >
                  <Ionicons name="arrow-up-circle" size={18} color="#fff" />
                  <Text style={styles.updateBtnText}>Update Now</Text>
                </Pressable>
                <Pressable
                  onPress={handleDismiss}
                  style={({ pressed }) => [
                    styles.laterBtn,
                    { borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Text style={[styles.laterBtnText, { color: colors.mutedForeground }]}>Later</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    overflow: "hidden",
  },
  sheetFullScreen: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    justifyContent: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },

  // Mandatory layout
  mandatoryContent: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  requiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  requiredBadgeText: {
    color: "#ff4444",
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  mandatoryTitle: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  mandatoryVersionLine: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    width: "100%",
  },
  infoRowText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 19,
  },

  // Optional layout
  optionalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  iconCircleSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  optionalTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  optionalSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  versionBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  optionalActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  laterBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  laterBtnText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },

  // Shared
  notesBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    width: "100%",
    gap: 4,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  updateBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
});
