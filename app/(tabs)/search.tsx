import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppIcon } from "@/components/AppIcon";
import { haptics } from "@/lib/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useFirebaseCatalog, type LiveStoreCatalogApp } from "@/hooks/useFirebaseCatalog";
import { logScreenView, logSearchQuery, logAppCardPress } from "@/lib/analytics";

const RECENT_SEARCHES_KEY = "@aa_mods_recent_searches_v1";
const MAX_RECENT = 8;

const normalizeSearch = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function SearchResultRow({ app, onPress }: { app: LiveStoreCatalogApp; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      testID={`search-result-${app.slug}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={48} borderRadius={12} />
      <View style={styles.resultMeta}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={1}>{app.name}</Text>
          {app.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={[styles.resultCategory, { color: colors.accent }]} numberOfLines={1}>
          {app.category} · v{app.version}
        </Text>
        <Text style={[styles.resultDesc, { color: colors.mutedForeground }]} numberOfLines={1}>
          {app.shortDescription}
        </Text>
      </View>
      <View style={styles.resultRight}>
        <View style={[styles.ratingChip, { backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.25)" }]}>
          <Ionicons name="star" size={10} color="#fbbf24" />
          <Text style={[styles.ratingText, { color: "#fbbf24" }]}>{app.rating}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginTop: 4 }} />
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { apps, loading, connected } = useFirebaseCatalog();

  useEffect(() => {
    logScreenView("search");
    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((val) => {
        if (val) {
          const parsed = JSON.parse(val) as unknown;
          if (Array.isArray(parsed)) setRecentSearches(parsed as string[]);
        }
      })
      .catch(() => {});
  }, []);

  const saveSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== trimmed);
      const next = [trimmed, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearRecentSearches = () => {
    haptics.medium();
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  };

  const results = useMemo(() => {
    const normalized = normalizeSearch(query);
    if (!normalized) return apps;
    const tokens = normalized.split(/\s+/).filter(Boolean);
    return apps.filter((app) => {
      const searchable = normalizeSearch(
        [app.name, app.shortDescription, app.category, app.slug, app.seoKeywords, app.subtitle].join(" "),
      );
      return tokens.every((token) => searchable.includes(token));
    });
  }, [query, apps]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      const timer = setTimeout(() => {
        logSearchQuery(trimmed, results.length);
        saveSearch(trimmed);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [query, results.length, saveSearch]);

  const handleAppPress = (app: LiveStoreCatalogApp) => {
    haptics.light();
    logAppCardPress(app.slug, app.name);
    router.push(`/app/${app.slug}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const showRecent = !query && recentSearches.length > 0 && focused;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Search</Text>
          <View style={[styles.connStatus, {
            backgroundColor: connected ? "rgba(0,230,115,0.12)" : "rgba(100,116,139,0.12)",
            borderColor: connected ? "rgba(0,230,115,0.3)" : colors.border,
          }]}>
            <View style={[styles.connDot, { backgroundColor: connected ? "#00e673" : colors.mutedForeground }]} />
            <Text style={[styles.connText, { color: connected ? colors.primary : colors.mutedForeground }]}>
              {connected ? "LIVE" : "OFFLINE"}
            </Text>
          </View>
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: focused ? colors.accent : colors.border }]}>
          <Ionicons name="search" size={18} color={focused ? colors.accent : colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Search apps, mods, features…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => query.trim() && saveSearch(query.trim())}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); haptics.selection(); }} testID="search-clear">
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Recent searches inline */}
        {showRecent && (
          <View style={[styles.recentBox, { borderTopColor: colors.border }]}>
            <View style={styles.recentHeader}>
              <Text style={[styles.recentLabel, { color: colors.mutedForeground }]}>Recent Searches</Text>
              <Pressable onPress={clearRecentSearches} hitSlop={10}>
                <Text style={[styles.recentClear, { color: colors.accent }]}>Clear</Text>
              </Pressable>
            </View>
            <View style={styles.recentChips}>
              {recentSearches.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => { setQuery(s); haptics.selection(); }}
                  style={[styles.recentChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                >
                  <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.recentChipText, { color: colors.foreground }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.slug}
        renderItem={({ item }) => (
          <SearchResultRow app={item} onPress={() => handleAppPress(item)} />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          results.length > 0 ? (
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {query
                ? `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`
                : `${results.length} apps ${loading ? "(syncing…)" : "available"}`}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {query ? "No results found" : "Start searching"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {query ? "Try different keywords" : "Type an app name or category"}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  connStatus: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 15 },
  recentBox: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  recentLabel: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  recentClear: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  recentChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recentChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  recentChipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  resultCount: { fontSize: 12, fontFamily: "Inter_400Regular", paddingVertical: 10 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  resultMeta: { flex: 1, gap: 2 },
  resultName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  newBadge: { backgroundColor: "#00e673", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  newBadgeText: { color: "#04131b", fontSize: 8, fontWeight: "800", fontFamily: "Inter_700Bold" },
  resultCategory: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3, fontFamily: "Inter_600SemiBold" },
  resultDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  resultRight: { alignItems: "flex-end", gap: 2 },
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  ratingText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
