import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDownloadManager, type DownloadEntry } from "@/contexts/DownloadManagerContext";
import { AppIcon } from "@/components/AppIcon";
import { haptics } from "@/lib/haptics";
import { logScreenView } from "@/lib/analytics";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatSpeed(bps: number): string {
  if (bps <= 0) return "";
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(0)} KB/s`;
  return `${(bps / 1024 / 1024).toFixed(1)} MB/s`;
}

function formatEta(bytesLeft: number, speedBps: number): string {
  if (speedBps <= 0 || bytesLeft <= 0) return "";
  const secs = Math.ceil(bytesLeft / speedBps);
  if (secs < 60) return `~${secs}s`;
  return `~${Math.ceil(secs / 60)}m`;
}

function DownloadCard({ entry, onPress }: { entry: DownloadEntry; onPress: () => void }) {
  const colors = useColors();
  const dm = useDownloadManager();

  const isActive = entry.phase === "downloading" || entry.phase === "resolving";
  const isDone = entry.phase === "done";
  const isError = entry.phase === "error";
  const isInstalling = entry.phase === "installing";

  const bytesLeft = entry.bytesTotal > 0 ? entry.bytesTotal - entry.bytesWritten : 0;

  const phaseColor = isDone
    ? colors.primary
    : isError
    ? "#ef4444"
    : isInstalling
    ? "#fbbf24"
    : colors.accent;

  const phaseLabel =
    entry.phase === "resolving"
      ? "Resolving link…"
      : entry.phase === "downloading"
      ? `Downloading ${entry.progress}%`
      : entry.phase === "done"
      ? "Complete"
      : entry.phase === "installing"
      ? "Installing…"
      : entry.phase === "error"
      ? "Failed"
      : "Waiting";

  const phaseIcon =
    isDone
      ? "checkmark-circle"
      : isError
      ? "alert-circle"
      : isInstalling
      ? "hardware-chip-outline"
      : "download";

  return (
    <Pressable
      onPress={() => { haptics.light(); onPress(); }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isActive
            ? "rgba(0,230,115,0.3)"
            : isError
            ? "rgba(239,68,68,0.3)"
            : isDone
            ? "rgba(0,230,115,0.2)"
            : colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <AppIcon uri={entry.iconUri} slug={entry.slug} size={46} borderRadius={12} iconSize={22} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={1}>
            {entry.appName}
          </Text>
          <Text style={[styles.version, { color: colors.mutedForeground }]}>v{entry.storeVersion}</Text>
          <View style={styles.phaseRow}>
            <Ionicons name={phaseIcon as "download"} size={12} color={phaseColor} />
            <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
            {isActive && entry.speedBps > 0 && (
              <Text style={[styles.speed, { color: colors.mutedForeground }]}>
                · {formatSpeed(entry.speedBps)}
                {bytesLeft > 0 && entry.speedBps > 0 ? ` · ${formatEta(bytesLeft, entry.speedBps)}` : ""}
              </Text>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {isActive && (
            <Pressable
              onPress={() => { haptics.medium(); dm.cancelDownload(entry.slug); }}
              hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" }]}
            >
              <Ionicons name="stop" size={14} color="#ef4444" />
            </Pressable>
          )}
          {isError && (
            <Pressable
              onPress={() => { haptics.medium(); dm.retryDownload(entry.slug); }}
              hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: "rgba(0,230,115,0.1)", borderColor: "rgba(0,230,115,0.3)" }]}
            >
              <Ionicons name="refresh" size={14} color={colors.primary} />
            </Pressable>
          )}
          {(isDone || isError) && (
            <Pressable
              onPress={() => { haptics.selection(); dm.clearEntry(entry.slug); }}
              hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons name="close" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
          {Platform.OS === "android" && isDone && entry.apkPath && (
            <Pressable
              onPress={() => { haptics.medium(); dm.installApk(entry.slug); }}
              hitSlop={8}
              style={[styles.installBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="download" size={12} color={colors.primaryForeground} />
              <Text style={[styles.installBtnText, { color: colors.primaryForeground }]}>Install</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Progress bar */}
      {isActive && (
        <View style={[styles.progressTrack, { backgroundColor: "rgba(0,230,115,0.1)" }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: entry.phase === "resolving" ? colors.accent : colors.primary,
                width: entry.phase === "resolving" ? "30%" : `${entry.progress}%`,
              },
            ]}
          />
        </View>
      )}

      {/* Size info */}
      {isActive && entry.bytesTotal > 0 && (
        <Text style={[styles.sizeMeta, { color: colors.mutedForeground }]}>
          {formatBytes(entry.bytesWritten)} / {formatBytes(entry.bytesTotal)}
        </Text>
      )}

      {/* Error message */}
      {isError && entry.error && (
        <Text style={[styles.errorText, { color: "#ef4444" }]} numberOfLines={2}>
          {entry.error}
        </Text>
      )}
    </Pressable>
  );
}

export default function DownloadsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const dm = useDownloadManager();

  React.useEffect(() => { logScreenView("downloads"); }, []);

  const allEntries = Array.from(dm.downloads.values());
  const active = allEntries.filter((e) => e.phase === "downloading" || e.phase === "resolving" || e.phase === "installing");
  const completed = allEntries.filter((e) => e.phase === "done");
  const failed = allEntries.filter((e) => e.phase === "error");
  const hasCompleted = completed.length > 0 || failed.length > 0;

  const goToApp = (slug: string) => router.push(`/app/${slug}`);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>AA MODS</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Downloads</Text>
        </View>
        {hasCompleted && (
          <Pressable
            onPress={() => { haptics.medium(); dm.clearAllCompleted(); }}
            style={({ pressed }) => [styles.clearBtn, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.clearBtnText, { color: colors.mutedForeground }]}>Clear</Text>
          </Pressable>
        )}
      </View>

      {allEntries.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: "rgba(0,230,115,0.07)", borderColor: "rgba(0,230,115,0.2)" }]}>
            <Ionicons name="download-outline" size={40} color="rgba(0,230,115,0.4)" />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No downloads yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Open any app and tap the download button to get started.
          </Text>
          <Pressable
            onPress={() => router.push("/")}
            style={({ pressed }) => [styles.browseBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="apps-outline" size={16} color={colors.primaryForeground} />
            <Text style={[styles.browseBtnText, { color: colors.primaryForeground }]}>Browse Apps</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 },
          ]}
        >
          {/* Active */}
          {active.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{active.length}</Text>
              </View>
              {active.map((e) => (
                <DownloadCard key={e.slug} entry={e} onPress={() => goToApp(e.slug)} />
              ))}
            </View>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: "#22d3ee" }]} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Completed</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{completed.length}</Text>
              </View>
              {completed.map((e) => (
                <DownloadCard key={e.slug} entry={e} onPress={() => goToApp(e.slug)} />
              ))}
            </View>
          )}

          {/* Failed */}
          {failed.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: "#ef4444" }]} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Failed</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{failed.length}</Text>
              </View>
              {failed.map((e) => (
                <DownloadCard key={e.slug} entry={e} onPress={() => goToApp(e.slug)} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 2,
  },
  clearBtnText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, gap: 8 },
  section: { gap: 8, marginBottom: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", flex: 1 },
  sectionCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  appName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  version: { fontSize: 11, fontFamily: "Inter_400Regular" },
  phaseRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  phaseLabel: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  speed: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 6, alignItems: "center" },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  installBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  installBtnText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  sizeMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 280,
  },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 22,
    marginTop: 4,
  },
  browseBtnText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
