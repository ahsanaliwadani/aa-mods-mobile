import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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

function timeAgo(isoDate: string): string {
  if (!isoDate) return "Unknown date";
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function groupByWeek(apps: LiveStoreCatalogApp[]): Array<{ label: string; data: LiveStoreCatalogApp[] }> {
  const groups = new Map<string, LiveStoreCatalogApp[]>();

  for (const app of apps) {
    const d = app.updateDate.iso ? new Date(app.updateDate.iso) : null;
    const now = new Date();
    let label = "Older";
    if (d) {
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) label = "Today";
      else if (diff <= 1) label = "Yesterday";
      else if (diff <= 7) label = "This Week";
      else if (diff <= 14) label = "Last Week";
      else if (diff <= 30) label = "This Month";
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(app);
  }

  const order = ["Today", "Yesterday", "This Week", "Last Week", "This Month", "Older"];
  return order
    .filter((l) => groups.has(l))
    .map((label) => ({ label, data: groups.get(label)! }));
}

function UpdateCard({ app, onPress }: { app: LiveStoreCatalogApp; onPress: () => void }) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.cardRow}>
        <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={48} borderRadius={12} />

        <View style={styles.meta}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {app.name}
            </Text>
            {app.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={[styles.category, { color: colors.accent }]}>{app.category}</Text>
          {app.whatsNew && app.whatsNew.length > 0 && (
            <Text style={[styles.changeSnippet, { color: colors.mutedForeground }]} numberOfLines={2}>
              • {app.whatsNew[0]}
            </Text>
          )}
          {!app.whatsNew && app.changelog && app.changelog.length > 0 && (
            <Text style={[styles.changeSnippet, { color: colors.mutedForeground }]} numberOfLines={2}>
              • {app.changelog[0]}
            </Text>
          )}
        </View>

        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={[styles.versionBadge, { backgroundColor: "rgba(0,230,115,0.1)", borderColor: "rgba(0,230,115,0.25)" }]}>
            <Text style={[styles.versionText, { color: "#00e673" }]}>v{app.version}</Text>
          </View>
          <Text style={[styles.timeAgo, { color: colors.mutedForeground }]}>
            {timeAgo(app.updateDate.iso)}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} />
        </View>
      </View>
    </Pressable>
  );
}

export default function UpdatesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const { apps, loading, connected, lastUpdated, newCount } = useFirebaseCatalog();

  const sorted = useMemo(() => [...apps].sort((a, b) => {
    const aIso = a.updateDate.iso || "";
    const bIso = b.updateDate.iso || "";
    return bIso.localeCompare(aIso);
  }), [apps]);
  const grouped = useMemo(() => groupByWeek(sorted), [sorted]);

  const flatData = useMemo(() => {
    const items: Array<{ type: "header"; label: string } | { type: "app"; app: LiveStoreCatalogApp }> = [];
    for (const group of grouped) {
      items.push({ type: "header", label: group.label });
      for (const app of group.data) {
        items.push({ type: "app", app });
      }
    }
    return items;
  }, [grouped]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>REAL-TIME SYNC</Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>App Updates</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <View style={[styles.statusBadge, { backgroundColor: connected ? "rgba(0,230,115,0.12)" : "rgba(100,116,139,0.12)", borderColor: connected ? "rgba(0,230,115,0.3)" : colors.border }]}>
              <View style={[styles.statusDot, { backgroundColor: connected ? "#00e673" : colors.mutedForeground }]} />
              <Text style={[styles.statusText, { color: connected ? colors.primary : colors.mutedForeground }]}>
                {connected ? "LIVE" : "OFFLINE"}
              </Text>
            </View>
            {newCount > 0 && (
              <View style={styles.newCountBadge}>
                <Text style={styles.newCountText}>{newCount} new this week</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={flatData}
        keyExtractor={(item, i) => item.type === "header" ? `header-${item.label}` : `app-${item.app.slug}-${i}`}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              </View>
            );
          }
          return (
            <UpdateCard
              app={item.app}
              onPress={() => {
                haptics.light();
                router.push(`/app/${item.app.slug}`);
              }}
            />
          );
        }}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          lastUpdated ? (
            <Text style={[styles.lastSynced, { color: colors.mutedForeground }]}>
              Last synced: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Text>
          ) : loading ? (
            <Text style={[styles.lastSynced, { color: colors.mutedForeground }]}>Connecting to Firebase…</Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="refresh-circle-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No updates yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Pull to refresh</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 14 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20 },
  headerEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  newCountBadge: { backgroundColor: "rgba(0,230,115,0.15)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  newCountText: { color: "#00e673", fontSize: 10, fontFamily: "Inter_600SemiBold" },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  lastSynced: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 0 },
  sectionLine: { flex: 1, height: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 12, borderWidth: 1 },
  iconFallback: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  meta: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  newBadge: { backgroundColor: "#00e673", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  newBadgeText: { color: "#04131b", fontSize: 8, fontWeight: "800", fontFamily: "Inter_700Bold" },
  category: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  changeSnippet: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  versionBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  versionText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  timeAgo: { fontSize: 10, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
