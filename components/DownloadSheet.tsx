import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useState } from "react";
import {
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
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import { isExternalHost, isMediaFireUrl } from "@/lib/mediafireResolver";

export { isDirectApkUrl } from "@/lib/mediafireResolver";

const TRACK_WIDTH = Dimensions.get("window").width - 80;

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
  appVersion?: string;
  iconUri?: string;
  onClose: () => void;
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bps: number): string {
  if (bps <= 0) return "";
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatEta(bytesLeft: number, speedBps: number): string {
  if (speedBps <= 0 || bytesLeft <= 0) return "";
  const secs = Math.ceil(bytesLeft / speedBps);
  if (secs < 60) return `~${secs}s left`;
  return `~${Math.ceil(secs / 60)}m left`;
}

export function DownloadSheet({
  visible,
  link,
  label,
  appName,
  appSlug = "",
  appVersion = "1.0",
  iconUri,
  onClose,
}: Props) {
  const colors = useColors();
  const dm = useDownloadManager();
  const entry = appSlug ? dm.getEntry(appSlug) : undefined;

  const phase = entry?.phase ?? "idle";
  const progress = entry?.progress ?? 0;
  const bytesWritten = entry?.bytesWritten ?? 0;
  const bytesTotal = entry?.bytesTotal ?? 0;
  const speedBps = entry?.speedBps ?? 0;
  const errorMsg = entry?.error ?? "";
  const apkPath = entry?.apkPath;

  const progressWidth = Math.max(0, Math.min(TRACK_WIDTH, (TRACK_WIDTH * progress) / 100));

  const isDirectOrMediaFire = isMediaFireUrl(link) || !isExternalHost(link);
  const isNonResolvable = isExternalHost(link) && !isMediaFireUrl(link);

  const resetAndClose = useCallback(() => {
    if (phase === "downloading" || phase === "resolving") return;
    onClose();
  }, [phase, onClose]);

  const handleStart = async () => {
    if (!link) return;
    haptics.medium();

    if (isNonResolvable) {
      onClose();
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

    if (!appSlug) return;
    await dm.startDownload(appSlug, appName, appVersion, link, iconUri);
  };

  const handleInstall = async () => {
    if (!appSlug) return;
    haptics.medium();
    await dm.installApk(appSlug);
    onClose();
  };

  const handleCancel = async () => {
    if (phase === "downloading" || phase === "resolving") {
      if (appSlug) await dm.cancelDownload(appSlug);
    }
    onClose();
  };

  const handleRetry = async () => {
    if (appSlug) await dm.retryDownload(appSlug);
  };

  const bytesLeft = bytesTotal > 0 ? bytesTotal - bytesWritten : 0;

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
              <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={1}>
                {appName}
              </Text>
              <Text style={[styles.appSub, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          </View>

          {phase === "idle" && (
            <>
              <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons
                  name={isNonResolvable ? "globe-outline" : isMediaFireUrl(link) ? "cloud-download-outline" : "download-outline"}
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                  {isNonResolvable
                    ? "Download page will open inside the app — no external browser needed."
                    : isMediaFireUrl(link)
                    ? "MediaFire link detected — the app will resolve the direct APK link automatically and download in-app."
                    : "APK will download directly inside the app. Tap Install when done."}
                </Text>
              </View>

              <Pressable
                onPress={handleStart}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <Ionicons
                  name={isNonResolvable ? "open-outline" : "download"}
                  size={20}
                  color={colors.primaryForeground}
                />
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  {isNonResolvable
                    ? "Open Download Page"
                    : isMediaFireUrl(link)
                    ? "Resolve & Download APK"
                    : "Download APK"}
                </Text>
              </Pressable>

              <Pressable onPress={handleCancel} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
            </>
          )}

          {phase === "resolving" && (
            <View style={styles.centerArea}>
              <View style={[styles.resolveRow]}>
                <View style={[styles.resolveIconBox, { backgroundColor: "rgba(0,230,115,0.1)", borderColor: "rgba(0,230,115,0.25)" }]}>
                  <Ionicons name="cloud-download-outline" size={28} color={colors.primary} />
                </View>
              </View>
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                Resolving MediaFire Link…
              </Text>
              <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                Extracting direct APK download URL
              </Text>
              <Pressable onPress={handleCancel} style={[styles.cancelBtn, { borderColor: colors.border, marginTop: 8, width: "100%" }]}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
            </View>
          )}

          {phase === "downloading" && (
            <View style={styles.centerArea}>
              <View style={styles.progressHeaderRow}>
                <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                  Downloading… {progress}%
                </Text>
                {speedBps > 0 && (
                  <Text style={[styles.speedText, { color: colors.primary }]}>
                    {formatSpeed(speedBps)}
                  </Text>
                )}
              </View>

              <View style={[styles.progressTrack, { backgroundColor: colors.secondary, width: TRACK_WIDTH }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: progressWidth,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.progressMetaRow}>
                {bytesTotal > 0 ? (
                  <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                    {formatBytes(bytesWritten)} / {formatBytes(bytesTotal)}
                  </Text>
                ) : (
                  <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                    Please keep the app open
                  </Text>
                )}
                {bytesLeft > 0 && speedBps > 0 && (
                  <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                    {formatEta(bytesLeft, speedBps)}
                  </Text>
                )}
              </View>

              <Pressable onPress={handleCancel} style={[styles.cancelBtn, { borderColor: colors.border, width: "100%" }]}>
                <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel Download</Text>
              </Pressable>
            </View>
          )}

          {phase === "done" && (
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
                  onPress={handleInstall}
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

          {phase === "installing" && (
            <View style={styles.centerArea}>
              <View style={[styles.doneCircle, { backgroundColor: "rgba(0,230,115,0.08)" }]}>
                <Ionicons name="hardware-chip-outline" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>
                Launching Installer…
              </Text>
              <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                Allow install from unknown sources if prompted
              </Text>
            </View>
          )}

          {phase === "error" && (
            <>
              <View style={styles.centerArea}>
                <View style={[styles.doneCircle, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
                  <Ionicons name="alert-circle" size={40} color="#ef4444" />
                </View>
                <Text style={[styles.doneTitle, { color: "#ef4444" }]}>
                  {apkPath ? "Install Failed" : "Download Failed"}
                </Text>
                <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>{errorMsg}</Text>
              </View>

              {apkPath && Platform.OS === "android" && (
                <Pressable
                  onPress={handleInstall}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="hardware-chip-outline" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                    Retry Install
                  </Text>
                </Pressable>
              )}

              {!apkPath && (
                <Pressable
                  onPress={handleRetry}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="refresh" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Try Again</Text>
                </Pressable>
              )}

              <Pressable onPress={() => { dm.clearEntry(appSlug); onClose(); }} style={[styles.cancelBtn, { borderColor: colors.border }]}>
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
    paddingBottom: 44,
    paddingTop: 12,
    gap: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 4 },
  appName: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
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
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
  },
  cancelText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  centerArea: { alignItems: "center", gap: 10, paddingVertical: 10, width: "100%" },
  resolveRow: { alignItems: "center", marginBottom: 4 },
  resolveIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  progressLabel: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  speedText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginVertical: 4 },
  progressFill: { height: "100%", borderRadius: 4 },
  progressMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  progressSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  doneCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  doneTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
});
