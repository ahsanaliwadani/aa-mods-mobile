import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDownloadManager, type DownloadEntry } from "@/contexts/DownloadManagerContext";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bps: number): string {
  if (bps <= 0) return "";
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
}

type SingleBarProps = {
  entry: DownloadEntry;
  onPress: () => void;
};

function SingleBar({ entry, onPress }: SingleBarProps) {
  const colors = useColors();
  const dm = useDownloadManager();
  const widthAnim = useRef(new Animated.Value(entry.progress)).current;

  const isDone = entry.phase === "done";
  const isError = entry.phase === "error";
  const isActive = entry.phase === "downloading" || entry.phase === "resolving";

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: entry.progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [entry.progress]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.barRow,
        {
          backgroundColor: isError
            ? "rgba(239,68,68,0.08)"
            : isDone
            ? "rgba(0,230,115,0.06)"
            : colors.card,
          borderColor: isError
            ? "rgba(239,68,68,0.35)"
            : isDone
            ? "rgba(0,230,115,0.3)"
            : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.barLeft}>
        <View
          style={[
            styles.barIconBox,
            {
              backgroundColor: isError
                ? "rgba(239,68,68,0.12)"
                : isDone
                ? "rgba(0,230,115,0.12)"
                : "rgba(0,230,115,0.08)",
            },
          ]}
        >
          <Ionicons
            name={
              isError
                ? "alert-circle"
                : isDone
                ? "checkmark-circle"
                : entry.phase === "resolving"
                ? "cloud-download-outline"
                : "download"
            }
            size={16}
            color={isError ? "#ef4444" : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.barAppName, { color: colors.foreground }]} numberOfLines={1}>
            {entry.appName}
          </Text>
          <Text style={[styles.barStatus, { color: colors.mutedForeground }]} numberOfLines={1}>
            {isError
              ? "Failed — tap to retry"
              : isDone
              ? "Ready to install — tap to install"
              : entry.phase === "resolving"
              ? "Resolving MediaFire link…"
              : entry.phase === "installing"
              ? "Launching installer…"
              : entry.bytesTotal > 0
              ? `${formatBytes(entry.bytesWritten)} / ${formatBytes(entry.bytesTotal)}${entry.speedBps > 0 ? ` · ${formatSpeed(entry.speedBps)}` : ""}`
              : `Downloading… ${entry.progress}%`}
          </Text>
        </View>
      </View>

      <View style={styles.barRight}>
        {isActive && (
          <Text style={[styles.barPct, { color: colors.primary }]}>
            {entry.phase === "resolving" ? "…" : `${entry.progress}%`}
          </Text>
        )}
        {isDone && (
          <View style={[styles.installPill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.installPillText, { color: colors.primaryForeground }]}>
              Install
            </Text>
          </View>
        )}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (isError || isDone) {
              dm.clearEntry(entry.slug);
            } else {
              dm.cancelDownload(entry.slug);
            }
          }}
          hitSlop={10}
        >
          <Ionicons
            name={isError ? "close-circle" : "close-circle-outline"}
            size={20}
            color={isError ? "#ef4444" : colors.mutedForeground}
          />
        </Pressable>
      </View>

      {isActive && (
        <View style={[styles.progressUnderline, { backgroundColor: colors.secondary }]}>
          <Animated.View
            style={[
              styles.progressUnderlineFill,
              {
                backgroundColor: colors.primary,
                width: widthAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

type Props = {
  tabBarHeight?: number;
  onEntryPress?: (slug: string) => void;
};

export function GlobalDownloadBar({ tabBarHeight, onEntryPress }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dm = useDownloadManager();

  const activeEntries = Array.from(dm.downloads.values()).filter(
    (e) => e.phase !== "idle",
  );

  if (activeEntries.length === 0) return null;

  const bottomOffset = tabBarHeight ?? (Platform.OS === "web" ? 84 : 56 + insets.bottom);

  return (
    <View
      style={[styles.container, { bottom: bottomOffset, backgroundColor: colors.background, pointerEvents: "box-none" }]}
    >
      {activeEntries.slice(0, 3).map((entry) => (
        <SingleBar
          key={entry.slug}
          entry={entry}
          onPress={() => onEntryPress?.(entry.slug)}
        />
      ))}
      {activeEntries.length > 3 && (
        <View style={[styles.moreRow, { borderColor: colors.border }]}>
          <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
            +{activeEntries.length - 3} more download
            {activeEntries.length - 3 > 1 ? "s" : ""}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    zIndex: 50,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: "hidden",
  },
  barLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  barIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  barAppName: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  barStatus: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  barRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  barPct: { fontSize: 13, fontWeight: "800", fontFamily: "Inter_700Bold" },
  installPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  installPillText: { fontSize: 11, fontWeight: "800", fontFamily: "Inter_700Bold" },
  progressUnderline: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3 },
  progressUnderlineFill: { height: "100%" },
  moreRow: { alignItems: "center", paddingVertical: 6, borderTopWidth: 1, marginTop: 2 },
  moreText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
