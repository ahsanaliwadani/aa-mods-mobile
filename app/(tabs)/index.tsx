import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { FooterDisclaimer } from "@/components/FooterDisclaimer";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppIcon } from "@/components/AppIcon";
import { SkeletonAppCard } from "@/components/SkeletonCard";
import { haptics } from "@/lib/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useFirebaseCatalog, type LiveStoreCatalogApp, type OfflineReason } from "@/hooks/useFirebaseCatalog";
import { useInstalledAppUpdates } from "@/hooks/useInstalledAppUpdates";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { useUserData } from "@/contexts/UserDataContext";
import { useDownloadManager } from "@/contexts/DownloadManagerContext";
import { useNotificationInbox } from "@/contexts/NotificationInboxContext";

import {
  logScreenView,
  logAppCardPress,
  logCategoryFilter,
  logSortChanged,
  logFeaturedCardPress,
  logFavoriteToggle,
  logShareApp,
} from "@/lib/analytics";

type SortKey = "newest" | "az" | "rating" | "downloads";

const SCREEN_WIDTH = Dimensions.get("window").width;

function getCategoryIcon(category: string, color: string, size = 14) {
  switch (category) {
    case "Communication": return <Ionicons name="chatbubbles" size={size} color={color} />;
    case "AI Tools": return <MaterialCommunityIcons name="robot-outline" size={size} color={color} />;
    case "Social Media": return <Ionicons name="people" size={size} color={color} />;
    case "Streaming": return <Ionicons name="play-circle" size={size} color={color} />;
    case "Productivity": return <Ionicons name="briefcase" size={size} color={color} />;
    case "Utility Tools": return <Feather name="tool" size={size} color={color} />;
    case "Music & Audio": return <Ionicons name="musical-notes" size={size} color={color} />;
    case "Photography": return <Ionicons name="camera" size={size} color={color} />;
    case "Business": return <Ionicons name="business" size={size} color={color} />;
    case "Video":
    case "Video Players & Editors": return <Ionicons name="videocam" size={size} color={color} />;
    default: return <Ionicons name="grid" size={size} color={color} />;
  }
}

function FeaturedCard({ app, onPress }: { app: LiveStoreCatalogApp; onPress: () => void }) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: Platform.OS !== "web", speed: 50 }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 50 }).start()
        }
        style={[featStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={64} borderRadius={16} />
        <View style={{ gap: 2, marginTop: 8, width: "100%" }}>
          <Text style={[featStyles.name, { color: colors.foreground }]} numberOfLines={1}>
            {app.name}
          </Text>
          <Text style={[featStyles.cat, { color: colors.accent }]} numberOfLines={1}>
            {app.category}
          </Text>
        </View>
        <View style={[featStyles.vBadge, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.25)" }]}>
          <Ionicons name="checkmark-circle" size={10} color="#00e673" />
          <Text style={[featStyles.vText, { color: "#00e673" }]}>v{app.version}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const featStyles = StyleSheet.create({
  card: { width: 120, borderRadius: 18, borderWidth: 1, padding: 14, alignItems: "center" },
  name: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  cat: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  vBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, marginTop: 6 },
  vText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
});

function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== "web" }),
      ]),
    ).start();
  }, [pulse]);
  return <Animated.View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#00e673", opacity: pulse }} />;
}

