import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppIcon } from "@/components/AppIcon";
import { DownloadSheet, useDownloadSheet } from "@/components/DownloadSheet";
import { haptics } from "@/lib/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useFirebaseCatalog } from "@/hooks/useFirebaseCatalog";
import { useFirebaseAppDetail } from "@/hooks/useFirebaseAppDetail";
import { useUserData } from "@/contexts/UserDataContext";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import { logAppDetailView, logFavoriteToggle, logShareApp, logAppNotFound, logChangelogExpanded, logMirrorLinkUsed, logSeeMoreModsPress } from "@/lib/analytics";
import { useInterstitialAd } from "@/hooks/useInterstitialAd";
import { AdBanner } from "@/components/AdBanner";

function StatCard({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={2} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

function SectionBlock({
  icon,
  title,
  color,
  bgColor,
  borderColor,
  children,
}: {
  icon: string;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: bgColor, borderColor }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as "information-circle-outline"} size={16} color={color} />
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function AppDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { apps, loading: catalogLoading } = useFirebaseCatalog();
  const app = apps.find((a) => a.slug === (slug ?? ""));
  const { detail, loading: detailLoading } = useFirebaseAppDetail(slug ?? "");
  const { isFavorite, toggleFavorite, addRecentlyViewed } = useUserData();
  const dm = useDownloadManager();
  const dlSheet = useDownloadSheet();

  const [showFullChangelog, setShowFullChangelog] = useState(false);
  const { show: showInterstitial } = useInterstitialAd();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const isFav = isFavorite(slug ?? "");

  const activeEntry = slug ? dm.getEntry(slug) : undefined;
  const isDownloading = activeEntry?.phase === "downloading" || activeEntry?.phase === "resolving";
  const downloadDone = activeEntry?.phase === "done";
  const downloadInstalled = activeEntry?.phase === "installed";
  const installedVersion = slug ? dm.getInstalledVersion(slug) : null;
  const isInstalled = slug ? dm.isInstalled(slug) : false;
  const hasUpdate = slug && app ? dm.hasUpdate(slug, app.version) : false;

  useEffect(() => {
    if (slug && app) {
      addRecentlyViewed(slug);
      logAppDetailView(slug, app.name, app.category);
    }
  }, [slug, app?.name]);

  // Auto-open the sheet once when a download finishes (so user sees Install Now).
  // Guard with a ref so it only opens once per "done" state — not every re-navigation.
  // Never auto-opens for the "installed" phase to avoid intrusive popups on navigation.
  const doneSheetOpenedRef = useRef(false);
  useEffect(() => {
    if (downloadDone && slug && !dlSheet.visible && !doneSheetOpenedRef.current) {
      doneSheetOpenedRef.current = true;
      dlSheet.open(activeEntry?.link ?? "", `Download ${app?.name ?? ""} APK`);
    }
    if (!downloadDone) {
      doneSheetOpenedRef.current = false; // reset when no longer in done state
    }
  }, [downloadDone]);

  const handleFavoriteToggle = () => {
    if (!slug) return;
    haptics.medium();
    const action = isFav ? "remove" : "add";
    toggleFavorite(slug);
    if (app) logFavoriteToggle(slug, app.name, action);
  };

  const handleShare = async () => {
    try {
      haptics.light();
      if (app) logShareApp(slug ?? "", app.name);
      const appLink = `https://aa-mods.vercel.app/app/${slug}`;
      const stars = "⭐".repeat(Math.round(parseFloat(app?.rating ?? "5")));
      const message = [
        `📱 ${app?.name ?? "AA Mods App"}`,
        `${stars} ${app?.rating ?? ""} · ${app?.category ?? ""}`,
        ``,
        `${app?.shortDescription ?? "Check out this MOD APK on AA Mods Store!"}`,
        ``,
        `🔖 Version: v${app?.version ?? ""}  |  📥 ${app?.downloads ?? ""}+ downloads`,
        ``,
        `⬇️ Download free on AA Mods Store:`,
        appLink,
        ``,
        `🛡️ 100% safe · verified · no ads`,
      ].join("\n");
      await Share.share({
        title: `${app?.name ?? "AA Mods"} — Free MOD APK`,
        message,
        url: appLink,
      });
    } catch { }
  };

  useEffect(() => {
    if (!catalogLoading && !app && slug) {
      logAppNotFound(slug);
    }
  }, [catalogLoading, app, slug]);

  if (!app) {
    const isNotFound = !catalogLoading;
    return (
      <View style={[styles.notFoundContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable testID="back-button" onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {isNotFound ? "Not Found" : "Loading…"}
          </Text>
          <View style={styles.shareBtn} />
        </View>
        <View style={styles.notFoundContent}>
          {isNotFound ? (
            <>
              <Ionicons name="alert-circle-outline" size={52} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
              <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>App Not Found</Text>
              <Text style={[styles.notFoundSubtitle, { color: colors.mutedForeground }]}>
                This app doesn't exist or may have been removed.
              </Text>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.notFoundBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.notFoundBtnText, { color: colors.primaryForeground }]}>Go Back</Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.notFoundTitle, { color: colors.foreground }]}>Loading…</Text>
              <Text style={[styles.notFoundSubtitle, { color: colors.mutedForeground }]}>
                Fetching live data from Firebase
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  const primaryDownloadLink = app.directDownloadLink ?? app.downloadLink ?? "";
  const hasMultipleDownloads = Array.isArray(app.downloadButtons) && app.downloadButtons.length > 0;
  const stars = [1, 2, 3, 4, 5];
  const ratingNum = parseFloat(app.rating);

  const changelog = detail?.changelog ?? app.changelog;
  const whatsNew = detail?.whatsNew ?? app.whatsNew;
  const mirrorLinks = detail?.mirrorLinks;
  const note = detail?.note;
  const longDescription = detail?.longDescription;
  const seeMoreMods = detail?.seeMoreMods;
  const fileSize = detail?.fileSize;
  const androidReq = detail?.androidRequirement;
  const permissions = detail?.permissions;
  const features = detail?.features;

  const changelogToShow = showFullChangelog ? changelog : changelog?.slice(0, 4);

  const handleDownload = async (link: string, label: string) => {
    haptics.medium();
    if (Platform.OS === "android") {
      await showInterstitial().catch(() => {});
    }
    dlSheet.open(link, label);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable
          testID="back-button"
          onPress={() => { haptics.selection(); router.back(); }}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>{app.name}</Text>
          {detailLoading && (
            <Text style={[styles.syncing, { color: colors.mutedForeground }]}>Syncing…</Text>
          )}
        </View>
        <Pressable
          testID="favorite-button"
          onPress={handleFavoriteToggle}
          style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons
            name={isFav ? "heart" : "heart-outline"}
            size={22}
            color={isFav ? "#ef4444" : colors.foreground}
          />
        </Pressable>
        <Pressable testID="share-button" onPress={handleShare} style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="share-2" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 32 }]}>

        {/* Hero */}
        <View style={[styles.heroSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <View>
              <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={80} borderRadius={20} iconSize={40} />
              {isInstalled && (
                <View style={styles.installedDot}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.heroInfo}>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                <View style={[styles.officialBadge, { backgroundColor: "rgba(34,211,238,0.1)", borderColor: "rgba(34,211,238,0.3)" }]}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.accent} />
                  <Text style={[styles.officialBadgeText, { color: colors.accent }]}>Official Build</Text>
                </View>
                {app.isNew && (
                  <View style={[styles.officialBadge, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.3)" }]}>
                    <Ionicons name="sparkles" size={11} color={colors.primary} />
                    <Text style={[styles.officialBadgeText, { color: colors.primary }]}>New Update</Text>
                  </View>
                )}
                {isInstalled && !hasUpdate && (
                  <View style={[styles.officialBadge, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.3)" }]}>
                    <Ionicons name="checkmark-circle" size={11} color={colors.primary} />
                    <Text style={[styles.officialBadgeText, { color: colors.primary }]}>Installed</Text>
                  </View>
                )}
                {hasUpdate && (
                  <View style={[styles.officialBadge, { backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.35)" }]}>
                    <Ionicons name="arrow-up-circle" size={11} color="#fbbf24" />
                    <Text style={[styles.officialBadgeText, { color: "#fbbf24" }]}>Update Available</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.heroAppName, { color: colors.foreground }]}>{app.name}</Text>
              <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]} numberOfLines={2}>{app.subtitle}</Text>
              <View style={styles.starsRow}>
                {stars.map((s) => (
                  <Ionicons key={s} name="star" size={14} color={ratingNum >= s ? "#fbbf24" : colors.border} />
                ))}
                <Text style={[styles.ratingNum, { color: colors.foreground }]}>{app.rating}</Text>
              </View>
            </View>
          </View>

          {/* Installed status banner */}
          {isInstalled && (
            <View style={[styles.installedBanner, {
              backgroundColor: hasUpdate ? "rgba(251,191,36,0.06)" : "rgba(0,230,115,0.05)",
              borderTopColor: hasUpdate ? "rgba(251,191,36,0.2)" : "rgba(0,230,115,0.2)",
            }]}>
              <Ionicons
                name={hasUpdate ? "arrow-up-circle-outline" : "checkmark-circle-outline"}
                size={14}
                color={hasUpdate ? "#fbbf24" : colors.primary}
              />
              <Text style={[styles.installedBannerText, { color: hasUpdate ? "#fbbf24" : colors.primary }]}>
                {hasUpdate
                  ? `Installed v${installedVersion} — v${app.version} available`
                  : `Installed v${installedVersion} — up to date`}
              </Text>
              {isInstalled && (
                <Pressable
                  onPress={() => { if (slug) dm.clearInstalledApp(slug); }}
                  hitSlop={8}
                  style={{ marginLeft: "auto" }}
                >
                  <Text style={[styles.clearInstalledText, { color: colors.mutedForeground }]}>Clear</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
            <StatCard label="VERSION" value={app.version} colors={colors} />
            <StatCard label="BASE" value={app.baseVersion} colors={colors} />
            <StatCard label="DOWNLOADS" value={app.downloads} colors={colors} />
            {fileSize ? (
              <StatCard label="SIZE" value={fileSize} colors={colors} />
            ) : (
              <StatCard label="UPDATED" value={app.updateDate.display || app.updateDate.iso} colors={colors} />
            )}
          </View>
        </View>

        {/* Active download progress card */}
        {activeEntry && (activeEntry.phase === "downloading" || activeEntry.phase === "resolving") && (
          <View style={[styles.activeDownloadCard, { backgroundColor: "rgba(0,230,115,0.05)", borderColor: "rgba(0,230,115,0.25)" }]}>
            <View style={styles.activeDownloadHeader}>
              <Ionicons name="download" size={14} color={colors.primary} />
              <Text style={[styles.activeDownloadTitle, { color: colors.primary }]}>
                {activeEntry.phase === "resolving" ? "Resolving download link…" : `Downloading… ${activeEntry.progress}%`}
              </Text>
              <Pressable
                onPress={() => { if (slug) dm.cancelDownload(slug); }}
                hitSlop={8}
                style={{ marginLeft: "auto" }}
              >
                <Text style={[styles.clearInstalledText, { color: "#ef4444" }]}>Cancel</Text>
              </Pressable>
            </View>
            <View style={[styles.activeProgressTrack, { backgroundColor: "rgba(0,230,115,0.12)" }]}>
              <View style={[styles.activeProgressFill, { backgroundColor: colors.primary, width: `${activeEntry.progress}%` }]} />
            </View>
            {activeEntry.bytesTotal > 0 && (
              <Text style={[styles.activeDownloadMeta, { color: colors.mutedForeground }]}>
                {`${(activeEntry.bytesWritten / 1024 / 1024).toFixed(1)} MB / ${(activeEntry.bytesTotal / 1024 / 1024).toFixed(1)} MB`}
                {activeEntry.speedBps > 0 ? ` · ${(activeEntry.speedBps / 1024 / 1024).toFixed(1)} MB/s` : ""}
              </Text>
            )}
          </View>
        )}

        {/* Note / Warning */}
        {note && (
          <View style={[styles.section, { backgroundColor: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.25)" }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle-outline" size={16} color="#fbbf24" />
              <Text style={[styles.sectionTitle, { color: "#fbbf24" }]}>IMPORTANT NOTE</Text>
            </View>
            <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{note}</Text>
          </View>
        )}

        {/* What's New */}
        {whatsNew && whatsNew.length > 0 && (
          <SectionBlock icon="sparkles-outline" title="WHAT'S NEW" color={colors.primary} bgColor="rgba(0,230,115,0.05)" borderColor="rgba(0,230,115,0.2)">
            {whatsNew.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <View style={[styles.listDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.sectionBody, { color: colors.mutedForeground, flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* About / Long Description */}
        <SectionBlock
          icon="document-text-outline"
          title={longDescription ? "ABOUT THIS MOD" : "DESCRIPTION"}
          color={colors.accent}
          bgColor={colors.card}
          borderColor={colors.border}
        >
          {detailLoading && !longDescription ? (
            <View style={{ gap: 6 }}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.shimmerLine,
                    { backgroundColor: colors.border, width: i === 3 ? "60%" : "100%" },
                  ]}
                />
              ))}
            </View>
          ) : (
            <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>
              {longDescription || app.shortDescription || "No description available."}
            </Text>
          )}
        </SectionBlock>

        {/* Meta chips */}
        <View style={[styles.metaRow, { gap: 10 }]}>
          <View style={[styles.metaChip, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
            <Ionicons name="layers-outline" size={16} color={colors.accent} />
            <Text style={[styles.metaChipLabel, { color: colors.mutedForeground }]}>Category</Text>
            <Text style={[styles.metaChipValue, { color: colors.foreground }]}>{app.category}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
            <Ionicons name="person-outline" size={16} color={colors.accent} />
            <Text style={[styles.metaChipLabel, { color: colors.mutedForeground }]}>Developer</Text>
            <Text style={[styles.metaChipValue, { color: colors.foreground }]}>{app.developer}</Text>
          </View>
        </View>

        {androidReq && (
          <View style={[styles.metaChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.accent} />
            <Text style={[styles.metaChipLabel, { color: colors.mutedForeground }]}>Min Android</Text>
            <Text style={[styles.metaChipValue, { color: colors.foreground }]}>{androidReq}</Text>
          </View>
        )}

        {/* Changelog */}
        {changelog && changelog.length > 0 && (
          <SectionBlock icon="list-outline" title="CHANGELOG" color={colors.accent} bgColor={colors.card} borderColor={colors.border}>
            {(changelogToShow ?? []).map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={[styles.changeIndex, { color: colors.mutedForeground }]}>{i + 1}.</Text>
                <Text style={[styles.sectionBody, { color: colors.mutedForeground, flex: 1 }]}>{item}</Text>
              </View>
            ))}
            {changelog.length > 4 && (
              <Pressable
                onPress={() => {
                  const next = !showFullChangelog;
                  setShowFullChangelog(next);
                  if (next) logChangelogExpanded(slug ?? "", app.name);
                }}
                style={[styles.showMoreBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.showMoreText, { color: colors.accent }]}>
                  {showFullChangelog ? "Show less" : `Show ${changelog.length - 4} more`}
                </Text>
                <Ionicons name={showFullChangelog ? "chevron-up" : "chevron-down"} size={14} color={colors.accent} />
              </Pressable>
            )}
          </SectionBlock>
        )}

        {/* Features */}
        {features && features.length > 0 && (
          <SectionBlock icon="sparkles-outline" title="MOD FEATURES" color={colors.primary} bgColor="rgba(0,230,115,0.04)" borderColor="rgba(0,230,115,0.18)">
            {features.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginTop: 4, flexShrink: 0 }} />
                <Text style={[styles.sectionBody, { color: colors.mutedForeground, flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* Downloads */}
        <View style={styles.downloadSection}>
          <Text style={[styles.downloadSectionTitle, { color: colors.foreground }]}>
            {hasUpdate ? "Update APK" : isInstalled ? "Reinstall APK" : "Download APK"}
          </Text>
          <Text style={[styles.downloadSectionSubtitle, { color: colors.mutedForeground }]}>
            {hasUpdate
              ? `Update from v${installedVersion} to v${app.version}`
              : downloadInstalled
              ? `APK saved on device — reinstall without re-downloading`
              : isInstalled
              ? `v${installedVersion} installed — download to reinstall`
              : "Secure download via AA Mods verified link"}
          </Text>

          <View style={{ gap: 10, marginTop: 12 }}>
            {/* Primary download button (directDownloadLink / downloadLink) */}
            {primaryDownloadLink ? (
              isDownloading ? (
                <View style={[styles.primaryDownloadBtn, { backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }]}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={[styles.primaryDownloadText, { color: colors.mutedForeground }]}>
                    {activeEntry?.phase === "resolving" ? "Resolving link…" : `Downloading ${activeEntry?.progress ?? 0}%`}
                  </Text>
                </View>
              ) : downloadDone ? (
                <Pressable
                  onPress={() => dlSheet.open(primaryDownloadLink, `Download ${app.name} APK`)}
                  style={({ pressed }) => [styles.primaryDownloadBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Ionicons name="hardware-chip-outline" size={20} color={colors.primaryForeground} />
                  <Text style={[styles.primaryDownloadText, { color: colors.primaryForeground }]}>Install Now</Text>
                </Pressable>
              ) : downloadInstalled ? (
                <Pressable
                  onPress={() => dlSheet.open(primaryDownloadLink, `Download ${app.name} APK`)}
                  style={({ pressed }) => [styles.primaryDownloadBtn, { backgroundColor: "#22d3ee", opacity: pressed ? 0.85 : 1 }]}
                >
                  <Ionicons name="refresh-circle" size={20} color="#0a0a0a" />
                  <Text style={[styles.primaryDownloadText, { color: "#0a0a0a" }]}>Reinstall APK</Text>
                </Pressable>
              ) : (
                <Pressable
                  testID="download-button"
                  onPress={() => handleDownload(primaryDownloadLink, `Download ${app.name} APK`)}
                  style={({ pressed }) => [styles.primaryDownloadBtn, {
                    backgroundColor: hasUpdate ? "#fbbf24" : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }]}
                >
                  <Ionicons
                    name={hasUpdate ? "arrow-up-circle" : isInstalled ? "refresh-circle" : "download"}
                    size={20}
                    color={hasUpdate ? "#000" : colors.primaryForeground}
                  />
                  <Text style={[styles.primaryDownloadText, { color: hasUpdate ? "#000" : colors.primaryForeground }]}>
                    {hasUpdate ? `Update to v${app.version}` : isInstalled ? `Reinstall v${app.version}` : `Download ${app.name} APK`}
                  </Text>
                </Pressable>
              )
            ) : null}

            {/* Extra download variant buttons (from downloadButtons array) — styled by btn.style */}
            {hasMultipleDownloads && app.downloadButtons!.map((btn, idx) => {
              const isPrimary = btn.style === "primary";
              return isPrimary ? (
                <Pressable
                  key={idx}
                  testID={idx === 0 && !primaryDownloadLink ? "download-button" : `download-variant-${idx}`}
                  onPress={() => handleDownload(btn.link, btn.label || `Download ${app.name} APK`)}
                  style={({ pressed }) => [styles.primaryDownloadBtn, {
                    backgroundColor: hasUpdate ? "#fbbf24" : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }]}
                >
                  <Ionicons
                    name={hasUpdate ? "arrow-up-circle" : "download"}
                    size={20}
                    color={hasUpdate ? "#000" : colors.primaryForeground}
                  />
                  <Text style={[styles.primaryDownloadText, { color: hasUpdate ? "#000" : colors.primaryForeground }]}>
                    {btn.label || (hasUpdate ? `Update to v${app.version}` : "Download APK")}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  key={idx}
                  onPress={() => handleDownload(btn.link, btn.label || "Download APK")}
                  style={({ pressed }) => [styles.secondaryDownloadBtn, {
                    backgroundColor: "rgba(34,211,238,0.06)",
                    borderColor: "rgba(34,211,238,0.3)",
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <Ionicons name="cloud-download-outline" size={17} color={colors.accent} />
                  <Text style={[styles.secondaryDownloadText, { color: colors.accent, flex: 1 }]}>
                    {btn.label || "Download APK"}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                </Pressable>
              );
            })}

            {/* No download available */}
            {!primaryDownloadLink && !hasMultipleDownloads && (
              <View style={[styles.noDownloadNotice, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.noDownloadText, { color: colors.mutedForeground }]}>
                  Download link not available. Check back soon.
                </Text>
              </View>
            )}
          </View>

          {/* AdMob Banner between download section and mirror links */}
          {Platform.OS === "android" && <AdBanner variant="banner2" style={{ marginTop: 8, marginBottom: 4 }} />}

          {/* Mirror links */}
          {mirrorLinks && mirrorLinks.length > 0 && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={[styles.mirrorLabel, { color: colors.mutedForeground }]}>Mirror Links</Text>
              {mirrorLinks.map((m, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    logMirrorLinkUsed(slug ?? "", app.name, m.label);
                    handleDownload(m.link, m.label);
                  }}
                  style={({ pressed }) => [
                    styles.secondaryDownloadBtn,
                    { backgroundColor: "rgba(34,211,238,0.08)", borderColor: "rgba(34,211,238,0.35)", opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="link-outline" size={16} color={colors.accent} />
                  <Text style={[styles.secondaryDownloadText, { color: colors.accent }]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Permissions */}
        {permissions && permissions.length > 0 && (
          <SectionBlock icon="shield-outline" title="PERMISSIONS REQUIRED" color="#f59e0b" bgColor="rgba(245,158,11,0.04)" borderColor="rgba(245,158,11,0.2)">
            {permissions.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Ionicons name="lock-closed-outline" size={13} color="#f59e0b" style={{ marginTop: 5, flexShrink: 0 }} />
                <Text style={[styles.sectionBody, { color: colors.mutedForeground, flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </SectionBlock>
        )}

        {/* Support */}
        {(detail?.telegramGroup || detail?.supportEmail) && (
          <SectionBlock icon="headset-outline" title="SUPPORT" color={colors.accent} bgColor={colors.card} borderColor={colors.border}>
            {detail.telegramGroup && (
              <Pressable
                onPress={() => Linking.openURL(detail.telegramGroup!)}
                style={[styles.supportRow, { borderColor: colors.border }]}
              >
                <MaterialCommunityIcons name="send" size={16} color="#2AABEE" />
                <Text style={[styles.supportText, { color: colors.foreground }]}>Telegram Support Group</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
              </Pressable>
            )}
            {detail.supportEmail && (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${detail.supportEmail}`)}
                style={[styles.supportRow, { borderColor: colors.border }]}
              >
                <Ionicons name="mail-outline" size={16} color={colors.accent} />
                <Text style={[styles.supportText, { color: colors.foreground }]}>{detail.supportEmail}</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
              </Pressable>
            )}
          </SectionBlock>
        )}

        {/* See More Mods */}
        {seeMoreMods && seeMoreMods.length > 0 && (
          <SectionBlock icon="apps-outline" title="SEE MORE MODS" color={colors.accent} bgColor={colors.card} borderColor={colors.border}>
            <View style={{ gap: 8, marginTop: 4 }}>
              {seeMoreMods.map((m) => (
                <Pressable
                  key={m.slug}
                  onPress={() => {
                    haptics.selection();
                    logSeeMoreModsPress(slug ?? "", m.slug);
                    router.push(`/app/${m.slug}`);
                  }}
                  style={({ pressed }) => [styles.seeMoreRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="cube-outline" size={16} color={colors.primary} />
                  <Text style={[styles.seeMoreText, { color: colors.foreground }]}>{m.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>
          </SectionBlock>
        )}
      </ScrollView>

      <DownloadSheet
        visible={dlSheet.visible}
        link={dlSheet.currentLink}
        label={dlSheet.currentLabel}
        appName={app.name}
        iconUri={app.iconImage}
        appSlug={app.slug}
        appVersion={app.version}
        onClose={dlSheet.close}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  syncing: { fontSize: 10, fontFamily: "Inter_400Regular" },
  shareBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, gap: 12 },
  heroSection: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  heroTop: { flexDirection: "row", gap: 14, padding: 18, alignItems: "flex-start" },
  heroIconWrapper: { position: "relative" },
  installedDot: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#04131b",
    borderRadius: 10,
  },
  installedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  installedBannerText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold", flex: 1 },
  clearInstalledText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  activeDownloadCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  activeDownloadHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeDownloadTitle: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold", flex: 1 },
  activeProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  activeProgressFill: { height: "100%", borderRadius: 3 },
  activeDownloadMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  heroInfo: { flex: 1, gap: 5 },
  officialBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  officialBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, fontFamily: "Inter_700Bold" },
  heroAppName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, fontFamily: "Inter_700Bold" },
  heroSubtitle: { fontSize: 13, lineHeight: 18, fontFamily: "Inter_400Regular" },
  starsRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingNum: { fontSize: 13, fontWeight: "700", marginLeft: 4, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", borderTopWidth: 1 },
  statCard: { flex: 1, alignItems: "center", padding: 12, gap: 4 },
  statLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
  statValue: { fontSize: 12, fontWeight: "700", textAlign: "center", fontFamily: "Inter_700Bold" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  sectionBody: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  listItem: { flexDirection: "row", gap: 8, marginBottom: 6, alignItems: "flex-start" },
  listDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8, flexShrink: 0 },
  changeIndex: { fontSize: 13, fontFamily: "Inter_700Bold", width: 18, flexShrink: 0, marginTop: 3 },
  showMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  showMoreText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  metaRow: { flexDirection: "row" },
  metaChip: { borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  metaChipLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.2, fontFamily: "Inter_700Bold" },
  metaChipValue: { fontSize: 13, fontWeight: "600", textAlign: "center", fontFamily: "Inter_600SemiBold" },
  downloadSection: { gap: 4, marginTop: 4 },
  downloadSectionTitle: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, fontFamily: "Inter_700Bold" },
  downloadSectionSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  primaryDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryDownloadText: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  secondaryDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryDownloadText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  btnLabelSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  noDownloadNotice: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 8 },
  noDownloadText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  mirrorLabel: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", marginTop: 4 },
  supportRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, marginTop: 6 },
  supportText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  seeMoreRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, marginTop: 4 },
  seeMoreText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  shimmerLine: { height: 12, borderRadius: 6, marginBottom: 6 },
  notFoundContainer: { flex: 1 },
  notFoundContent: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  notFoundTitle: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  notFoundSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  notFoundBtn: { borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, marginTop: 8 },
  notFoundBtnText: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
