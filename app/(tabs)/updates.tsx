"use no memo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState, useCallback } from "react";
import { FooterDisclaimer } from "@/components/FooterDisclaimer";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppIcon } from "@/components/AppIcon";
import { haptics } from "@/lib/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useFirebaseCatalog, type LiveStoreCatalogApp } from "@/hooks/useFirebaseCatalog";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import colors from "@/constants/colors";
import { logScreenView, logUpdatesFilterChanged, logAppCardPress } from "@/lib/analytics";

const DARK = colors.dark;

function safeIso(val: unknown): string {
  return typeof val === "string" && val.length > 0 ? val : "";
}

function timeAgo(isoDate: unknown): string {
  const iso = safeIso(isoDate);
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  } catch { return ""; }
}

function groupLabel(isoDate: unknown): string {
  const iso = safeIso(isoDate);
  if (!iso) return "Older";
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff <= 1) return "Yesterday";
    if (diff <= 7) return "This Week";
    if (diff <= 14) return "Last Week";
    if (diff <= 30) return "This Month";
    return "Older";
  } catch { return "Older"; }
}

function groupApps(
  apps: LiveStoreCatalogApp[],
): Array<{ label: string; data: LiveStoreCatalogApp[] }> {
  const ORDER = ["Today", "Yesterday", "This Week", "Last Week", "This Month", "Older"];
  const map = new Map<string, LiveStoreCatalogApp[]>();
  for (const app of apps) {
    const lbl = groupLabel(app.updateDate.iso);
    if (!map.has(lbl)) map.set(lbl, []);
    map.get(lbl)!.push(app);
  }
  return ORDER.filter((l) => map.has(l)).map((l) => ({ label: l, data: map.get(l)! }));
}

function UpdateCard({ app, onPress }: { app: LiveStoreCatalogApp; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: DARK.card, borderColor: DARK.border, opacity: pressed ? 0.82 : 1 },
      ]}
    >
      <AppIcon
        uri={app.iconImage}
        slug={app.slug}
        overrideUri={app.iconOverrideUri}
        size={50}
        borderRadius={13}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardName, { color: DARK.foreground }]} numberOfLines={1}>
            {app.name}
          </Text>
          {app.isNew && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardCat, { color: DARK.accent }]}>{app.category}</Text>
        {(app.whatsNew?.[0] ?? app.changelog?.[0]) ? (
          <Text
            style={[styles.cardSnippet, { color: DARK.mutedForeground }]}
            numberOfLines={1}
          >
            • {app.whatsNew?.[0] ?? app.changelog![0]}
          </Text>
        ) : null}
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.verBadge, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.28)" }]}>
          <Text style={[styles.verText, { color: "#00e673" }]}>v{app.version}</Text>
        </View>
        <Text style={[styles.timeText, { color: DARK.mutedForeground }]}>{timeAgo(app.updateDate.iso)}</Text>
        <Ionicons name="chevron-forward" size={13} color={DARK.mutedForeground} />
      </View>
    </Pressable>
  );
}

type FilterMode = "all" | "new" | "mine";

type FlatItem =
  | { type: "header"; label: string }
  | { type: "app"; app: LiveStoreCatalogApp };

