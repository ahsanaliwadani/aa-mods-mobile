import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDownloadManager, type DownloadEntry, type DownloadHistoryEntry, SPEED_BOOST_DURATION_MS } from "@/contexts/DownloadManagerContext";
import { AppIcon } from "@/components/AppIcon";
import { haptics } from "@/lib/haptics";
import { logScreenView } from "@/lib/analytics";
import { AdBanner } from "@/components/AdBanner";
import { useRewardedAd } from "@/hooks/useRewardedAd";
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

function formatBoostCountdown(until: number): string {
  const ms = Math.max(0, until - Date.now());
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatHistoryDate(ts: number): string {
  const d = new Date(ts);
  const diffDays = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })} · ${time}`;
}

function HistoryCard({ entry, onPress }: { entry: DownloadHistoryEntry; onPress: () => void }) {
  const colors = useColors();
  const sizeStr = entry.bytesTotal > 0 ? formatBytes(entry.bytesTotal) : "";
  const outcomeColor = entry.outcome === "installed" ? "#22d3ee" : entry.outcome === "failed" ? "#ef4444" : colors.primary;
  const outcomeIcon: "checkmark-done-circle" | "alert-circle" | "checkmark-circle" =
    entry.outcome === "installed" ? "checkmark-done-circle" : entry.outcome === "failed" ? "alert-circle" : "checkmark-circle";
  const outcomeLabel = entry.outcome === "installed" ? "Installed" : entry.outcome === "failed" ? "Failed" : "Downloaded";
  return (
    <Pressable
      onPress={() => { haptics.light(); onPress(); }}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.92 : 1 }]}
    >
      <View style={styles.cardRow}>
        <AppIcon uri={entry.iconUri} slug={entry.slug} size={46} borderRadius={12} iconSize={22} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={1}>{entry.appName}</Text>
          <Text style={[styles.version, { color: colors.mutedForeground }]}>v{entry.storeVersion}{sizeStr ? ` · ${sizeStr}` : ""}</Text>
          <View style={styles.phaseRow}>
            <Ionicons name={outcomeIcon} size={12} color={outcomeColor} />
            <Text style={[styles.phaseLabel, { color: outcomeColor }]}>{outcomeLabel}</Text>
          </View>
        </View>
        <Text style={[styles.version, { color: colors.mutedForeground, textAlign: "right", fontSize: 11, maxWidth: 90 }]}>
          {formatHistoryDate(entry.completedAt)}
        </Text>
      </View>
    </Pressable>
  );
}

function DownloadCard({
  entry,
  isSpeedBoosted,
  onPress,
}: {
  entry: DownloadEntry;
  isSpeedBoosted: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const dm = useDownloadManager();
  const [saving, setSaving] = useState(false);

  const isActive = entry.phase === "downloading" || entry.phase === "resolving";
  const isDone = entry.phase === "done";
  const isError = entry.phase === "error";
  const isInstalling = entry.phase === "installing";
  const isInstalled = entry.phase === "installed";
  const isFinished = isDone || isInstalled;

  const bytesLeft = entry.bytesTotal > 0 ? entry.bytesTotal - entry.bytesWritten : 0;
  const boostedAndActive = isActive && isSpeedBoosted;

  const phaseColor = isInstalled
    ? "#22d3ee"
    : isDone
    ? colors.primary
    : isError
    ? "#ef4444"
    : isInstalling
    ? "#fbbf24"
    : boostedAndActive
    ? "#00e673"
    : colors.accent;

  const phaseLabel = isInstalled
    ? "Installed — tap to reinstall"
    : entry.phase === "resolving"
    ? "Resolving link…"
    : entry.phase === "downloading"
    ? `Downloading ${entry.progress}%`
    : entry.phase === "done"
    ? "Ready to install"
    : entry.phase === "installing"
    ? "Installing…"
    : entry.phase === "error"
    ? "Failed"
    : "Waiting";

  const phaseIcon: "checkmark-circle" | "alert-circle" | "hardware-chip-outline" | "download" | "checkmark-done-circle" =
    isInstalled
      ? "checkmark-done-circle"
      : isDone
      ? "checkmark-circle"
      : isError
      ? "alert-circle"
      : isInstalling
      ? "hardware-chip-outline"
      : "download";

  const cardBorderColor = boostedAndActive
    ? "rgba(0,230,115,0.45)"
    : isInstalled
    ? "rgba(34,211,238,0.25)"
    : isActive
    ? "rgba(0,230,115,0.3)"
    : isError
    ? "rgba(239,68,68,0.3)"
    : isDone
    ? "rgba(0,230,115,0.2)"
    : colors.border;

  const handleSaveToDownloads = async () => {
    setSaving(true);
    haptics.medium();
    const result = await dm.saveApkToDownloads(entry.slug);
    setSaving(false);
    if (result === "saved") {
      Alert.alert("Saved!", `${entry.appName} APK saved to your selected folder.`);
    } else if (result === "error") {
      Alert.alert("Save Failed", "Could not write the APK to the selected folder. Try picking a different folder, or check storage permissions.");
    }
  };

  return (
    <Pressable
      onPress={() => { haptics.light(); onPress(); }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: cardBorderColor,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.cardRow}>
        <AppIcon uri={entry.iconUri} slug={entry.slug} size={46} borderRadius={12} iconSize={22} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.nameRow}>
            <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={1}>
              {entry.appName}
            </Text>
            {boostedAndActive && (
              <View style={styles.boostChip}>
                <Text style={styles.boostChipText}>⚡ BOOSTED</Text>
              </View>
            )}
          </View>
          <Text style={[styles.version, { color: colors.mutedForeground }]}>v{entry.storeVersion}</Text>
          <View style={styles.phaseRow}>
            <Ionicons name={phaseIcon} size={12} color={phaseColor} />
            <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
            {isActive && entry.speedBps > 0 && (
              <Text style={[styles.speed, { color: boostedAndActive ? "#00e673" : colors.mutedForeground }]}>
                · {formatSpeed(entry.speedBps)}
                {bytesLeft > 0 && entry.speedBps > 0 ? ` · ${formatEta(bytesLeft, entry.speedBps)}` : ""}
              </Text>
            )}
          </View>
        </View>

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

          {Platform.OS === "android" && isFinished && entry.apkPath && !entry.apkPath.startsWith("content://") && (
            <Pressable
              onPress={handleSaveToDownloads}
              hitSlop={8}
              disabled={saving}
              style={[styles.actionBtn, { backgroundColor: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.35)", opacity: saving ? 0.5 : 1 }]}
            >
              <Ionicons name="folder-open-outline" size={14} color="#fbbf24" />
            </Pressable>
          )}

          {(isFinished || isError) && (
            <Pressable
              onPress={() => { haptics.selection(); dm.clearEntry(entry.slug); }}
              hitSlop={8}
              style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
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
          {Platform.OS === "android" && isInstalled && entry.apkPath && (
            <Pressable
              onPress={() => { haptics.medium(); dm.installApk(entry.slug); }}
              hitSlop={8}
              style={[styles.installBtn, { backgroundColor: "#22d3ee" }]}
            >
              <Ionicons name="refresh" size={12} color="#0a0a0a" />
              <Text style={[styles.installBtnText, { color: "#0a0a0a" }]}>Reinstall</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Progress bar */}
      {isActive && (
        <View style={[styles.progressTrack, { backgroundColor: boostedAndActive ? "rgba(0,230,115,0.15)" : "rgba(0,230,115,0.1)" }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: entry.phase === "resolving"
                  ? colors.accent
                  : boostedAndActive
                  ? "#00e673"
                  : colors.primary,
                width: entry.phase === "resolving" ? "30%" : `${entry.progress}%`,
              },
            ]}
          />
          {boostedAndActive && entry.phase === "downloading" && (
            <View style={styles.progressShimmer} />
          )}
        </View>
      )}

      {/* Size info */}
      {isActive && entry.bytesTotal > 0 && (
        <Text style={[styles.sizeMeta, { color: colors.mutedForeground }]}>
          {formatBytes(entry.bytesWritten)} / {formatBytes(entry.bytesTotal)}
        </Text>
      )}

      {/* Installed badge */}
      {isInstalled && (
        <View style={[styles.installedBadge, { backgroundColor: "rgba(34,211,238,0.08)", borderColor: "rgba(34,211,238,0.2)" }]}>
          <Ionicons name="checkmark-done-circle" size={12} color="#22d3ee" />
          <Text style={[styles.installedBadgeText, { color: "#22d3ee" }]}>
            APK is saved on device — tap Reinstall any time
          </Text>
        </View>
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
  const [boostCountdown, setBoostCountdown] = React.useState("");
  const [activeView, setActiveView] = React.useState<"downloads" | "history">("downloads");

  const handleRewardEarned = React.useCallback(() => {
    dm.activateSpeedBoost(SPEED_BOOST_DURATION_MS);
    haptics.medium();
  }, [dm]);

  const { show: showRewardedAd, isReady: rewardedReady } = useRewardedAd(handleRewardEarned);

  React.useEffect(() => { logScreenView("downloads"); }, []);

  React.useEffect(() => {
    if (!dm.isSpeedBoosted || !dm.speedBoostUntil) { setBoostCountdown(""); return; }
    const tick = () => {
      const ms = Math.max(0, (dm.speedBoostUntil ?? 0) - Date.now());
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setBoostCountdown(`${mins}m ${secs}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dm.isSpeedBoosted, dm.speedBoostUntil]);

  const allEntries = Array.from(dm.downloads.values());
  const active = allEntries.filter((e) => e.phase === "downloading" || e.phase === "resolving" || e.phase === "installing");
  const ready = allEntries.filter((e) => e.phase === "done");
  const installed = allEntries.filter((e) => e.phase === "installed");
  const failed = allEntries.filter((e) => e.phase === "error");
  const hasCompletedOrInstalled = ready.length > 0 || failed.length > 0 || installed.length > 0;

  const goToApp = (slug: string) => router.push(`/app/${slug}`);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>AA MODS</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Downloads</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.viewToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Pressable
              onPress={() => { haptics.selection(); setActiveView("downloads"); }}
              style={[styles.viewToggleBtn, activeView === "downloads" && { backgroundColor: "rgba(0,230,115,0.12)" }]}
            >
              <Text style={[styles.viewToggleTxt, { color: activeView === "downloads" ? colors.primary : colors.mutedForeground }]}>Downloads</Text>
            </Pressable>
            <Pressable
              onPress={() => { haptics.selection(); setActiveView("history"); }}
              style={[styles.viewToggleBtn, activeView === "history" && { backgroundColor: "rgba(0,230,115,0.12)" }]}
            >
              <Text style={[styles.viewToggleTxt, { color: activeView === "history" ? colors.primary : colors.mutedForeground }]}>History</Text>
              {dm.downloadHistory.length > 0 && (
                <View style={[styles.historyCountBadge, { backgroundColor: activeView === "history" ? "rgba(0,230,115,0.2)" : colors.card }]}>
                  <Text style={[styles.historyCountText, { color: activeView === "history" ? colors.primary : colors.mutedForeground }]}>
                    {dm.downloadHistory.length}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
          {activeView === "downloads" && hasCompletedOrInstalled && (
            <Pressable
              onPress={() => {
                haptics.medium();
                Alert.alert("Clear All", "This will remove all completed downloads and their APK files from device storage. Installed apps will remain on your phone.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear All", style: "destructive", onPress: () => dm.clearAllCompleted() },
                ]);
              }}
              style={({ pressed }) => [styles.clearBtn, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
          {activeView === "history" && dm.downloadHistory.length > 0 && (
            <Pressable
              onPress={() => { haptics.medium(); dm.clearHistory(); }}
              style={({ pressed }) => [styles.clearBtn, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {activeView === "history" ? (
        dm.downloadHistory.length === 0 ? (
          <View style={styles.emptyOuter}>
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: "rgba(34,211,238,0.07)", borderColor: "rgba(34,211,238,0.2)" }]}>
                <Ionicons name="time-outline" size={40} color="rgba(34,211,238,0.4)" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No history yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Completed and installed downloads will appear here with date and time.
              </Text>
            </View>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 }]}
          >
            <View style={styles.section}>
              {dm.downloadHistory.map((h) => (
                <HistoryCard key={h.id} entry={h} onPress={() => goToApp(h.slug)} />
              ))}
            </View>
          </ScrollView>
        )
      ) : allEntries.length === 0 ? (
        <View style={styles.emptyOuter}>
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
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 },
          ]}
        >
          {/* AdMob Banner */}
          {Platform.OS === "android" && <AdBanner variant="banner1" style={{ marginBottom: 8 }} />}

          {/* Download Booster — rewarded ad */}
          {Platform.OS === "android" && (
            dm.isSpeedBoosted ? (
              <View style={[boostStyles.activeBanner, { backgroundColor: "rgba(0,230,115,0.07)", borderColor: "rgba(0,230,115,0.25)" }]}>
                <View style={boostStyles.activeLeft}>
                  <View style={[boostStyles.boostBadge, { backgroundColor: "rgba(0,230,115,0.12)" }]}>
                    <Text style={boostStyles.boostBadgeIcon}>⚡</Text>
                  </View>
                  <View>
                    <Text style={[boostStyles.activeTitle, { color: "#00e673" }]}>Download Boost Active</Text>
                    <Text style={[boostStyles.activeSub, { color: colors.mutedForeground }]}>Maximum speed until expired</Text>
                  </View>
                </View>
                <View style={[boostStyles.activePill, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.3)" }]}>
                  <Text style={[boostStyles.activePillText, { color: "#00e673" }]}>{boostCountdown || "Active"}</Text>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => { haptics.medium(); showRewardedAd(); }}
                style={({ pressed }) => [
                  boostStyles.watchBanner,
                  {
                    backgroundColor: "rgba(251,191,36,0.06)",
                    borderColor: "rgba(251,191,36,0.25)",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={boostStyles.watchLeft}>
                  <View style={[boostStyles.boostBadge, { backgroundColor: "rgba(251,191,36,0.12)" }]}>
                    <Text style={boostStyles.boostBadgeIcon}>🎬</Text>
                  </View>
                  <View>
                    <Text style={[boostStyles.watchTitle, { color: "#fbbf24" }]}>Boost Download Speed</Text>
                    <Text style={[boostStyles.watchSub, { color: colors.mutedForeground }]}>Watch a short ad for 30 min max speed</Text>
                  </View>
                </View>
                <View style={[boostStyles.watchBtn, { backgroundColor: rewardedReady ? "#fbbf24" : colors.secondary }]}>
                  <Ionicons name="play" size={11} color={rewardedReady ? "#0a0a0a" : colors.mutedForeground} />
                  <Text style={[boostStyles.watchBtnText, { color: rewardedReady ? "#0a0a0a" : colors.mutedForeground }]}>
                    {rewardedReady ? "Watch Ad" : "Loading…"}
                  </Text>
                </View>
              </Pressable>
            )
          )}

          {/* Active */}
          {active.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: dm.isSpeedBoosted ? "#00e673" : colors.primary }]} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{active.length}</Text>
                {dm.isSpeedBoosted && (
                  <View style={[styles.sectionBoostTag, { backgroundColor: "rgba(0,230,115,0.1)", borderColor: "rgba(0,230,115,0.25)" }]}>
                    <Text style={[styles.sectionBoostTagText, { color: "#00e673" }]}>⚡ MAX SPEED</Text>
                  </View>
                )}
              </View>
              {active.map((e) => (
                <DownloadCard key={e.slug} entry={e} isSpeedBoosted={dm.isSpeedBoosted} onPress={() => goToApp(e.slug)} />
              ))}
            </View>
          )}

          {/* Ready to install */}
          {ready.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ready to Install</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{ready.length}</Text>
              </View>
              {ready.map((e) => (
                <DownloadCard key={e.slug} entry={e} isSpeedBoosted={false} onPress={() => goToApp(e.slug)} />
              ))}
            </View>
          )}

          {/* Installed */}
          {installed.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: "#22d3ee" }]} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Installed</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{installed.length}</Text>
              </View>
              {installed.map((e) => (
                <DownloadCard key={e.slug} entry={e} isSpeedBoosted={false} onPress={() => goToApp(e.slug)} />
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
                <DownloadCard key={e.slug} entry={e} isSpeedBoosted={false} onPress={() => goToApp(e.slug)} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const boostStyles = StyleSheet.create({
  activeBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  activeLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  boostBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  boostBadgeIcon: { fontSize: 18 },
  activeTitle: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  activeSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  activePill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activePillText: { fontSize: 10, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  watchBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  watchLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  watchTitle: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  watchSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  watchBtnText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#0a0a0a" },
});

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
  sectionBoostTag: {
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionBoostTagText: { fontSize: 9, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  appName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", flexShrink: 1 },
  boostChip: {
    backgroundColor: "rgba(0,230,115,0.15)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  boostChipText: { fontSize: 9, fontWeight: "800", fontFamily: "Inter_700Bold", color: "#00e673", letterSpacing: 0.3 },
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
  progressShimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 3,
  },
  sizeMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  installedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  installedBadgeText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  emptyOuter: { flex: 1 },
  emptyBoostWrap: { paddingHorizontal: 16, paddingTop: 16 },
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
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  viewToggle: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  viewToggleBtn: { paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  viewToggleTxt: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  historyCountBadge: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  historyCountText: { fontSize: 9, fontWeight: "800", fontFamily: "Inter_700Bold" },
});
