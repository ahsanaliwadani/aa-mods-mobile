import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/AppIcon";
import { useColors } from "@/hooks/useColors";
import { useFirebaseCatalog, type LiveStoreCatalogApp } from "@/hooks/useFirebaseCatalog";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { useUserData } from "@/contexts/UserDataContext";
import { haptics } from "@/lib/haptics";
import { logScreenView } from "@/lib/analytics";

function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={pStyles.sectionTitle}>
      <Text style={[pStyles.sectionTitleText, { color: colors.foreground }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={[pStyles.sectionAction, { color: colors.accent }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AppRow({
  app,
  onPress,
  trailing,
}: {
  app: LiveStoreCatalogApp;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        pStyles.appRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <AppIcon uri={app.iconImage} size={44} borderRadius={11} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[pStyles.appRowName, { color: colors.foreground }]} numberOfLines={1}>
          {app.name}
        </Text>
        <Text style={[pStyles.appRowMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {app.category} · v{app.version}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  const colors = useColors();
  return (
    <View style={[pStyles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon as "apps"} size={20} color={colors.primary} />
      <Text style={[pStyles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[pStyles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  sub,
  onPress,
  iconColor,
  disabled,
}: {
  icon: string;
  label: string;
  sub?: string;
  onPress: () => void;
  iconColor?: string;
  disabled?: boolean;
}) {
  const colors = useColors();
  if (disabled) return null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        pStyles.linkRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Ionicons name={icon as "link"} size={20} color={iconColor ?? colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[pStyles.linkLabel, { color: colors.foreground }]}>{label}</Text>
        {sub ? <Text style={[pStyles.linkSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function openUrl(url: string) {
  if (!url) return;
  const finalUrl = url.startsWith("http") ? url : `https://${url}`;
  Linking.openURL(finalUrl).catch(() => {});
}

function prettyUrl(url: string): string {
  try {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  } catch { return url; }
}

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { apps, categories, connected } = useFirebaseCatalog();
  const { config } = useRemoteConfig();
  const { favorites, toggleFavorite, clearFavorites, recentSlugs, clearRecentlyViewed } = useUserData();

  useEffect(() => {
    logScreenView("profile");
  }, []);

  const favoriteApps = favorites
    .map((slug) => apps.find((a) => a.slug === slug))
    .filter(Boolean) as LiveStoreCatalogApp[];

  const recentApps = recentSlugs
    .map((slug) => apps.find((a) => a.slug === slug))
    .filter(Boolean) as LiveStoreCatalogApp[];

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const totalCategories = categories.filter((c) => c !== "All").length;
  const newThisWeek = apps.filter((a) => a.isNew).length;

  const handleAppPress = (slug: string) => {
    haptics.light();
    router.push(`/app/${slug}`);
  };

  return (
    <ScrollView
      style={[pStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        pStyles.scrollContent,
        { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[pStyles.header, { paddingTop: topInset + 12 }]}>
        <View>
          <Text style={[pStyles.headerEyebrow, { color: colors.accent }]}>AA MODS</Text>
          <Text style={[pStyles.headerTitle, { color: colors.foreground }]}>For You</Text>
        </View>
        <View style={[pStyles.connBadge, {
          backgroundColor: connected ? "rgba(0,230,115,0.12)" : "rgba(100,116,139,0.12)",
          borderColor: connected ? "rgba(0,230,115,0.3)" : colors.border,
        }]}>
          <View style={[pStyles.connDot, { backgroundColor: connected ? "#00e673" : colors.mutedForeground }]} />
          <Text style={[pStyles.connText, { color: connected ? colors.primary : colors.mutedForeground }]}>
            {connected ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      <View style={pStyles.statsRow}>
        <StatItem icon="apps" label="Total Apps" value={apps.length} />
        <StatItem icon="layers-outline" label="Categories" value={totalCategories} />
        <StatItem icon="sparkles" label="New This Week" value={newThisWeek} />
      </View>

      {/* Favorites */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle
          title="Favorites"
          action={favoriteApps.length > 0 ? "Clear All" : undefined}
          onAction={() => { haptics.medium(); clearFavorites(); }}
        />
        {favoriteApps.length === 0 ? (
          <View style={[pStyles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="heart-outline" size={32} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
            <Text style={[pStyles.emptyText, { color: colors.mutedForeground }]}>
              No favorites yet. Tap the heart on any app to save it.
            </Text>
          </View>
        ) : (
          <View style={pStyles.appList}>
            {favoriteApps.map((app) => (
              <AppRow
                key={app.slug}
                app={app}
                onPress={() => handleAppPress(app.slug)}
                trailing={
                  <Pressable onPress={() => { haptics.selection(); toggleFavorite(app.slug); }} hitSlop={10}>
                    <Ionicons name="heart" size={20} color="#ef4444" />
                  </Pressable>
                }
              />
            ))}
          </View>
        )}
      </View>

      {/* Recently Viewed */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle
          title="Recently Viewed"
          action={recentApps.length > 0 ? "Clear" : undefined}
          onAction={() => { haptics.medium(); clearRecentlyViewed(); }}
        />
        {recentApps.length === 0 ? (
          <View style={[pStyles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={32} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
            <Text style={[pStyles.emptyText, { color: colors.mutedForeground }]}>
              Apps you open will appear here for quick access.
            </Text>
          </View>
        ) : (
          <View style={pStyles.appList}>
            {recentApps.slice(0, 8).map((app) => (
              <AppRow
                key={app.slug}
                app={app}
                onPress={() => handleAppPress(app.slug)}
                trailing={<Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />}
              />
            ))}
          </View>
        )}
      </View>

      {/* Links & Support — loaded from Firebase */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle title="Links & Support" />
        <View style={pStyles.linkList}>
          <LinkRow
            icon="paper-plane"
            label="Telegram Channel"
            sub={config.telegramUrl ? prettyUrl(config.telegramUrl) : "Updates & announcements"}
            iconColor="#2AABEE"
            onPress={() => openUrl(config.telegramUrl)}
            disabled={!config.telegramUrl}
          />
          <LinkRow
            icon="globe-outline"
            label="AA Mods Website"
            sub={config.websiteUrl ? prettyUrl(config.websiteUrl) : ""}
            onPress={() => openUrl(config.websiteUrl)}
            disabled={!config.websiteUrl}
          />
          <LinkRow
            icon="logo-discord"
            label="Discord Server"
            sub={config.discordUrl ? prettyUrl(config.discordUrl) : ""}
            iconColor="#5865F2"
            onPress={() => openUrl(config.discordUrl)}
            disabled={!config.discordUrl}
          />
          <LinkRow
            icon="logo-instagram"
            label="Instagram"
            sub={config.instagramUrl ? prettyUrl(config.instagramUrl) : ""}
            iconColor="#E1306C"
            onPress={() => openUrl(config.instagramUrl)}
            disabled={!config.instagramUrl}
          />
          <LinkRow
            icon="mail-outline"
            label="Contact Support"
            sub={config.supportEmail || ""}
            onPress={() => config.supportEmail && Linking.openURL(`mailto:${config.supportEmail}`).catch(() => {})}
            disabled={!config.supportEmail}
          />
        </View>
      </View>

      {/* About */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle title="About" />
        <View style={[pStyles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={pStyles.aboutRow}>
            <Text style={[pStyles.aboutLabel, { color: colors.mutedForeground }]}>App Version</Text>
            <Text style={[pStyles.aboutValue, { color: colors.foreground }]}>v{appVersion}</Text>
          </View>
          <View style={[pStyles.divider, { backgroundColor: colors.border }]} />
          <View style={pStyles.aboutRow}>
            <Text style={[pStyles.aboutLabel, { color: colors.mutedForeground }]}>Platform</Text>
            <Text style={[pStyles.aboutValue, { color: colors.foreground }]}>
              {Platform.OS === "android" ? "Android" : Platform.OS === "ios" ? "iOS" : "Web"}
            </Text>
          </View>
          <View style={[pStyles.divider, { backgroundColor: colors.border }]} />
          <View style={pStyles.aboutRow}>
            <Text style={[pStyles.aboutLabel, { color: colors.mutedForeground }]}>Database</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connected ? "#00e673" : colors.mutedForeground }} />
              <Text style={[pStyles.aboutValue, { color: colors.foreground }]}>
                Firebase {connected ? "(Connected)" : "(Offline)"}
              </Text>
            </View>
          </View>
          <View style={[pStyles.divider, { backgroundColor: colors.border }]} />
          <View style={pStyles.aboutRow}>
            <Text style={[pStyles.aboutLabel, { color: colors.mutedForeground }]}>Developer</Text>
            <Text style={[pStyles.aboutValue, { color: colors.foreground }]}>AA Mods Team</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const pStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16 },
  headerEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  connBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  connDot: { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statItem: { flex: 1, alignItems: "center", padding: 14, borderRadius: 16, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  sectionTitle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitleText: { fontSize: 17, fontWeight: "800", fontFamily: "Inter_700Bold" },
  sectionAction: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  appList: { gap: 8 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  appRowName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appRowMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  linkList: { gap: 8 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  linkLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  linkSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  aboutCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  aboutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  aboutLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  aboutValue: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginHorizontal: 14 },
});