export default function UpdatesScreen() {
  "use no memo";
  const themeColors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");

  const { apps, newCount } = useFirebaseCatalog();
  const dm = useDownloadManager();

  const myDownloadedSlugs = useMemo(() => {
    const slugs = new Set<string>();
    for (const [slug, entry] of dm.downloads) {
      if (entry.phase !== "idle") slugs.add(slug);
    }
    for (const slug of Object.keys(dm.installedApps)) {
      slugs.add(slug);
    }
    return slugs;
  }, [dm.downloads, dm.installedApps]);

  const myAppsCount = useMemo(
    () => apps.filter((a) => myDownloadedSlugs.has(a.slug)).length,
    [apps, myDownloadedSlugs],
  );

  React.useEffect(() => { logScreenView("updates"); }, []);

  const sorted = useMemo(
    () =>
      [...apps].sort((a, b) => {
        const aIso = safeIso(a.updateDate?.iso);
        const bIso = safeIso(b.updateDate?.iso);
        return bIso.localeCompare(aIso);
      }),
    [apps],
  );

  const filtered = useMemo(() => {
    if (filter === "new") return sorted.filter((a) => a.isNew);
    if (filter === "mine") return sorted.filter((a) => myDownloadedSlugs.has(a.slug));
    return sorted;
  }, [sorted, filter, myDownloadedSlugs]);

  const flatItems = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = [];
    for (const { label, data } of groupApps(filtered)) {
      out.push({ type: "header", label });
      for (const app of data) out.push({ type: "app", app });
    }
    return out;
  }, [filtered]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 700));
    setRefreshing(false);
  }, []);

  const handlePress = useCallback(
    (slug: string, appName: string) => {
      haptics.light();
      logAppCardPress(slug, appName);
      router.push(`/app/${slug}`);
    },
    [router],
  );

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 118 : insets.bottom + 100;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset + 14,
            backgroundColor: themeColors.card,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.eyebrow, { color: themeColors.accent }]}>APP UPDATES</Text>
            <Text style={[styles.title, { color: themeColors.foreground }]}>
              What's New
            </Text>
          </View>
          <View style={[styles.totalBadge, { backgroundColor: themeColors.secondary, borderColor: themeColors.border }]}>
            <Ionicons name="layers-outline" size={13} color={themeColors.mutedForeground} />
            <Text style={[styles.totalText, { color: themeColors.mutedForeground }]}>
              {apps.length} apps
            </Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.chips}>
          <Pressable
            onPress={() => {
              haptics.selection();
              setFilter("all");
              logUpdatesFilterChanged("all", apps.length);
            }}
            style={[
              styles.chip,
              filter === "all"
                ? { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                : { backgroundColor: themeColors.secondary, borderColor: themeColors.border },
            ]}
          >
            <Ionicons
              name="grid-outline"
              size={12}
              color={filter === "all" ? themeColors.primaryForeground : themeColors.mutedForeground}
            />
            <Text
              style={[
                styles.chipText,
                { color: filter === "all" ? themeColors.primaryForeground : themeColors.mutedForeground },
              ]}
            >
              All ({apps.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.selection();
              setFilter("new");
              logUpdatesFilterChanged("new", newCount);
            }}
            style={[
              styles.chip,
              filter === "new"
                ? { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                : { backgroundColor: themeColors.secondary, borderColor: themeColors.border },
            ]}
          >
            <Ionicons
              name="sparkles"
              size={12}
              color={filter === "new" ? themeColors.primaryForeground : themeColors.mutedForeground}
            />
            <Text
              style={[
                styles.chipText,
                { color: filter === "new" ? themeColors.primaryForeground : themeColors.mutedForeground },
              ]}
            >
              New This Week ({newCount})
            </Text>
          </Pressable>

          {myAppsCount > 0 && (
            <Pressable
              onPress={() => {
                haptics.selection();
                setFilter("mine");
                logUpdatesFilterChanged("mine", myAppsCount);
              }}
              style={[
                styles.chip,
                filter === "mine"
                  ? { backgroundColor: "#fbbf24", borderColor: "#fbbf24" }
                  : { backgroundColor: themeColors.secondary, borderColor: "rgba(251,191,36,0.35)" },
              ]}
            >
              <Ionicons
                name="download-outline"
                size={12}
                color={filter === "mine" ? "#04131b" : "#fbbf24"}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: filter === "mine" ? "#04131b" : "#fbbf24" },
                ]}
              >
                My Apps ({myAppsCount})
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={flatItems}
        keyExtractor={(item, i) =>
          item.type === "header" ? `h-${item.label}` : `a-${item.app.slug}-${i}`
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionLabel, { color: themeColors.mutedForeground }]}>
                  {item.label}
                </Text>
                <View style={[styles.sectionLine, { backgroundColor: themeColors.border }]} />
              </View>
            );
          }
          return (
            <UpdateCard app={item.app} onPress={() => handlePress(item.app.slug, item.app.name)} />
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={filter === "new" ? "sparkles-outline" : filter === "mine" ? "download-outline" : "refresh-circle-outline"}
              size={52}
              color={themeColors.mutedForeground}
              style={{ opacity: 0.35 }}
            />
            <Text style={[styles.emptyTitle, { color: themeColors.foreground }]}>
              {filter === "new" ? "No new apps this week" : filter === "mine" ? "No downloads yet" : "No updates yet"}
            </Text>
            <Text style={[styles.emptySub, { color: themeColors.mutedForeground }]}>
              {filter === "new" ? "Switch to All to see everything" : filter === "mine" ? "Download an app and it will appear here" : "Pull down to refresh"}
            </Text>
          </View>
        }
        ListFooterComponent={<FooterDisclaimer />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 14 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  totalText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: 20 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    flexShrink: 0,
  },
  sectionLine: { flex: 1, height: 1 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 9,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", flex: 1 },
  newPill: {
    backgroundColor: "#00e673",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newPillText: { color: "#04131b", fontSize: 8, fontWeight: "800", fontFamily: "Inter_700Bold" },
  cardCat: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cardSnippet: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cardRight: { alignItems: "flex-end", gap: 4 },
  verBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1 },
  verText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  timeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 90, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
