import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useCallback } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useFirebaseCatalog, type LiveStoreCatalogApp } from "@/hooks/useFirebaseCatalog";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { useUserData } from "@/contexts/UserDataContext";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import { AppIcon } from "@/components/AppIcon";
import { haptics } from "@/lib/haptics";
import { logScreenView } from "@/lib/analytics";

const PREFS_KEY = "@aa_mods_prefs_v1";

type UserPrefs = {
  hapticsEnabled: boolean;
  showDownloadNotifications: boolean;
  autoInstallAfterDownload: boolean;
  showInstalledBadges: boolean;
};

const DEFAULT_PREFS: UserPrefs = {
  hapticsEnabled: true,
  showDownloadNotifications: true,
  autoInstallAfterDownload: false,
  showInstalledBadges: true,
};

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[sStyles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
  );
}

function SettingRow({
  icon,
  iconColor,
  label,
  sub,
  value,
  onToggle,
  onPress,
  trailing,
  destructive,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  sub?: string;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  const colors = useColors();
  const ic = destructive ? "#ef4444" : iconColor ?? colors.accent;
  const isToggle = onToggle !== undefined && value !== undefined;

  return (
    <Pressable
      onPress={onPress ?? (isToggle ? () => { haptics.light(); onToggle(!value); } : undefined)}
      style={({ pressed }) => [
        sStyles.row,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed && onPress ? 0.8 : 1 },
      ]}
      disabled={!onPress && !isToggle}
    >
      <View style={[sStyles.iconWrap, { backgroundColor: `${ic}18` }]}>
        <Ionicons name={icon as "settings"} size={18} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sStyles.rowLabel, { color: destructive ? "#ef4444" : colors.foreground }]}>{label}</Text>
        {sub ? <Text style={[sStyles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
      </View>
      {isToggle ? (
        <Switch
          value={value}
          onValueChange={(v) => { haptics.light(); onToggle(v); }}
          trackColor={{ false: colors.border, true: "rgba(0,230,115,0.5)" }}
          thumbColor={value ? "#00e673" : colors.mutedForeground}
          ios_backgroundColor={colors.border}
        />
      ) : trailing ? trailing : (
        onPress ? <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} /> : null
      )}
    </Pressable>
  );
}

