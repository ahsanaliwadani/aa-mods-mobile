import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
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
import { useFirebaseCatalog } from "@/hooks/useFirebaseCatalog";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";

const FEATURES = [
  { icon: "shield-checkmark-outline", label: "Safe\nDownloads" },
  { icon: "refresh-circle-outline", label: "Live\nUpdates" },
  { icon: "star-outline", label: "100%\nFree" },
  { icon: "apps-outline", label: "19+\nApps" },
] as const;

export default function AboutScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { apps, categories } = useFirebaseCatalog();
  const { config } = useRemoteConfig();

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const totalCategories = categories.filter((c) => c !== "All").length;
  const newCount = apps.filter((a) => a.isNew).length;

  return (
    <View style={[aStyles.container, { backgroundColor: colors.background }]}>
      <View style={[aStyles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [aStyles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[aStyles.headerTitle, { color: colors.foreground }]}>About AA Mods</Text>
        <View style={aStyles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[aStyles.scroll, { paddingBottom: bottomInset + 32 }]}>

        {/* Hero */}
        <View style={[aStyles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={aStyles.logo}
            contentFit="cover"
          />
          <Text style={[aStyles.appName, { color: colors.foreground }]}>AA Mods Store</Text>
          <Text style={[aStyles.tagline, { color: colors.mutedForeground }]}>Safe & stable Android MOD APK platform</Text>
          <View style={aStyles.heroBadges}>
            <View style={[aStyles.badge, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.3)" }]}>
              <Ionicons name="shield-checkmark" size={12} color="#00e673" />
              <Text style={[aStyles.badgeText, { color: "#00e673" }]}>Trusted & Verified</Text>
            </View>
            <View style={[aStyles.badge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[aStyles.badgeText, { color: colors.mutedForeground }]}>v{appVersion}</Text>
            </View>
          </View>
        </View>

        {/* Live stats */}
        <View style={aStyles.statsRow}>
          {[
            { icon: "apps", label: "Total Apps", value: `${apps.length}`, sub: "MOD APKs" },
            { icon: "layers-outline", label: "Categories", value: `${totalCategories}`, sub: "genres" },
            { icon: "sparkles", label: "New This Week", value: `${newCount}`, sub: "updates" },
          ].map(({ icon, label, value, sub }) => (
            <View key={label} style={[aStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={icon as "apps"} size={18} color={colors.primary} />
              <Text style={[aStyles.statVal, { color: colors.foreground }]}>{value}</Text>
              <Text style={[aStyles.statSub, { color: colors.mutedForeground }]}>{sub}</Text>
            </View>
          ))}
        </View>

        {/* Feature grid */}
        <View style={[aStyles.featureGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={aStyles.featureHeader}>
            <Ionicons name="sparkles-outline" size={14} color={colors.accent} />
            <Text style={[aStyles.featureTitleText, { color: colors.accent }]}>WHAT WE OFFER</Text>
          </View>
          <View style={aStyles.featureCols}>
            {FEATURES.map(({ icon, label }) => (
              <View key={icon} style={[aStyles.featureItem, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <View style={[aStyles.featureIconWrap, { backgroundColor: "rgba(0,230,115,0.1)" }]}>
                  <Ionicons name={icon as "apps"} size={18} color="#00e673" />
                </View>
                <Text style={[aStyles.featureLabel, { color: colors.foreground }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Who we are */}
        <View style={[aStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={aStyles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <Text style={[aStyles.sectionTitle, { color: colors.accent }]}>WHO WE ARE</Text>
          </View>
          <Text style={[aStyles.body, { color: colors.mutedForeground }]}>
            AA Mods Store is a curated platform dedicated to providing safe, tested, and verified MOD APKs for Android users. We believe everyone deserves access to premium app features without barriers.
          </Text>
          <Text style={[aStyles.body, { color: colors.mutedForeground, marginTop: 10 }]}>
            Our team manually reviews every mod before it's listed, ensuring stability, security, and a great user experience. We are not affiliated with any original app developers — AA Mods is an independent community project.
          </Text>
        </View>

        {/* Important note */}
        <View style={[aStyles.section, { backgroundColor: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.25)" }]}>
          <View style={aStyles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={16} color="#fbbf24" />
            <Text style={[aStyles.sectionTitle, { color: "#fbbf24" }]}>IMPORTANT NOTE</Text>
          </View>
          <Text style={[aStyles.body, { color: colors.mutedForeground }]}>
            AA Mods Store provides modified APKs for educational and personal use only. We encourage users to support original developers by purchasing official apps when possible. Use these mods responsibly and at your own risk.
          </Text>
        </View>

        {/* App Info */}
        <View style={[aStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={aStyles.sectionHeader}>
            <Ionicons name="code-slash-outline" size={16} color={colors.accent} />
            <Text style={[aStyles.sectionTitle, { color: colors.accent }]}>APP INFO</Text>
          </View>
          {[
            { label: "Developer", value: "AA Mods Team" },
            { label: "App Version", value: `v${appVersion}` },
            { label: "Total Apps", value: `${apps.length} MOD APKs` },
            { label: "Categories", value: `${totalCategories} categories` },
            { label: "Platform", value: "Android / iOS / Web" },
            { label: "License", value: "Free — always" },
          ].map(({ label, value }, i, arr) => (
            <View key={label}>
              <View style={aStyles.infoRow}>
                <Text style={[aStyles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[aStyles.infoValue, { color: colors.foreground }]}>{value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[aStyles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        {/* Website / Links */}
        {(config.websiteUrl || config.telegramUrl) && (
          <View style={[aStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={aStyles.sectionHeader}>
              <Ionicons name="globe-outline" size={16} color={colors.accent} />
              <Text style={[aStyles.sectionTitle, { color: colors.accent }]}>FIND US ONLINE</Text>
            </View>
            {config.websiteUrl ? (
              <Pressable
                onPress={() => Linking.openURL(config.websiteUrl).catch(() => {})}
                style={[aStyles.linkRow, { borderColor: colors.border }]}
              >
                <Ionicons name="globe-outline" size={16} color={colors.accent} />
                <Text style={[aStyles.linkText, { color: colors.foreground }]}>
                  {config.websiteUrl.replace(/^https?:\/\//, "")}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
            {config.telegramUrl ? (
              <Pressable
                onPress={() => Linking.openURL(config.telegramUrl).catch(() => {})}
                style={[aStyles.linkRow, { borderColor: colors.border }]}
              >
                <Ionicons name="paper-plane" size={16} color="#2AABEE" />
                <Text style={[aStyles.linkText, { color: colors.foreground }]}>Telegram Channel</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
        )}

        <Text style={[aStyles.footer, { color: colors.mutedForeground }]}>
          Made with care by the AA Mods Team · All mods are tested & verified
        </Text>
      </ScrollView>
    </View>
  );
}

const aStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  scroll: { padding: 16, gap: 12 },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  logo: { width: 80, height: 80, borderRadius: 20 },
  appName: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  heroBadges: { flexDirection: "row", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, gap: 3 },
  statVal: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statSub: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  featureGrid: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  featureHeader: { flexDirection: "row", alignItems: "center", gap: 6, padding: 14, paddingBottom: 10 },
  featureTitleText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  featureCols: { flexDirection: "row", padding: 10, paddingTop: 0, gap: 8 },
  featureItem: { flex: 1, alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  featureIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "center", lineHeight: 14 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  body: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 11 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  divider: { height: 1 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, marginTop: 4 },
  linkText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, lineHeight: 18 },
});
