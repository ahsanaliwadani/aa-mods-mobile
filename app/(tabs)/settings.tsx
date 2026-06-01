import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useCallback } from "react";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import {
  Alert,
  Modal,
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
import { haptics, refreshHapticsPreference } from "@/lib/haptics";
import { logScreenView, logSettingChanged, logCacheCleared, logExternalLinkOpened } from "@/lib/analytics";
import { useNotificationInbox } from "@/contexts/NotificationInboxContext";

const PREFS_KEY = "@aa_mods_prefs_v1";
const AA_MODS_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}AAMods/` : null;

type SortOption = "newest" | "alphabetical" | "downloads" | "rating";

type UserPrefs = {
  hapticsEnabled: boolean;
  showDownloadNotifications: boolean;
  notifyOnDownloadStart: boolean;
  notifyOnDownloadComplete: boolean;
  notifyOnNewApp: boolean;
  autoInstallAfterDownload: boolean;
  showInstalledBadges: boolean;
  showNewBadges: boolean;
  wifiOnlyDownloads: boolean;
  defaultSort: SortOption;
  showCategoryFilter: boolean;
};

const DEFAULT_PREFS: UserPrefs = {
  hapticsEnabled: true,
  showDownloadNotifications: true,
  notifyOnDownloadStart: true,
  notifyOnDownloadComplete: true,
  notifyOnNewApp: true,
  autoInstallAfterDownload: false,
  showInstalledBadges: true,
  showNewBadges: true,
  wifiOnlyDownloads: false,
  defaultSort: "newest",
  showCategoryFilter: true,
};

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return <Text style={[sStyles.sectionTitle, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>;
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
  disabled,
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
  disabled?: boolean;
}) {
  const colors = useColors();
  const ic = destructive ? "#ef4444" : iconColor ?? colors.accent;
  const isToggle = onToggle !== undefined && value !== undefined;

  return (
    <Pressable
      onPress={onPress ?? (isToggle ? () => { haptics.light(); onToggle(!value); } : undefined)}
      style={({ pressed }) => [
        sStyles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed && (onPress || isToggle) && !disabled ? 0.8 : disabled ? 0.5 : 1,
        },
      ]}
      disabled={(!onPress && !isToggle) || disabled}
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
          disabled={disabled}
        />
      ) : trailing ? (
        trailing
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

function ChipSelector<T extends string>({
  options,
  value,
  onChange,
  colors,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={sStyles.chipRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => { haptics.selection(); onChange(opt.value); }}
            style={[
              sStyles.chip,
              {
                backgroundColor: active ? colors.primary : colors.secondary,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[sStyles.chipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AppRow({ app, onPress, trailing }: { app: LiveStoreCatalogApp; onPress: () => void; trailing?: React.ReactNode }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sStyles.appRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
    >
      <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={44} borderRadius={11} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[sStyles.appName, { color: colors.foreground }]} numberOfLines={1}>{app.name}</Text>
        <Text style={[sStyles.appMeta, { color: colors.mutedForeground }]} numberOfLines={1}>{app.category} · v{app.version}</Text>
      </View>
      {trailing}
    </Pressable>
  );
}

type ClearItemKey = "apk_files" | "downloads" | "history" | "installed" | "favorites" | "recently_viewed" | "inbox" | "prefs";

const CLEAR_ITEMS: { key: ClearItemKey; label: string; sub: string; icon: string; iconColor: string }[] = [
  { key: "apk_files",       label: "APK Files",             sub: "Downloaded APK files on device",        icon: "document-outline",        iconColor: "#f59e0b" },
  { key: "downloads",       label: "Download Records",       sub: "Completed & failed download entries",   icon: "download-outline",         iconColor: "#00e673" },
  { key: "history",         label: "Download History",       sub: "History log of all downloads",          icon: "time-outline",             iconColor: "#22d3ee" },
  { key: "installed",       label: "Installed App Records",  sub: "Which apps you've installed",           icon: "phone-portrait-outline",   iconColor: "#8b5cf6" },
  { key: "favorites",       label: "Favorites",              sub: "Your saved favourite apps",             icon: "heart-outline",            iconColor: "#ef4444" },
  { key: "recently_viewed", label: "Recently Viewed",        sub: "Apps you've opened recently",           icon: "eye-outline",              iconColor: "#3b82f6" },
  { key: "inbox",           label: "Notification Inbox",     sub: "All notification messages",             icon: "mail-outline",             iconColor: "#fbbf24" },
  { key: "prefs",           label: "App Preferences",        sub: "Reset all settings to defaults",        icon: "settings-outline",         iconColor: "#6b7280" },
];

function ClearDataModal({
  visible,
  onClose,
  cacheBytes,
  onCleared,
  dm,
  clearFavorites,
  clearRecentlyViewed,
  clearInbox,
}: {
  visible: boolean;
  onClose: () => void;
  cacheBytes: number;
  onCleared: () => void;
  dm: ReturnType<typeof import("@/contexts/DownloadManagerContext").useDownloadManager>;
  clearFavorites: () => void;
  clearRecentlyViewed: () => void;
  clearInbox: () => void;
}) {
  const colors = useColors();
  const [selected, setSelected] = useState<Set<ClearItemKey>>(new Set());
  const [running, setRunning] = useState(false);

  const allSelected = selected.size === CLEAR_ITEMS.length;

  const toggle = (key: ClearItemKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(CLEAR_ITEMS.map((i) => i.key)));
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const labels = CLEAR_ITEMS.filter((i) => selected.has(i.key)).map((i) => `• ${i.label}`).join("\n");
    Alert.alert(
      "Confirm Delete",
      `The following data will be permanently deleted:\n\n${labels}\n\nThis cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setRunning(true);
            try {
              if (selected.has("apk_files") && AA_MODS_DIR) {
                try {
                  const files = await FileSystem.readDirectoryAsync(AA_MODS_DIR);
                  for (const f of files) {
                    if (f.toLowerCase().endsWith(".apk")) {
                      await FileSystem.deleteAsync(`${AA_MODS_DIR}${f}`, { idempotent: true }).catch(() => {});
                    }
                  }
                } catch {
                  await FileSystem.deleteAsync(AA_MODS_DIR, { idempotent: true }).catch(() => {});
                  await FileSystem.makeDirectoryAsync(AA_MODS_DIR, { intermediates: true }).catch(() => {});
                }
              }
              if (selected.has("downloads")) dm.clearAllCompleted();
              if (selected.has("history")) dm.clearHistory();
              if (selected.has("installed")) Object.keys(dm.installedApps).forEach((s) => dm.clearInstalledApp(s));
              if (selected.has("favorites")) clearFavorites();
              if (selected.has("recently_viewed")) clearRecentlyViewed();
              if (selected.has("inbox")) clearInbox();
              if (selected.has("prefs")) await AsyncStorage.removeItem("@aa_mods_prefs_v1").catch(() => {});
              onCleared();
              onClose();
              setSelected(new Set());
              Alert.alert("Done", "Selected data has been deleted.");
            } finally {
              setRunning(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={cdStyles.overlay} onPress={onClose}>
        <Pressable style={[cdStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={cdStyles.handle} />

          <View style={cdStyles.titleRow}>
            <Text style={[cdStyles.title, { color: colors.foreground }]}>Clear Data</Text>
            <Pressable
              onPress={toggleAll}
              style={[cdStyles.selectAllBtn, { borderColor: allSelected ? colors.primary : colors.border, backgroundColor: allSelected ? "rgba(0,230,115,0.1)" : colors.secondary }]}
            >
              <Text style={[cdStyles.selectAllText, { color: allSelected ? colors.primary : colors.mutedForeground }]}>
                {allSelected ? "Deselect All" : "Select All"}
              </Text>
            </Pressable>
          </View>

          <Text style={[cdStyles.subtitle, { color: colors.mutedForeground }]}>
            Select what you want to delete. This cannot be undone.
          </Text>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {CLEAR_ITEMS.map((item) => {
              const active = selected.has(item.key);
              const sub = item.key === "apk_files" && cacheBytes > 0
                ? `${(cacheBytes / 1024 / 1024).toFixed(1)} MB — ${item.sub}`
                : item.sub;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => toggle(item.key)}
                  style={[cdStyles.item, { borderColor: active ? item.iconColor + "55" : colors.border, backgroundColor: active ? item.iconColor + "0f" : colors.background }]}
                >
                  <View style={[cdStyles.itemIcon, { backgroundColor: item.iconColor + "18" }]}>
                    <Ionicons name={item.icon as "settings"} size={16} color={item.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[cdStyles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[cdStyles.itemSub, { color: colors.mutedForeground }]}>{sub}</Text>
                  </View>
                  <View style={[cdStyles.checkbox, { borderColor: active ? item.iconColor : colors.border, backgroundColor: active ? item.iconColor : "transparent" }]}>
                    {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={handleDelete}
            disabled={selected.size === 0 || running}
            style={({ pressed }) => [
              cdStyles.deleteBtn,
              {
                backgroundColor: selected.size === 0 ? colors.secondary : "rgba(239,68,68,0.12)",
                borderColor: selected.size === 0 ? colors.border : "rgba(239,68,68,0.35)",
                opacity: pressed || running ? 0.75 : 1,
              },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={selected.size === 0 ? colors.mutedForeground : "#ef4444"} />
            <Text style={[cdStyles.deleteBtnText, { color: selected.size === 0 ? colors.mutedForeground : "#ef4444" }]}>
              {running ? "Deleting…" : selected.size === 0 ? "Select items above" : `Delete ${selected.size} item${selected.size !== 1 ? "s" : ""}`}
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={[cdStyles.cancelBtn, { borderColor: colors.border }]}>
            <Text style={[cdStyles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10, gap: 12 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 20, fontWeight: "800", fontFamily: "Inter_700Bold" },
  selectAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  selectAllText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -4 },
  item: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  itemIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemLabel: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  itemSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, paddingVertical: 14 },
  deleteBtnText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  cancelBtn: { alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, paddingVertical: 13 },
  cancelText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

function openUrl(url: string) {
  if (!url) return;
  Linking.openURL(url.startsWith("http") ? url : `https://${url}`).catch(() => {});
}

function prettyUrl(url: string): string {
  try { return url.replace(/^https?:\/\//, "").replace(/\/$/, ""); } catch { return url; }
}

async function getDownloadDirSize(): Promise<{ sizeStr: string; bytes: number }> {
  try {
    if (Platform.OS === "web" || !AA_MODS_DIR) return { sizeStr: "—", bytes: 0 };
    const info = await FileSystem.getInfoAsync(AA_MODS_DIR);
    if (!info.exists) return { sizeStr: "0 KB", bytes: 0 };
    if ("size" in info && typeof info.size === "number") {
      const bytes = info.size;
      const mb = bytes / 1024 / 1024;
      return { sizeStr: mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`, bytes };
    }
    return { sizeStr: "—", bytes: 0 };
  } catch { return { sizeStr: "—", bytes: 0 }; }
}

const ALL_STORAGE_KEYS = [
  "@aa_mods_prefs_v1",
  "@aa_mods_seen_slugs_v1",
  "@aa_mods_favorites_v2",
  "@aa_mods_recently_viewed_v2",
  "@aa_mods_installed_apps_v1",
  "@aa_mods_downloads_v1",
  "@aa_mods_download_dir_v1",
  "@aa_mods_dismissed_update_version",
  "@aa_mods_notif_inbox_v1",
];

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { unreadCount: inboxUnread, clearAll: clearInbox } = useNotificationInbox();
  const { apps, categories, connected, lastUpdated } = useFirebaseCatalog();
  const { config } = useRemoteConfig();
  const { favorites, toggleFavorite, clearFavorites, recentSlugs, clearRecentlyViewed } = useUserData();
  const dm = useDownloadManager();

  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [cacheSize, setCacheSize] = useState("—");
  const [cacheBytes, setCacheBytes] = useState(0);
  const [clearingCache, setClearingCache] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [clearModalVisible, setClearModalVisible] = useState(false);

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

    getDownloadDirSize().then(({ sizeStr, bytes }) => { setCacheSize(sizeStr); setCacheBytes(bytes); });

    if (lastUpdated) {
      setLastChecked(lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }, []);

  useEffect(() => {
    if (lastUpdated) {
      setLastChecked(lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }
  }, [lastUpdated]);

  const savePrefs = useCallback((update: Partial<UserPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...update };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      // Log each changed setting
      for (const [key, value] of Object.entries(update)) {
        logSettingChanged(key, value as string | boolean);
      }
      return next;
    });
  }, []);

  const refreshCacheSize = useCallback(async () => {
    const { sizeStr, bytes } = await getDownloadDirSize();
    setCacheSize(sizeStr);
    setCacheBytes(bytes);
  }, []);

  const clearCache = useCallback(async () => {
    if (Platform.OS === "web") return;
    setClearingCache(true);
    try {
      if (AA_MODS_DIR) {
        const dirInfo = await FileSystem.getInfoAsync(AA_MODS_DIR);
        if (dirInfo.exists) {
          try {
            const files = await FileSystem.readDirectoryAsync(AA_MODS_DIR);
            for (const file of files) {
              if (file.toLowerCase().endsWith(".apk")) {
                await FileSystem.deleteAsync(`${AA_MODS_DIR}${file}`, { idempotent: true }).catch(() => {});
              }
            }
          } catch {
            await FileSystem.deleteAsync(AA_MODS_DIR, { idempotent: true }).catch(() => {});
            await FileSystem.makeDirectoryAsync(AA_MODS_DIR, { intermediates: true }).catch(() => {});
          }
        }
      }
      await refreshCacheSize();
      logCacheCleared(cacheBytes);
      haptics.medium();
      Alert.alert("Cache Cleared", "All APK files removed from device storage. Your download history is preserved.");
    } catch {
      Alert.alert("Error", "Could not clear cache. Please try again.");
    } finally {
      setClearingCache(false);
    }
  }, [refreshCacheSize]);

  const favoriteApps = favorites
    .map((slug) => apps.find((a) => a.slug === slug))
    .filter(Boolean) as LiveStoreCatalogApp[];

  const recentApps = recentSlugs
    .map((slug) => apps.find((a) => a.slug === slug))
    .filter(Boolean) as LiveStoreCatalogApp[];

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const totalCategories = categories.filter((c) => c !== "All").length;
  const installedCount = Object.keys(dm.installedApps).length;
  const activeCount = Array.from(dm.downloads.values()).filter((e) => e.phase === "downloading" || e.phase === "resolving").length;
  const completedCount = Array.from(dm.downloads.values()).filter((e) => e.phase === "done" || e.phase === "installed" || e.phase === "error").length;

  const [helplineBotUrl, setHelplineBotUrl] = useState<string | null>(null);

  useEffect(() => {
    get(ref(database, "app_content/aaHelplineBotUrl"))
      .then((snap) => {
        const val = snap.val();
        if (typeof val === "string" && val.trim().length > 0) setHelplineBotUrl(val.trim());
      })
      .catch(() => {});
  }, []);

  const [pickingDir, setPickingDir] = useState(false);

  const downloadDirLabel = (() => {
    if (!dm.downloadDirUri) return "Internal app storage (default)";
    try {
      const decoded = decodeURIComponent(dm.downloadDirUri);
      const parts = decoded.split("/").filter(Boolean);
      const name = parts[parts.length - 1] ?? "Custom folder";
      return name.replace(/:/g, "/");
    } catch {
      return "Custom folder selected";
    }
  })();

  const handlePickDownloadDir = async () => {
    if (Platform.OS !== "android") return;
    setPickingDir(true);
    haptics.medium();
    try {
      const uri = await dm.pickDownloadDir();
      if (uri) {
        Alert.alert("Folder Selected", "Future downloads will be saved to this folder using the 'Save to Folder' button in the Downloads screen.");
      }
    } finally {
      setPickingDir(false);
    }
  };

  const handleAppPress = (slug: string) => { haptics.light(); router.push(`/app/${slug}`); };

  return (
    <View style={[sStyles.container, { backgroundColor: colors.background }]}>
    <ScrollView
      style={{ flex: 1 }}
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
        <View style={[sStyles.liveDot, { backgroundColor: connected ? colors.primary : "#ef4444" }]} />
      </View>

      {/* Quick stats */}
      <View style={sStyles.statsRow}>
        {[
          { icon: "apps", label: "Apps", value: apps.length },
          { icon: "layers-outline", label: "Categories", value: totalCategories },
          { icon: "checkmark-circle-outline", label: "Installed", value: installedCount },
          { icon: "download-outline", label: "Active", value: activeCount },
        ].map(({ icon, label, value }) => (
          <View key={label} style={[sStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={icon as "apps"} size={16} color={colors.primary} />
            <Text style={[sStyles.statValue, { color: colors.foreground }]}>{value}</Text>
            <Text style={[sStyles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* FIREBASE STATUS */}
      <View style={sStyles.group}>
        <SectionTitle title="Live Connection" />
        <View style={[sStyles.liveCard, { backgroundColor: connected ? "rgba(0,230,115,0.05)" : "rgba(239,68,68,0.05)", borderColor: connected ? "rgba(0,230,115,0.25)" : "rgba(239,68,68,0.25)" }]}>
          <View style={sStyles.liveRow}>
            <View style={[sStyles.livePulse, { backgroundColor: connected ? colors.primary : "#ef4444" }]} />
            <Text style={[sStyles.liveStatus, { color: connected ? colors.primary : "#ef4444" }]}>
              {connected ? "Connected to Firebase" : "Offline — using cached data"}
            </Text>
          </View>
          {lastChecked && (
            <Text style={[sStyles.lastChecked, { color: colors.mutedForeground }]}>
              Last synced at {lastChecked} · {apps.length} apps loaded
            </Text>
          )}
        </View>
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
            onToggle={(v) => { savePrefs({ hapticsEnabled: v }); refreshHapticsPreference(); }}
          />
          <SettingRow
            icon="filter-outline"
            iconColor={colors.accent}
            label="Category Filter Bar"
            sub="Show category chips on home screen"
            value={prefs.showCategoryFilter}
            onToggle={(v) => savePrefs({ showCategoryFilter: v })}
          />
          <SettingRow
            icon="sparkles-outline"
            iconColor="#fbbf24"
            label="New App Badges"
            sub="Show NEW badge on recently added apps"
            value={prefs.showNewBadges}
            onToggle={(v) => savePrefs({ showNewBadges: v })}
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

      {/* SORT PREFERENCE */}
      <View style={sStyles.group}>
        <SectionTitle title="Default Sort Order" />
        <View style={[sStyles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[sStyles.chipSectionLabel, { color: colors.mutedForeground }]}>
            How apps are ordered on the home screen
          </Text>
          <ChipSelector<SortOption>
            options={[
              { label: "Newest", value: "newest" },
              { label: "A–Z", value: "alphabetical" },
              { label: "Downloads", value: "downloads" },
              { label: "Rating", value: "rating" },
            ]}
            value={prefs.defaultSort}
            onChange={(v) => savePrefs({ defaultSort: v })}
            colors={colors}
          />
        </View>
      </View>

      {/* DOWNLOADS */}
      <View style={sStyles.group}>
        <SectionTitle title="Downloads & Storage" />
        <View style={sStyles.rowGroup}>
          <SettingRow
            icon="wifi-outline"
            iconColor="#3b82f6"
            label="Wi-Fi Only Downloads"
            sub="Restrict downloads to Wi-Fi connections"
            value={prefs.wifiOnlyDownloads}
            onToggle={(v) => savePrefs({ wifiOnlyDownloads: v })}
          />
          {Platform.OS === "android" && (
            <SettingRow
              icon="folder-open-outline"
              iconColor="#f59e0b"
              label="Download Folder"
              sub={pickingDir ? "Picking folder…" : downloadDirLabel}
              onPress={pickingDir ? undefined : handlePickDownloadDir}
              disabled={pickingDir}
              trailing={
                dm.downloadDirUri ? (
                  <Pressable
                    onPress={() => { haptics.selection(); dm.setDownloadDir(null); }}
                    hitSlop={10}
                    style={[sStyles.resetDirBtn, { borderColor: colors.border }]}
                  >
                    <Text style={[sStyles.resetDirText, { color: colors.mutedForeground }]}>Reset</Text>
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                )
              }
            />
          )}
          <SettingRow
            icon="folder-outline"
            iconColor="#f59e0b"
            label="Download Storage"
            sub={clearingCache ? "Clearing…" : (cacheBytes > 0 ? `${cacheSize} used · Tap to clear` : cacheSize === "0 KB" ? "No downloads stored" : cacheSize)}
            onPress={cacheBytes > 0 ? clearCache : undefined}
            disabled={clearingCache}
            trailing={
              cacheBytes > 0
                ? <Text style={[sStyles.actionLink, { color: "#ef4444" }]}>Clear</Text>
                : <Text style={[sStyles.actionLink, { color: colors.mutedForeground }]}>{cacheSize}</Text>
            }
          />
          {completedCount > 0 && (
            <SettingRow
              icon="trash-outline"
              label="Clear Completed Downloads"
              sub={`${completedCount} completed/installed download${completedCount !== 1 ? "s" : ""}`}
              destructive
              onPress={() => {
                haptics.medium();
                Alert.alert(
                  "Clear All",
                  "This will remove all completed/installed download entries and their APK files. Your already-installed apps will remain on your phone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Clear All", style: "destructive", onPress: () => dm.clearAllCompleted() },
                  ],
                );
              }}
            />
          )}
        </View>
      </View>

      {/* NOTIFICATIONS */}
      <View style={sStyles.group}>
        <SectionTitle title="Notifications" />
        <View style={sStyles.rowGroup}>
          <SettingRow
            icon="mail-open-outline"
            iconColor="#22d3ee"
            label="Notification Inbox"
            sub={inboxUnread > 0 ? `${inboxUnread} unread message${inboxUnread !== 1 ? "s" : ""}` : "All caught up"}
            onPress={() => { haptics.selection(); router.push("/inbox"); }}
            trailing={
              inboxUnread > 0 ? (
                <View style={[sStyles.inboxBadge, { backgroundColor: "#22d3ee" }]}>
                  <Text style={sStyles.inboxBadgeText}>{inboxUnread > 99 ? "99+" : inboxUnread}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              )
            }
          />
          <SettingRow
            icon="notifications-outline"
            iconColor="#fbbf24"
            label="Download Notifications"
            sub="Master switch for all download alerts"
            value={prefs.showDownloadNotifications}
            onToggle={(v) => savePrefs({ showDownloadNotifications: v })}
          />
          <SettingRow
            icon="play-circle-outline"
            iconColor="#22d3ee"
            label="Download Started"
            sub="Alert when a download begins"
            value={prefs.notifyOnDownloadStart && prefs.showDownloadNotifications}
            onToggle={(v) => savePrefs({ notifyOnDownloadStart: v })}
            disabled={!prefs.showDownloadNotifications}
          />
          <SettingRow
            icon="checkmark-circle-outline"
            iconColor={colors.primary}
            label="Download Complete"
            sub="Alert when a download finishes"
            value={prefs.notifyOnDownloadComplete && prefs.showDownloadNotifications}
            onToggle={(v) => savePrefs({ notifyOnDownloadComplete: v })}
            disabled={!prefs.showDownloadNotifications}
          />
          <SettingRow
            icon="sparkles"
            iconColor="#fbbf24"
            label="New App Notifications"
            sub="Alert when new mods are added"
            value={prefs.notifyOnNewApp && prefs.showDownloadNotifications}
            onToggle={(v) => savePrefs({ notifyOnNewApp: v })}
            disabled={!prefs.showDownloadNotifications}
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
            <Text style={[sStyles.emptyText, { color: colors.mutedForeground }]}>Apps you open will appear here.</Text>
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
            <SettingRow icon="paper-plane" iconColor="#2AABEE" label="Telegram Channel" sub={prettyUrl(config.telegramUrl)} onPress={() => { logExternalLinkOpened("telegram"); openUrl(config.telegramUrl); }} />
          ) : (
            <SettingRow icon="paper-plane" iconColor="#2AABEE" label="Telegram Channel" sub="Updates & announcements" onPress={() => { logExternalLinkOpened("telegram"); openUrl("https://t.me/aamods"); }} />
          )}
          {config.websiteUrl ? (
            <SettingRow icon="globe-outline" label="AA Mods Website" sub={prettyUrl(config.websiteUrl)} onPress={() => { logExternalLinkOpened("website"); openUrl(config.websiteUrl); }} />
          ) : null}
          {config.discordUrl ? (
            <SettingRow icon="logo-discord" iconColor="#5865F2" label="Discord Server" sub={prettyUrl(config.discordUrl)} onPress={() => { logExternalLinkOpened("discord"); openUrl(config.discordUrl); }} />
          ) : null}
          {config.instagramUrl ? (
            <SettingRow icon="logo-instagram" iconColor="#E1306C" label="Instagram" sub={prettyUrl(config.instagramUrl)} onPress={() => { logExternalLinkOpened("instagram"); openUrl(config.instagramUrl); }} />
          ) : null}
          {config.supportEmail ? (
            <SettingRow icon="mail-outline" label="Contact Support" sub={config.supportEmail} onPress={() => { logExternalLinkOpened("support"); Linking.openURL(`mailto:${config.supportEmail}`).catch(() => {}); }} />
          ) : null}
          {helplineBotUrl ? (
            <SettingRow
              icon="chatbubble-ellipses-outline"
              iconColor="#2AABEE"
              label="AA Helpline Bot"
              sub={prettyUrl(helplineBotUrl)}
              onPress={() => { logExternalLinkOpened("helpline_bot"); openUrl(helplineBotUrl); }}
            />
          ) : null}
        </View>
      </View>

      {/* LEGAL */}
      <View style={sStyles.group}>
        <SectionTitle title="Legal & Info" />
        <View style={sStyles.rowGroup}>
          <SettingRow icon="information-circle-outline" label="About AA Mods" sub="Who we are & what we do" onPress={() => { haptics.selection(); router.push("/about"); }} />
          <SettingRow icon="lock-closed-outline" label="Privacy Policy" sub="How we handle your data" onPress={() => { haptics.selection(); router.push("/privacy"); }} />
          <SettingRow icon="document-text-outline" label="Terms of Service" sub="Rules for using AA Mods" onPress={() => { haptics.selection(); router.push("/terms"); }} />
          <SettingRow icon="warning-outline" iconColor="#fbbf24" label="Disclaimer" sub="Important notices & limitations" onPress={() => { haptics.selection(); router.push("/disclaimer"); }} />
        </View>
      </View>

      {/* ABOUT CARD */}
      <View style={sStyles.group}>
        <SectionTitle title="About" />
        <View style={[sStyles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={sStyles.aboutTop}>
            <Image source={require("@/assets/images/icon.png")} style={sStyles.aboutLogo} contentFit="cover" />
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
                <View style={[sStyles.badge, { backgroundColor: connected ? "rgba(0,230,115,0.1)" : "rgba(239,68,68,0.1)", borderColor: connected ? "rgba(0,230,115,0.3)" : "rgba(239,68,68,0.3)" }]}>
                  <View style={[sStyles.onlineDot, { backgroundColor: connected ? colors.primary : "#ef4444" }]} />
                  <Text style={[sStyles.badgeText, { color: connected ? colors.primary : "#ef4444" }]}>
                    {connected ? "Live" : "Offline"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[sStyles.divider, { backgroundColor: colors.border }]} />

          <View style={sStyles.infoRows}>
            {[
              { label: "Developer", value: "AA Mods Team" },
              { label: "Platform", value: "Expo React Native" },
              { label: "Total Apps", value: `${apps.length} MOD APKs` },
              { label: "Downloaded Storage", value: cacheSize },
              { label: "Installed Apps", value: `${installedCount} tracked` },
              { label: "Security", value: "Verified & Safe" },
            ].map(({ label, value }, i, arr) => (
              <View key={label}>
                <View style={sStyles.infoRow}>
                  <Text style={[sStyles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
                  <Text style={[sStyles.infoValue, { color: colors.foreground }]}>{value}</Text>
                </View>
                {i < arr.length - 1 ? <View style={[sStyles.divider, { backgroundColor: colors.border }]} /> : null}
              </View>
            ))}
          </View>

          <View style={[sStyles.divider, { backgroundColor: colors.border }]} />
          <Text style={[sStyles.aboutFooter, { color: colors.mutedForeground }]}>
            Made with care by the AA Mods Team · All mods are tested & verified
          </Text>
        </View>
      </View>

      {/* DATA MANAGEMENT */}
      <View style={sStyles.group}>
        <SectionTitle title="Data Management" />
        <View style={sStyles.rowGroup}>
          <SettingRow
            icon="trash-outline"
            iconColor="#ef4444"
            label="Clear Data"
            sub="Choose exactly what to delete — APKs, history, favourites & more"
            onPress={() => { haptics.medium(); setClearModalVisible(true); }}
            trailing={
              <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.08)" }}>
                <Text style={{ fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#ef4444" }}>Manage</Text>
              </View>
            }
          />
        </View>
      </View>
    </ScrollView>

    <ClearDataModal
      visible={clearModalVisible}
      onClose={() => setClearModalVisible(false)}
      cacheBytes={cacheBytes}
      onCleared={refreshCacheSize}
      dm={dm}
      clearFavorites={clearFavorites}
      clearRecentlyViewed={clearRecentlyViewed}
      clearInbox={clearInbox}
    />
    </View>
  );
}

const sStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 16 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  statCard: { flex: 1, alignItems: "center", padding: 10, borderRadius: 14, borderWidth: 1, gap: 3 },
  statValue: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  group: { marginTop: 22 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, fontFamily: "Inter_700Bold", marginBottom: 10 },
  action: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionLink: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  rowGroup: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  chipSectionLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  liveCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  livePulse: { width: 8, height: 8, borderRadius: 4 },
  liveStatus: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  lastChecked: { fontSize: 11, fontFamily: "Inter_400Regular" },
  appList: { gap: 8 },
  appRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  appName: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  aboutCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  aboutTop: { flexDirection: "row", gap: 14, padding: 16, alignItems: "flex-start" },
  aboutLogo: { width: 54, height: 54, borderRadius: 13 },
  aboutName: { fontSize: 16, fontWeight: "800", fontFamily: "Inter_700Bold" },
  aboutTag: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  badges: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  divider: { height: 1 },
  infoRows: { paddingHorizontal: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  aboutFooter: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", padding: 14, lineHeight: 17 },
  inboxBadge: { borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  inboxBadgeText: { color: "#04131b", fontSize: 10, fontWeight: "800", fontFamily: "Inter_700Bold" },
  resetDirBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  resetDirText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
