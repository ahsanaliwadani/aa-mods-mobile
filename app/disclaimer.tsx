import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

const SECTIONS = [
  {
    icon: "alert-circle-outline",
    title: "GENERAL DISCLAIMER",
    color: "#fbbf24",
    bgColor: "rgba(251,191,36,0.06)",
    borderColor: "rgba(251,191,36,0.25)",
    body: `AA Mods Store provides modified APK files strictly for educational and personal use. We make no claims of ownership over any of the original applications featured in our catalog. All trademarks, logos, and brand names belong to their respective owners.`,
  },
  {
    icon: "shield-outline",
    title: "NO AFFILIATION",
    color: "#22d3ee",
    bgColor: "rgba(34,211,238,0.06)",
    borderColor: "rgba(34,211,238,0.2)",
    body: `AA Mods Store is an independent project with no affiliation, association, authorization, endorsement, or official connection to any original application developers, publishers, or companies.\n\nAll product names, logos, and brands mentioned are property of their respective owners. Their use does not imply any endorsement.`,
  },
  {
    icon: "download-outline",
    title: "APK SAFETY",
    color: "#00e673",
    bgColor: "rgba(0,230,115,0.06)",
    borderColor: "rgba(0,230,115,0.2)",
    body: `While we take every precaution to test and verify APKs before listing them, AA Mods Store cannot guarantee that all modified APKs are completely free from security vulnerabilities.\n\nInstalling APKs from outside the official Google Play Store carries inherent risks. Always ensure you have adequate security measures on your device and download only from trusted sources.`,
  },
  {
    icon: "warning-outline",
    title: "USE AT YOUR OWN RISK",
    color: "#f97316",
    bgColor: "rgba(249,115,22,0.06)",
    borderColor: "rgba(249,115,22,0.2)",
    body: `By using AA Mods Store, you acknowledge and accept that:\n\n• MOD APKs may violate the Terms of Service of original applications\n• Using mods may result in your account being banned from original services\n• Modified apps may behave differently from official versions\n• We are not responsible for any data loss, device damage, or account bans\n• It is your responsibility to comply with laws in your jurisdiction`,
  },
  {
    icon: "card-outline",
    title: "MONETIZATION DISCLAIMER",
    color: "#22d3ee",
    bgColor: "rgba(34,211,238,0.06)",
    borderColor: "rgba(34,211,238,0.2)",
    body: `AA Mods Store does not charge users for downloading or using any APKs. All mods are provided completely free of charge.\n\nThe platform may display advertisements to cover operational costs. We are not responsible for the content of third-party advertisements. Ad revenue helps keep the service free for everyone.`,
  },
  {
    icon: "refresh-outline",
    title: "AVAILABILITY & UPDATES",
    color: "#22d3ee",
    bgColor: "rgba(34,211,238,0.06)",
    borderColor: "rgba(34,211,238,0.2)",
    body: `We strive to keep all mods updated and working, but we cannot guarantee continuous availability of any specific mod. Original app updates may break existing mods and we may need time to release compatible updates.\n\nWe reserve the right to remove any APK from our catalog at any time without notice, particularly if original developers request removal.`,
  },
];

export default function DisclaimerScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Disclaimer</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 32 }]}>
        <View style={[styles.introCard, { backgroundColor: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.25)" }]}>
          <Ionicons name="warning-outline" size={28} color="#fbbf24" />
          <Text style={[styles.introTitle, { color: colors.foreground }]}>Important Disclaimer</Text>
          <Text style={[styles.introBody, { color: colors.mutedForeground }]}>
            Please read this disclaimer carefully. Using AA Mods Store implies that you have read and understood the following statements.
          </Text>
        </View>

        {SECTIONS.map(({ icon, title, body, color, bgColor, borderColor }) => (
          <View key={title} style={[styles.section, { backgroundColor: bgColor, borderColor }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name={icon as "apps"} size={16} color={color} />
              <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
            </View>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{body}</Text>
          </View>
        ))}

        <View style={[styles.finalNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.finalNoteText, { color: colors.mutedForeground }]}>
            By continuing to use AA Mods Store, you acknowledge that you have read, understood, and agreed to this disclaimer in its entirety.
          </Text>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Last updated: May 2025 · AA Mods Team
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
  introCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center", gap: 10 },
  introTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  introBody: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center" },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, fontFamily: "Inter_700Bold" },
  body: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },
  finalNote: { flexDirection: "row", gap: 12, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "flex-start" },
  finalNoteText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular", flex: 1 },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4, lineHeight: 18 },
});