function InstalledUpdatesBanner({ apps, onPress }: { apps: LiveStoreCatalogApp[]; onPress: () => void }) {
  const colors = useColors();
  if (apps.length === 0) return null;
  const names = apps.map((a) => a.name);
  const label =
    apps.length === 1
      ? `${names[0]} has a new version available`
      : `${names.slice(0, 2).join(", ")}${apps.length > 2 ? ` +${apps.length - 2} more` : ""} need updates`;
  return (
    <Pressable
      onPress={() => { haptics.light(); onPress(); }}
      style={({ pressed }) => [
        iubStyles.banner,
        { backgroundColor: "rgba(251,191,36,0.07)", borderColor: "rgba(251,191,36,0.4)", opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={iubStyles.left}>
        <View style={iubStyles.iconWrap}>
          <Ionicons name="arrow-up-circle" size={20} color="#fbbf24" />
          {apps.length > 1 && (
            <View style={iubStyles.countBubble}>
              <Text style={iubStyles.countText}>{apps.length}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[iubStyles.title, { color: colors.foreground }]}>
            {apps.length === 1 ? "Update Available" : `${apps.length} Updates Available`}
          </Text>
          <Text style={[iubStyles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
        </View>
      </View>
      <View style={[iubStyles.action, { backgroundColor: "#fbbf24" }]}>
        <Text style={iubStyles.actionText}>Update All</Text>
      </View>
    </Pressable>
  );
}

const iubStyles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 10, borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { position: "relative" },
  countBubble: { position: "absolute", top: -5, right: -6, backgroundColor: "#fbbf24", borderRadius: 8, minWidth: 14, height: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  countText: { color: "#04131b", fontSize: 8, fontWeight: "800", fontFamily: "Inter_700Bold" },
  title: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  action: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  actionText: { color: "#04131b", fontSize: 12, fontWeight: "800", fontFamily: "Inter_700Bold" },
});

function QuickActionSheet({ app, visible, onClose, isFav, onToggleFav, onShare, onOpen }: {
  app: LiveStoreCatalogApp | null;
  visible: boolean;
  onClose: () => void;
  isFav: boolean;
  onToggleFav: () => void;
  onShare: () => void;
  onOpen: () => void;
}) {
  const colors = useColors();
  if (!app) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={qaStyles.overlay} onPress={onClose}>
        <Pressable style={[qaStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[qaStyles.handle, { backgroundColor: colors.border }]} />
          <View style={qaStyles.appInfo}>
            <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={44} borderRadius={11} />
            <View style={{ flex: 1 }}>
              <Text style={[qaStyles.appName, { color: colors.foreground }]} numberOfLines={1}>{app.name}</Text>
              <Text style={[qaStyles.appMeta, { color: colors.mutedForeground }]}>{app.category} · v{app.version}</Text>
            </View>
          </View>
          <View style={qaStyles.actions}>
            <Pressable onPress={() => { onToggleFav(); onClose(); }} style={({ pressed }) => [qaStyles.action, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color={isFav ? "#ef4444" : colors.foreground} />
              <Text style={[qaStyles.actionLabel, { color: colors.foreground }]}>{isFav ? "Unfavorite" : "Favorite"}</Text>
            </Pressable>
            <Pressable onPress={() => { onShare(); onClose(); }} style={({ pressed }) => [qaStyles.action, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name="share-social-outline" size={22} color={colors.foreground} />
              <Text style={[qaStyles.actionLabel, { color: colors.foreground }]}>Share</Text>
            </Pressable>
            <Pressable onPress={() => { onOpen(); onClose(); }} style={({ pressed }) => [qaStyles.action, { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name="open-outline" size={22} color={colors.foreground} />
              <Text style={[qaStyles.actionLabel, { color: colors.foreground }]}>Open</Text>
            </Pressable>
          </View>
          <Pressable onPress={onClose} style={[qaStyles.cancelBtn, { borderColor: colors.border }]}>
            <Text style={[qaStyles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const qaStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, gap: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  appInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  appName: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, alignItems: "center", gap: 8, padding: 16, borderRadius: 16, borderWidth: 1 },
  actionLabel: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cancelBtn: { alignItems: "center", borderRadius: 14, borderWidth: 1, paddingVertical: 13 },
  cancelText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});

const AppCard = React.memo(function AppCard({
  app, onPress, onLongPress, isInstalled, hasUpdate,
}: {
  app: LiveStoreCatalogApp;
  onPress: () => void;
  onLongPress: () => void;
  isInstalled?: boolean;
  hasUpdate?: boolean;
}) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: Platform.OS !== "web", speed: 50 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: Platform.OS !== "web", speed: 50 }).start();

  const borderColor = hasUpdate
    ? "rgba(251,191,36,0.4)"
    : isInstalled
    ? "rgba(0,230,115,0.3)"
    : colors.border;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        testID={`app-card-${app.slug}`}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        delayLongPress={400}
        style={[styles.appCard, { backgroundColor: colors.card, borderColor }]}
      >
        <View style={styles.appCardHeader}>
          <View style={styles.appIconWrapper}>
            <AppIcon uri={app.iconImage} slug={app.slug} overrideUri={app.iconOverrideUri} size={56} borderRadius={14} />
            {isInstalled && !hasUpdate && (
              <View style={[styles.verifiedDot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
            )}
            {hasUpdate && (
              <View style={[styles.verifiedDot, { backgroundColor: "#fbbf24", borderColor: colors.background }]} />
            )}
            {!isInstalled && !hasUpdate && (
              <View style={[styles.verifiedDot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
            )}
          </View>
          <View style={styles.appCardMeta}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={[styles.appCategory, { color: colors.accent }]} numberOfLines={1}>
                {app.category.toUpperCase()}
              </Text>
              {app.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
              {hasUpdate && (
                <View style={[styles.newBadge, { backgroundColor: "rgba(251,191,36,0.18)", borderColor: "rgba(251,191,36,0.45)" }]}>
                  <Ionicons name="arrow-up-circle" size={9} color="#fbbf24" />
                  <Text style={[styles.newBadgeText, { color: "#fbbf24" }]}>UPDATE</Text>
                </View>
              )}
              {isInstalled && !hasUpdate && (
                <View style={[styles.newBadge, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.35)" }]}>
                  <Ionicons name="checkmark-circle" size={9} color="#00e673" />
                  <Text style={[styles.newBadgeText, { color: "#00e673" }]}>INSTALLED</Text>
                </View>
              )}
            </View>
            <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={1}>{app.name}</Text>
            <Text style={[styles.appDeveloper, { color: colors.mutedForeground }]} numberOfLines={1}>{app.developer}</Text>
          </View>
          <View style={[styles.ratingBadge, { backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.25)" }]}>
            <Ionicons name="star" size={10} color="#fbbf24" />
            <Text style={[styles.ratingText, { color: "#fbbf24" }]}>{app.rating}</Text>
          </View>
        </View>
        <Text style={[styles.appDescription, { color: colors.mutedForeground }]} numberOfLines={2}>
          {app.shortDescription}
        </Text>
        <View style={[styles.appCardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.footerStat}>
            <Ionicons name="download-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.footerStatText, { color: colors.mutedForeground }]}>{app.downloads}</Text>
          </View>
          <View style={styles.footerStat}>
            <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.footerStatText, { color: colors.mutedForeground }]}>{app.updateDate.display || app.updateDate.iso}</Text>
          </View>
          {hasUpdate ? (
            <View style={[styles.versionBadge, { backgroundColor: "rgba(251,191,36,0.12)", borderColor: "rgba(251,191,36,0.35)" }]}>
              <Ionicons name="arrow-up-circle" size={11} color="#fbbf24" />
              <Text style={[styles.versionText, { color: "#fbbf24" }]}>v{app.version}</Text>
            </View>
          ) : (
            <View style={[styles.versionBadge, { backgroundColor: "rgba(0,230,115,0.1)", borderColor: "rgba(0,230,115,0.25)" }]}>
              <Ionicons name="checkmark-circle" size={11} color="#00e673" />
              <Text style={[styles.versionText, { color: "#00e673" }]}>v{app.version}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

function LoadingSpinner({ size = 48, color = "#00e673" }: { size?: number; color?: string }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    ).start();
  }, [spinAnim]);
  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={{ transform: [{ rotate }], width: size, height: size }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: "transparent",
        borderTopColor: color, borderRightColor: color + "44",
      }} />
    </Animated.View>
  );
}

function LoadingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(val, { toValue: 0.3, duration: 300, useNativeDriver: Platform.OS !== "web" }),
          Animated.delay(600 - delay),
        ]),
      );
    Animated.parallel([anim(dot1, 0), anim(dot2, 200), anim(dot3, 400)]).start();
  }, [dot1, dot2, dot3]);
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {[dot1, dot2, dot3].map((d, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color, opacity: d }} />
      ))}
    </View>
  );
}

function LoadingScreen({ topInset: _topInset, colors }: { topInset: number; colors: ReturnType<typeof useColors> }) {
  const logoScale = useRef(new Animated.Value(0.55)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const barProgress = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    const useND = Platform.OS !== "web";

    // Logo entrance — spring pop + fade in
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 52, friction: 7, useNativeDriver: useND }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 520, useNativeDriver: useND }),
    ]).start();

    // Text fades in slightly after logo
    Animated.sequence([
      Animated.delay(320),
      Animated.timing(textOpacity, { toValue: 1, duration: 480, useNativeDriver: useND }),
    ]).start();

    // Glow ring pulses forever
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1400, useNativeDriver: useND }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1400, useNativeDriver: useND }),
      ]),
    ).start();

    // Fake progress bar — quick to 40%, slow crawl to 88%
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(barProgress, { toValue: 0.4, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(barProgress, { toValue: 0.7, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(barProgress, { toValue: 0.88, duration: 3500, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();

    // Shimmer sweeping across progress bar
    Animated.loop(
      Animated.timing(shimmerX, { toValue: 400, duration: 1100, easing: Easing.linear, useNativeDriver: useND }),
    ).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>

      {/* Background radial glow behind logo */}
      <Animated.View
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: 160,
          backgroundColor: colors.primary,
          opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.08] }),
        }}
      />

      {/* Logo with entrance + glow rings */}
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Outer ring — breathes outward */}
        <Animated.View
          style={{
            position: "absolute",
            width: 130,
            height: 130,
            borderRadius: 65,
            borderWidth: 1.5,
            borderColor: colors.primary,
            opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.55] }),
            transform: [
              { scale: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.28] }) },
            ],
          }}
        />
        {/* Inner glow fill */}
        <Animated.View
          style={{
            position: "absolute",
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: colors.primary,
            opacity: glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.15] }),
          }}
        />
        {/* App icon */}
        <Image
          source={require("@/assets/images/icon.png")}
          style={{ width: 100, height: 100, borderRadius: 26 }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </Animated.View>

      {/* App name + tagline */}
      <Animated.View style={{ opacity: textOpacity, alignItems: "center", marginTop: 32, gap: 8 }}>
        <Text style={{
          fontSize: 34,
          fontWeight: "800",
          color: colors.foreground,
          fontFamily: "Inter_700Bold",
          letterSpacing: -0.8,
        }}>
          AA Mods
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 20, height: 1.5, borderRadius: 1, backgroundColor: colors.primary, opacity: 0.6 }} />
          <Text style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 2.5,
            color: colors.accent,
            fontFamily: "Inter_700Bold",
          }}>
            VERIFIED MODS STORE
          </Text>
          <View style={{ width: 20, height: 1.5, borderRadius: 1, backgroundColor: colors.primary, opacity: 0.6 }} />
        </View>
      </Animated.View>

      {/* Dots + status text pinned near bottom */}
      <Animated.View
        style={{
          position: "absolute",
          bottom: 52,
          opacity: textOpacity,
          alignItems: "center",
          gap: 12,
        }}
      >
        <LoadingDots color={colors.primary} />
        <Text style={{
          fontSize: 12,
          color: colors.mutedForeground,
          fontFamily: "Inter_400Regular",
          letterSpacing: 0.2,
        }}>
          Fetching latest mods…
        </Text>
      </Animated.View>

      {/* Progress bar pinned to bottom edge */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: "rgba(0,230,115,0.1)",
        }}
      >
        <Animated.View
          style={{
            height: "100%",
            backgroundColor: colors.primary,
            borderRadius: 2,
            width: barProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 90,
              backgroundColor: "rgba(255,255,255,0.35)",
              transform: [{ translateX: shimmerX }],
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

function OfflineScreen({
  topInset, colors, reason, onRetry,
}: {
  topInset: number;
  colors: ReturnType<typeof useColors>;
  reason: OfflineReason;
  onRetry: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 8, useNativeDriver: Platform.OS !== "web" }).start();
  }, [scaleAnim]);

  const isAirplane = reason === "airplane";
  const isNoData = reason === "no-data";

  const icon = isAirplane ? "airplane" : isNoData ? "cellular-outline" : "wifi-outline";
  const iconColor = isAirplane ? "#f59e0b" : isNoData ? "#3b82f6" : "#ef4444";
  const iconBg = isAirplane ? "rgba(245,158,11,0.08)" : isNoData ? "rgba(59,130,246,0.08)" : "rgba(239,68,68,0.08)";
  const iconBorder = isAirplane ? "rgba(245,158,11,0.2)" : isNoData ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)";

  const title = isAirplane
    ? "Airplane Mode is On"
    : isNoData
    ? "Mobile Data is Off"
    : "No Internet Connection";

  const subtitle = isAirplane
    ? "Turn off Airplane Mode to connect to the internet and load apps."
    : isNoData
    ? "Turn on your mobile data or connect to Wi-Fi to load apps."
    : "Could not load apps. Please check your internet connection and try again.";

  const actionLabel = isAirplane
    ? "Turn Off Airplane Mode"
    : isNoData
    ? "Turn On Mobile Data"
    : null;

  const handleAction = () => {
    haptics.medium();
    if (Platform.OS === "android") {
      if (isAirplane || isNoData) {
        Linking.openSettings();
      }
    } else if (Platform.OS === "ios") {
      Linking.openURL("App-Prefs:root=AIRPLANE_MODE");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image source={require("@/assets/images/icon.png")} style={{ width: 36, height: 36, borderRadius: 10 }} contentFit="cover" cachePolicy="memory-disk" />
            <View>
              <Text style={[styles.headerEyebrow, { color: colors.accent }]}>VERIFIED MODS</Text>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>AA Mods Store</Text>
            </View>
          </View>
        </View>
      </View>
      <Animated.View style={[offlineStyles.container, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[offlineStyles.iconWrap, { backgroundColor: iconBg, borderColor: iconBorder }]}>
          <Ionicons name={icon as "wifi-outline"} size={48} color={iconColor} style={{ opacity: 0.85 }} />
        </View>
        <Text style={[offlineStyles.title, { color: colors.foreground }]}>{title}</Text>
        <Text style={[offlineStyles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        {actionLabel && (
          <Pressable
            onPress={handleAction}
            style={({ pressed }) => [offlineStyles.actionBtn, { backgroundColor: iconColor + "18", borderColor: iconColor + "44", opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name={isAirplane ? "airplane-outline" : "wifi-outline"} size={16} color={iconColor} />
            <Text style={[offlineStyles.actionBtnText, { color: iconColor }]}>{actionLabel}</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [offlineStyles.retryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="refresh" size={16} color={colors.primaryForeground} />
          <Text style={[offlineStyles.retryBtnText, { color: colors.primaryForeground }]}>Try Again</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "newest", label: "Newest", icon: "time-outline" },
  { key: "az", label: "A–Z", icon: "text-outline" },
  { key: "rating", label: "Rating", icon: "star-outline" },
  { key: "downloads", label: "Popular", icon: "download-outline" },
];

function parseDownloads(s: string): number {
  try {
    const cleaned = s.replace(/,/g, "").toUpperCase();
    if (cleaned.includes("M")) return parseFloat(cleaned) * 1_000_000;
    if (cleaned.includes("K")) return parseFloat(cleaned) * 1_000;
    return parseFloat(cleaned) || 0;
  } catch { return 0; }
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [quickActionApp, setQuickActionApp] = useState<LiveStoreCatalogApp | null>(null);

  const { apps, categories, loading, connected, offlineReason, lastUpdated, refetch } = useFirebaseCatalog();
  const { addItem: addInboxItem, unreadCount: inboxUnread } = useNotificationInbox();
  const { appsWithUpdates } = useInstalledAppUpdates(apps, addInboxItem);
  const { config } = useRemoteConfig();
  const { isFavorite, toggleFavorite } = useUserData();
  const dm = useDownloadManager();

  useEffect(() => {
    logScreenView("home");
  }, []);

  const filteredApps = useMemo(() => {
    let list = activeCategory === "All" ? apps : apps.filter((app) => app.category === activeCategory);
    switch (sortKey) {
      case "az": return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case "rating": return [...list].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      case "downloads": return [...list].sort((a, b) => parseDownloads(b.downloads) - parseDownloads(a.downloads));
      default: return list;
    }
  }, [activeCategory, apps, sortKey]);

  const featuredApps = useMemo(() => apps.filter((a) => a.isNew).slice(0, 10), [apps]);

  const handleAppPress = useCallback((app: LiveStoreCatalogApp) => {
    haptics.light();
    logAppCardPress(app.slug, app.name);
    router.push(`/app/${app.slug}`);
  }, [router]);

  const handleAppLongPress = useCallback((app: LiveStoreCatalogApp) => {
    haptics.medium();
    setQuickActionApp(app);
  }, []);

  const handleFeaturedPress = useCallback((app: LiveStoreCatalogApp) => {
    haptics.light();
    logFeaturedCardPress(app.slug, app.name);
    router.push(`/app/${app.slug}`);
  }, [router]);

  const handleCategoryPress = (cat: string) => {
    haptics.selection();
    setActiveCategory(cat);
    logCategoryFilter(cat);
  };

  const handleSortCycle = () => {
    haptics.selection();
    const idx = SORT_OPTIONS.findIndex((s) => s.key === sortKey);
    const nextSort = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
    setSortKey(nextSort.key);
    logSortChanged(nextSort.key);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const handleQuickShare = async (app: LiveStoreCatalogApp) => {
    try {
      haptics.light();
      logShareApp(app.slug, app.name);
      const appLink = `https://aa-mods.vercel.app/app/${app.slug}`;
      const stars = "⭐".repeat(Math.round(parseFloat(app.rating)));
      const message = [
        `📱 ${app.name}`,
        `${stars} ${app.rating} · ${app.category}`,
        ``,
        `${app.shortDescription || "Check out this MOD APK on AA Mods Store!"}`,
        ``,
        `🔖 Version: v${app.version}  |  📥 ${app.downloads}+ downloads`,
        ``,
        `⬇️ Download free on AA Mods Store:`,
        appLink,
        ``,
        `🛡️ 100% safe · verified · no ads`,
      ].join("\n");
      await Share.share({
        title: `${app.name} — Free MOD APK`,
        message,
        url: appLink,
      });
    } catch {}
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const currentSort = SORT_OPTIONS.find((s) => s.key === sortKey)!;
  const qaIsFav = quickActionApp ? isFavorite(quickActionApp.slug) : false;

  if (loading && apps.length === 0) {
    return (
      <LoadingScreen topInset={topInset} colors={colors} />
    );
  }

  if (!loading && !connected && apps.length === 0) {
    return (
      <OfflineScreen
        topInset={topInset}
        colors={colors}
        reason={offlineReason}
        onRetry={() => { haptics.medium(); refetch(); }}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 36, height: 36, borderRadius: 10 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View>
              <Text style={[styles.headerEyebrow, { color: colors.accent }]}>VERIFIED MODS</Text>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>AA Mods Store</Text>
              {lastUpdatedStr ? (
                <Text style={[styles.updatedAt, { color: colors.mutedForeground }]}>Synced {lastUpdatedStr}</Text>
              ) : null}
            </View>
          </View>
          <Pressable
            onPress={() => { haptics.light(); router.push("/inbox"); }}
            hitSlop={12}
            style={({ pressed }) => [styles.bellBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons
              name={inboxUnread > 0 ? "notifications" : "notifications-outline"}
              size={26}
              color={inboxUnread > 0 ? "#22d3ee" : colors.mutedForeground}
            />
            {inboxUnread > 0 && (
              <View style={[styles.bellBadge, { backgroundColor: "#22d3ee" }]}>
                <Text style={styles.bellBadgeText}>{inboxUnread > 99 ? "99+" : inboxUnread}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
          style={styles.categoriesScroll}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const count = cat === "All" ? apps.length : apps.filter((a) => a.category === cat).length;
            return (
              <Pressable
                key={cat}
                testID={`category-${cat}`}
                onPress={() => handleCategoryPress(cat)}
                style={[styles.categoryChip, { backgroundColor: isActive ? colors.primary : colors.secondary, borderColor: isActive ? colors.primary : colors.border }]}
              >
                {cat !== "All" && getCategoryIcon(cat, isActive ? colors.primaryForeground : colors.mutedForeground)}
                <Text style={[styles.categoryChipText, { color: isActive ? colors.primaryForeground : colors.mutedForeground }]}>{cat}</Text>
                <View style={[styles.categoryCount, { backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)" }]}>
                  <Text style={[styles.categoryCountText, { color: isActive ? colors.primaryForeground : colors.mutedForeground }]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredApps}
        keyExtractor={(item) => item.slug}
        renderItem={({ item }) => {
          const installed = dm.isInstalled(item.slug);
          const update = dm.hasUpdate(item.slug, item.version);
          return (
            <AppCard
              app={item}
              onPress={() => handleAppPress(item)}
              onLongPress={() => handleAppLongPress(item)}
              isInstalled={installed}
              hasUpdate={update}
            />
          );
        }}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <>
            {null /* Announcement banner is rendered as a root-level modal overlay */}
            {appsWithUpdates.length > 0 && (
              <InstalledUpdatesBanner
                apps={appsWithUpdates}
                onPress={() => {
                  if (appsWithUpdates.length === 1) {
                    router.push(`/app/${appsWithUpdates[0].slug}`);
                  } else {
                    router.push("/(tabs)/updates");
                  }
                }}
              />
            )}

            {/* Featured — horizontal ScrollView (no nested FlatList) */}
            {featuredApps.length > 0 && (
              <View style={{ marginTop: 10 }}>
                <View style={[styles.listHeader, { paddingBottom: 4 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="sparkles" size={15} color={colors.primary} />
                    <Text style={[styles.listHeaderTitle, { color: colors.foreground }]}>New & Featured</Text>
                  </View>
                  <Text style={[styles.listHeaderCount, { color: colors.mutedForeground }]}>{featuredApps.length} new</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 10, paddingBottom: 4 }}
                >
                  {featuredApps.map((item) => (
                    <FeaturedCard key={item.slug} app={item} onPress={() => handleFeaturedPress(item)} />
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.listHeader}>
              <View>
                <Text style={[styles.listHeaderTitle, { color: colors.foreground }]}>
                  {activeCategory === "All" ? "All Apps" : activeCategory}
                </Text>
                {loading && (
                  <Text style={[styles.loadingHint, { color: colors.mutedForeground }]}>Syncing from Firebase…</Text>
                )}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.listHeaderCount, { color: colors.mutedForeground }]}>
                  {filteredApps.length} {filteredApps.length === 1 ? "app" : "apps"}
                </Text>
                <Pressable
                  onPress={handleSortCycle}
                  style={({ pressed }) => [
                    styles.sortBtn,
                    { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name={currentSort.icon as "time-outline"} size={12} color={colors.accent} />
                  <Text style={[styles.sortBtnText, { color: colors.accent }]}>{currentSort.label}</Text>
                </Pressable>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ paddingTop: 4 }}>
              {[1, 2, 3, 4].map((i) => <SkeletonAppCard key={i} />)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No apps in this category</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Check back soon</Text>
            </View>
          )
        }
        ListFooterComponent={<FooterDisclaimer />}
      />

      <QuickActionSheet
        app={quickActionApp}
        visible={!!quickActionApp}
        onClose={() => setQuickActionApp(null)}
        isFav={qaIsFav}
        onToggleFav={() => {
          if (!quickActionApp) return;
          const action = qaIsFav ? "remove" : "add";
          toggleFavorite(quickActionApp.slug);
          logFavoriteToggle(quickActionApp.slug, quickActionApp.name, action);
        }}
        onShare={() => quickActionApp && handleQuickShare(quickActionApp)}
        onOpen={() => quickActionApp && handleAppPress(quickActionApp)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingBottom: 0 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 12 },
  headerEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 2, fontFamily: "Inter_700Bold" },
  headerTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, fontFamily: "Inter_700Bold" },
  headerBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  headerBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  updatedAt: { fontSize: 10, fontFamily: "Inter_400Regular" },
  categoriesScroll: { flexGrow: 0 },
  categoriesScrollContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  categoryCount: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: "center" },
  categoryCountText: { fontSize: 9, fontWeight: "700", fontFamily: "Inter_700Bold" },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  listHeaderTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  listHeaderCount: { fontSize: 13, fontFamily: "Inter_400Regular" },
  loadingHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  sortBtnText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  appCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  appIconWrapper: { position: "relative" },
  verifiedDot: { position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  appCardMeta: { flex: 1, gap: 2 },
  appCategory: { fontSize: 9, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  newBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#00e673", borderRadius: 4, borderWidth: 1, borderColor: "transparent", paddingHorizontal: 5, paddingVertical: 1 },
  newBadgeText: { color: "#04131b", fontSize: 8, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  appName: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, fontFamily: "Inter_700Bold" },
  appDeveloper: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, alignSelf: "flex-start" },
  ratingText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  appDescription: { fontSize: 13, lineHeight: 19, marginTop: 10, fontFamily: "Inter_400Regular" },
  appCardFooter: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  footerStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerStatText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  versionBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginLeft: "auto" },
  versionText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bellBtn: { position: "relative", width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    borderRadius: 7,
    minWidth: 15,
    height: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: "#04131b", fontSize: 8, fontWeight: "800", fontFamily: "Inter_700Bold" },
});

const loadingBannerStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 100,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
});

const offlineStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 290,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 28,
    marginTop: 6,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 22,
    marginTop: 2,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
