import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
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

export default function AboutScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>About</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 32 }]}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={{ uri: "https://aa-mods.vercel.app/logo.png" }}
            style={styles.logo}
            contentFit="cover"
          />
          <Text style={[styles.appName, { color: colors.foreground }]}>AA Mods Store</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>Safe & stable Android MOD APK platform</Text>
          <View style={[styles.badge, { backgroundColor: "rgba(0,230,115,0.12)", borderColor: "rgba(0,230,115,0.3)" }]}>
            <Ionicons name="shield-checkmark" size={12} color="#00e673" />
            <Text style={[styles.badgeText, { color: "#00e673" }]}>Trusted & Verified</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>WHO WE ARE</Text>
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            AA Mods Store is a curated platform dedicated to providing safe, tested, and verified MOD APKs for Android users. We believe everyone deserves access to premium app features without barriers.
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground, marginTop: 10 }]}>
            Our team manually reviews every mod before it's listed, ensuring stability, security, and a great user experience. We are not affiliated with any original app developers — AA Mods is an independent community project.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>WHAT WE OFFER</Text>
          </View>
          {[
            { icon: "shield-checkmark-outline", text: "Every APK is manually tested before release" },
            { icon: "refresh-circle-outline", text: "Regular updates to keep mods working" },
            { icon: "star-outline", text: "Completely free — no hidden fees or subscriptions" },
            { icon: "apps-outline", text: "Growing library of 19+ curated MOD APKs" },
            { icon: "flash-outline", text: "Fast, direct download links" },
            { icon: "people-outline", text: "Active community support via Telegram" },
          ].map(({ icon, text }) => (
            <View key={icon} style={styles.featureRow}>
              <Ionicons name={icon as "apps"} size={16} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={16} color="#fbbf24" />
            <Text style={[styles.sectionTitle, { color: "#fbbf24" }]}>IMPORTANT NOTE</Text>
          </View>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            AA Mods Store provides modified APKs for educational and personal use only. We encourage users to support original developers by purchasing official apps when possible. Use these mods responsibly and at your own risk.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="code-slash-outline" size={16} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>APP INFO</Text>
          </View>
          {[
            { label: "Developer", value: "AA Mods Team" },
            { label: "Website", value: "aa-mods.vercel.app" },
            { label: "Platform", value: "Android" },
            { label: "License", value: "Free — always" },
          ].map(({ label, value }, i, arr) => (
            <View key={label}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Made with care by the AA Mods Team · All mods are tested & verified
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  scroll: { padding: 16, gap: 12 },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  logo: { width: 80, height: 80, borderRadius: 20 },
  appName: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter_700Bold" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  body: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  featureText: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular", flex: 1 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  divider: { height: 1 },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, lineHeight: 18 },
});
