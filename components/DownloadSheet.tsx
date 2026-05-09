import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as WebBrowser from "expo-web-browser";
import React, { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon } from "@/components/AppIcon";
import { haptics } from "@/lib/haptics";
import { useColors } from "@/hooks/useColors";

type DownloadState = "idle" | "downloading" | "done" | "error" | "installing";

const TRACK_WIDTH = Dimensions.get("window").width - 80;

function isDirectApkUrl(url: string): boolean {
  try {
    const lower = url.toLowerCase();
    if (lower.includes("mediafire.com")) return false;
    if (lower.includes("mega.nz")) return false;
    if (lower.includes("drive.google.com")) return false;
    if (lower.includes("dropbox.com")) return false;
    if (lower.includes("1drv.ms") || lower.includes("onedrive.live.com")) return false;
    if (lower.endsWith(".apk")) return true;
    if (lower.includes("/download/") && lower.includes(".apk")) return true;
    if (lower.startsWith("https://download.")) return true;
    return false;
  } catch {
    return false;
  }
}

export function useDownloadSheet() {
  const [visible, setVisible] = useState(false);
  const [currentLink, setCurrentLink] = useState("");
  const [currentLabel, setCurrentLabel] = useState("");

  const open = useCallback((link: string, label: string) => {
    setCurrentLink(link);
    setCurrentLabel(label);
    setVisible(true);
  }, []);

  const close = useCallback(() => setVisible(false), []);

  return { visible, currentLink, currentLabel, open, close };
}

type Props = {
  visible: boolean;
  link: string;
  label: string;
  appName: string;
  appSlug?: string;
  iconUri?: string;
  onClose: () => void;
};

export function DownloadSheet({ visible, link, label, appName, appSlug, iconUri, onClose }: Props) {
  const colors = useColors();
  const [state, setState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState(0);
  const [apkPath, setApkPath] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isDirect = isDirectApkUrl(link);

  const animateProgress = (pct: number) => {
    Animated.timing(progressAnim, {
      toValue: (TRACK_WIDTH * pct) / 100,
      duration: 120,
      useNativeDriver: false,
    }).start();
  };

  const resetAndClose = useCallback(() => {
    if (state === "downloading") return;
    setState("idle");
    setProgress(0);
    setApkPath(null);
    setErrorMsg("");
    progressAnim.setValue(0);
    onClose();
  }, [state, onClose, progressAnim]);

  const startDownload = async () => {
    if (!link) return;
    haptics.medium();

    if (!isDirect) {
      resetAndClose();
      try {
        await WebBrowser.openBrowserAsync(link, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          toolbarColor: "#0a0a0a",
          controlsColor: "#00e673",
        });
      } catch {
        await WebBrowser.openBrowserAsync(link).catch(() => {});
      }
      return;
    }

    setState("downloading");
    setProgress(0);
    progressAnim.setValue(0);

    try {
      const safeName = appName.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `${safeName}_${Date.now()}.apk`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const downloadResumable = FileSystem.createDownloadResumable(
        link,
        fileUri,
        {},
        (downloadProgress) => {
          const total = downloadProgress.totalBytesExpectedToWrite;
          const written = downloadProgress.totalBytesWritten;
          if (total > 0) {
            const pct = Math.min(99, Math.round((written / total) * 100));
            setProgress(pct);
            animateProgress(pct);
          }
        },
      );

      const result = await downloadResumable.downloadAsync();

      if (result?.uri) {
        setApkPath(result.uri);
        setProgress(100);
        animateProgress(100);
        setState("done");
        haptics.medium();
      } else {
        setState("error");
        setErrorMsg("Download failed. Try again.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error occurred.";
      setState("error");
      setErrorMsg(msg);
    }
  };

  const installApk = async () => {
    if (!apkPath || Platform.OS !== "android") return;
    haptics.medium();
    setState("installing");
    try {
      const contentUri = await FileSystem.getContentUriAsync(apkPath);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags: 1,
        type: "application/vnd.android.package-archive",
      });
      resetAndClose();
    } catch {
      setState("error");
      setErrorMsg("Could not launch installer. Allow 'Install unknown apps' in Settings → Apps.");
    }
  };

  const retry = () => {
    setState("idle");
    setProgress(0);
    setApkPath(null);
    setErrorMsg("");
    progressAnim.setValue(0);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={resetAndClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.appRow}>
            <AppIcon uri={iconUri} slug={appSlug} size={52} borderRadius={14} iconSize={26} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={1}>{appName}</Text>
              <Text style={[styles.appSub, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          </View>

          {state === "idle" && (
            <>
              <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons
                  name={isDirect ? "cloud-download-outline" : "globe-outline"}
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  {isDirect
                    ? "APK will download directly inside the app. Tap Install when done."
                    : "Download page will open inside the app — no external browser needed."}
                </Text>
              </View>

              <Pressable
                onPress={startDownload}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <Ionicons name={isDirect ? "download" : "open-outline"} size={20} color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  {isDirect ? "Download APK" : "Open Download Page"}
                </Text>
              </Pressable>

              <Pressable onPress={resetAndClose} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
            </>
          )}

          {state === "downloading" && (
            <View style={styles.centerArea}>
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                Downloading… {progress}%
              </Text>
              <View style={[styles.progressTrack, { backgroundColor: colors.secondary, width: TRACK_WIDTH }]}>
                <Animated.View
                  style={[styles.progressFill, { width: progressAnim, backgroundColor: colors.primary }]}
                />
              </View>
              <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                Please keep the app open
              </Text>
            </View>
          )}

          {state === "done" && (
            <>
              <View style={styles.centerArea}>
                <View style={[styles.doneCircle, { backgroundColor: "rgba(0,230,115,0.12)" }]}>
                  <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
                </View>
                <Text style={[styles.doneTitle, { color: colors.foreground }]}>Download Complete!</Text>
                <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                  {Platform.OS === "android"
                    ? "Tap Install Now to begin installation."
                    : "APK downloaded. Install it manually from your downloads."}
                </Text>
              </View>

              {Platform.OS === "android" && (
                <Pressable
                  onPress={installApk}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="hardware-chip-outline" size={20} color={colors.primaryForeground} />
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                    Install Now
                  </Text>
                </Pressable>
              )}

              <Pressable onPress={resetAndClose} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Close</Text>
              </Pressable>
            </>
          )}

          {state === "installing" && (
            <View style={styles.centerArea}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>Launching installer…</Text>
            </View>
          )}

          {state === "error" && (
            <>
              <View style={styles.centerArea}>
                <View style={[styles.doneCircle, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
                  <Ionicons name="alert-circle" size={40} color="#ef4444" />
                </View>
                <Text style={[styles.doneTitle, { color: "#ef4444" }]}>Download Failed</Text>
                <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>{errorMsg}</Text>
              </View>

              <Pressable
                onPress={retry}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="refresh" size={18} color={colors.primaryForeground} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Try Again</Text>
              </Pressable>

              <Pressable onPress={resetAndClose} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 4 },
  appName: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 4 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "800", letterSpacing: 0.3, fontFamily: "Inter_700Bold" },
  cancelBtn: { alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, paddingVertical: 13 },
  cancelText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  centerArea: { alignItems: "center", gap: 10, paddingVertical: 16 },
  progressLabel: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginVertical: 4 },
  progressFill: { height: "100%", borderRadius: 4 },
  progressSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 16 },
  doneCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  doneTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
});