function AppRow({ app, onPress, trailing }: { app: LiveStoreCatalogApp; onPress: () => void; trailing?: React.ReactNode }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sStyles.appRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={44} borderRadius={11} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[sStyles.appName, { color: colors.foreground }]} numberOfLines={1}>{app.name}</Text>
        <Text style={[sStyles.appMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {app.category} · v{app.version}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

function openUrl(url: string) {
  if (!url) return;
  Linking.openURL(url.startsWith("http") ? url : `https://${url}`).catch(() => {});
}

function prettyUrl(url: string): string {
  try { return url.replace(/^https?:\/\//, "").replace(/\/$/, ""); } catch { return url; }
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { apps, categories } = useFirebaseCatalog();
  const { config } = useRemoteConfig();
  const { favorites, toggleFavorite, clearFavorites, recentSlugs, clearRecentlyViewed } = useUserData();
  const dm = useDownloadManager();

  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);

  useEffect(() => { logScreenView("settings"); }, []);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<UserPrefs>;
            setPrefs((prev) => ({ ...prev, ...parsed }));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const savePrefs = useCallback((update: Partial<UserPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...update };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const favoriteApps = favorites
    .map((slug) => apps.find((a) => a.slug === slug))
    .filter(Boolean) as LiveStoreCatalogApp[];

  const recentApps = recentSlugs
    .map((slug) => apps.find((a) => a.slug === slug))
    .filter(Boolean) as LiveStoreCatalogApp[];

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const totalCategories = categories.filter((c) => c !== "All").length;
  const installedCount = Object.keys(dm.installedApps).length;
  const downloadCount = Array.from(dm.downloads.values()).filter((e) => e.phase === "done").length;

  const handleAppPress = (slug: string) => { haptics.light(); router.push(`/app/${slug}`); };

  return (
    <ScrollView
      style={[sStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        sStyles.scrollContent,
        { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[sStyles.header, { paddingTop: topInset + 12 }]}>
        <View>
          <Text style={[sStyles.eyebrow, { color: colors.accent }]}>AA MODS</Text>
          <Text style={[sStyles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        </View>
      </View>

      {/* Quick stats */}
      <View style={sStyles.statsRow}>
        {[
          { icon: "apps", label: "Apps", value: apps.length },
          { icon: "layers-outline", label: "Categories", value: totalCategories },
          { icon: "checkmark-circle-outline", label: "Installed", value: installedCount },
        ].map(({ icon, label, value }) => (
          <View key={label} style={[sStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={icon as "apps"} size={18} color={colors.primary} />
            <Text style={[sStyles.statValue, { color: colors.foreground }]}>{value}</Text>
            <Text style={[sStyles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* PREFERENCES */}
      <View style={sStyles.group}>
        <SectionTitle title="Preferences" />
        <View style={sStyles.rowGroup}>
          <SettingRow
            icon="phone-portrait-outline"
            iconColor="#a78bfa"
            label="Haptic Feedback"
            sub="Vibration on interactions"
            value={prefs.hapticsEnabled}
            onToggle={(v) => savePrefs({ hapticsEnabled: v })}
          />
          <SettingRow
            icon="notifications-outline"
            iconColor="#fbbf24"
            label="Download Notifications"
            sub="Alert when downloads finish"
            value={prefs.showDownloadNotifications}
            onToggle={(v) => savePrefs({ showDownloadNotifications: v })}
          />
          <SettingRow
            icon="shield-checkmark-outline"
            iconColor={colors.primary}
            label="Installed App Badges"
            sub="Show installed status on app cards"
            value={prefs.showInstalledBadges}
            onToggle={(v) => savePrefs({ showInstalledBadges: v })}
          />
        </View>
      </View>

      {/* FAVORITES */}
      <View style={sStyles.group}>
        <View style={sStyles.titleRow}>
          <SectionTitle title="Favorites" />
          {favoriteApps.length > 0 && (
            <Pressable onPress={() => { haptics.medium(); clearFavorites(); }} hitSlop={10}>
              <Text style={[sStyles.action, { color: colors.accent }]}>Clear All</Text>
            </Pressable>
          )}
        </View>
        {favoriteApps.length === 0 ? (
          <View style={[sStyles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="heart-outline" size={28} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
            <Text style={[sStyles.emptyText, { color: colors.mutedForeground }]}>
              No favorites yet. Tap ♥ on any app to save it.
            </Text>
          </View>
        ) : (
          <View style={sStyles.appList}>
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

      {/* RECENTLY VIEWED */}
      <View style={sStyles.group}>
        <View style={sStyles.titleRow}>
          <SectionTitle title="Recently Viewed" />
          {recentApps.length > 0 && (
            <Pressable onPress={() => { haptics.medium(); clearRecentlyViewed(); }} hitSlop={10}>
              <Text style={[sStyles.action, { color: colors.accent }]}>Clear</Text>
            </Pressable>
          )}
        </View>
        {recentApps.length === 0 ? (
          <View style={[sStyles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={28} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
            <Text style={[sStyles.emptyText, { color: colors.mutedForeground }]}>
              Apps you open will appear here.
            </Text>
          </View>
        ) : (
          <View style={sStyles.appList}>
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

      {/* COMMUNITY */}
      <View style={sStyles.group}>
        <SectionTitle title="Community & Support" />
        <View style={sStyles.rowGroup}>
          {config.telegramUrl ? (
            <SettingRow
              icon="paper-plane"
              iconColor="#2AABEE"
              label="Telegram Channel"
              sub={prettyUrl(config.telegramUrl)}
              onPress={() => openUrl(config.telegramUrl)}
            />
          ) : null}
          {config.websiteUrl ? (
            <SettingRow
              icon="globe-outline"
              label="AA Mods Website"
              sub={prettyUrl(config.websiteUrl)}
              onPress={() => openUrl(config.websiteUrl)}
            />
          ) : null}
          {config.discordUrl ? (
            <SettingRow
              icon="logo-discord"
              iconColor="#5865F2"
              label="Discord Server"
              sub={prettyUrl(config.discordUrl)}
              onPress={() => openUrl(config.discordUrl)}
            />
          ) : null}
          {config.instagramUrl ? (
            <SettingRow
              icon="logo-instagram"
              iconColor="#E1306C"
              label="Instagram"
              sub={prettyUrl(config.instagramUrl)}
              onPress={() => openUrl(config.instagramUrl)}
            />
          ) : null}
          {config.supportEmail ? (
            <SettingRow
              icon="mail-outline"
              label="Contact Support"
              sub={config.supportEmail}
              onPress={() => Linking.openURL(`mailto:${config.supportEmail}`).catch(() => {})}
            />
          ) : null}
          {!config.telegramUrl && !config.websiteUrl && !config.discordUrl && !config.instagramUrl && !config.supportEmail && (
            <SettingRow
              icon="paper-plane"
              iconColor="#2AABEE"
              label="Telegram Channel"
              sub="Updates & announcements"
              onPress={() => openUrl("https://t.me/aamods")}
            />
          )}
        </View>
      </View>

      {/* LEGAL */}
      <View style={sStyles.group}>
        <SectionTitle title="Legal & Info" />
        <View style={sStyles.rowGroup}>
          <SettingRow
            icon="information-circle-outline"
            label="About AA Mods"
            sub="Who we are & what we do"
            onPress={() => { haptics.selection(); router.push("/about"); }}
          />
          <SettingRow
            icon="lock-closed-outline"
            label="Privacy Policy"
            sub="How we handle your data"
            onPress={() => { haptics.selection(); router.push("/privacy"); }}
          />
          <SettingRow
            icon="document-text-outline"
            label="Terms of Service"
            sub="Rules for using AA Mods"
            onPress={() => { haptics.selection(); router.push("/terms"); }}
          />
          <SettingRow
            icon="warning-outline"
            iconColor="#fbbf24"
            label="Disclaimer"
            sub="Important notices & limitations"
            onPress={() => { haptics.selection(); router.push("/disclaimer"); }}
          />
        </View>
      </View>

      {/* ABOUT CARD */}
      <View style={sStyles.group}>
        <SectionTitle title="About" />
        <View style={[sStyles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={sStyles.aboutTop}>
            <Image
              source={{ uri: "https://aa-mods.replit.app/logo.png" }}
              style={sStyles.aboutLogo}
              contentFit="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={[sStyles.aboutName, { color: colors.foreground }]}>AA Mods Store</Text>
              <Text style={[sStyles.aboutTag, { color: colors.mutedForeground }]}>Safe & stable MOD APK platform</Text>
              <View style={sStyles.badges}>
                <View style={[sStyles.badge, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.3)" }]}>
                  <Text style={[sStyles.badgeText, { color: "#00e673" }]}>v{appVersion}</Text>
                </View>
                <View style={[sStyles.badge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Ionicons name="phone-portrait-outline" size={9} color={colors.mutedForeground} />
                  <Text style={[sStyles.badgeText, { color: colors.mutedForeground }]}>
                    {Platform.OS === "android" ? "Android" : Platform.OS === "ios" ? "iOS" : "Web"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[sStyles.divider, { backgroundColor: colors.border }]} />

          <View style={sStyles.infoRows}>
            {[
              { label: "Developer", value: "AA Mods Team" },
              { label: "Total Apps", value: `${apps.length} MOD APKs` },
              { label: "Categories", value: `${totalCategories} categories` },
              { label: "License", value: "Free — always" },
            ].map(({ label, value }, i, arr) => (
              <View key={label}>
                <View style={sStyles.infoRow}>
                  <Text style={[sStyles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[sStyles.infoValue, { color: colors.foreground }]}>{value}</Text>
                </View>
                {i < arr.length - 1 && <View style={[sStyles.divider, { backgroundColor: colors.border }]} />}
              </View>
            ))}
          </View>

          <View style={[sStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[sStyles.aboutFooter, { color: colors.mutedForeground }]}>
            Made with care by the AA Mods Team · All mods are tested & verified
          </Text>
        </View>
      </View>

      {/* DANGER ZONE */}
      {installedCount > 0 && (
        <View style={sStyles.group}>
          <SectionTitle title="Data" />
          <View style={sStyles.rowGroup}>
            <SettingRow
              icon="trash-outline"
              label="Clear Installed Records"
              sub={`Remove ${installedCount} installed app record${installedCount !== 1 ? "s" : ""}`}
              destructive
              onPress={() => {
                haptics.medium();
                Object.keys(dm.installedApps).forEach((slug) => dm.clearInstalledApp(slug));
              }}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const sStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  statCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  group: { marginTop: 24 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, fontFamily: "Inter_700Bold", marginBottom: 10 },
  action: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rowGroup: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  appList: { gap: 8 },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  appName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  aboutCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  aboutTop: { flexDirection: "row", gap: 14, padding: 16, alignItems: "flex-start" },
  aboutLogo: { width: 56, height: 56, borderRadius: 14 },
  aboutName: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  aboutTag: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  badges: { flexDirection: "row", gap: 6, marginTop: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  divider: { height: 1 },
  infoRows: { paddingHorizontal: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  aboutFooter: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", padding: 14, lineHeight: 17 },
});
