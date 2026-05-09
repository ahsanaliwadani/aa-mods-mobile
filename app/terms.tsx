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
    icon: "checkmark-circle-outline",
    title: "ACCEPTANCE OF TERMS",
    body: `By downloading, installing, or using the AA Mods Store application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the app.\n\nThese terms may be updated at any time. Continued use of the app constitutes acceptance of any changes.`,
  },
  {
    icon: "cube-outline",
    title: "DESCRIPTION OF SERVICE",
    body: `AA Mods Store provides a curated collection of modified Android APK files (MOD APKs) for educational and personal use. We provide information about, and links to download, modified versions of third-party applications.\n\nAA Mods Store is an independent project and is not affiliated with, endorsed by, or connected to any original application developers or publishers.`,
  },
  {
    icon: "person-outline",
    title: "USER RESPONSIBILITIES",
    body: `By using AA Mods Store, you agree to:\n\n• Use the app for personal, non-commercial purposes only\n• Not redistribute or sell any APKs obtained through our platform\n• Comply with the laws and regulations of your jurisdiction\n• Understand that MOD APKs may violate the terms of service of original applications\n• Take full responsibility for any consequences arising from installing MOD APKs\n• Be at least 13 years of age (or the minimum age required in your country)`,
  },
  {
    icon: "alert-circle-outline",
    title: "PROHIBITED USES",
    body: `You are prohibited from:\n\n• Using MOD APKs for commercial gain or to harm original developers\n• Attempting to reverse-engineer or tamper with AA Mods Store itself\n• Using the platform to distribute malware or harmful software\n• Circumventing any security measures within the app\n• Misrepresenting your affiliation with AA Mods Store\n• Engaging in any activity that disrupts or interferes with our services`,
  },
  {
    icon: "shield-outline",
    title: "INTELLECTUAL PROPERTY",
    body: `AA Mods Store respects intellectual property rights. All original apps featured in our catalog belong to their respective developers and publishers.\n\nThe AA Mods Store app interface, branding, and original content are owned by the AA Mods Team. You may not reproduce or distribute our branding without permission.\n\nIf you believe your intellectual property rights have been infringed, please contact us for prompt removal.`,
  },
  {
    icon: "warning-outline",
    title: "DISCLAIMER OF WARRANTIES",
    body: `AA Mods Store is provided "as is" without warranties of any kind. We do not guarantee:\n\n• That MOD APKs will work perfectly on your device\n• That MOD APKs are free from bugs or security vulnerabilities\n• Continuous, uninterrupted access to our services\n• That mods will remain working after original app updates\n\nAll APKs are tested to the best of our ability, but use is at your own risk.`,
  },
  {
    icon: "close-circle-outline",
    title: "LIMITATION OF LIABILITY",
    body: `To the maximum extent permitted by law, AA Mods Store and the AA Mods Team shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from:\n\n• Your use or inability to use the app or any APKs\n• Any errors or omissions in app content\n• Any unauthorized access to or alteration of your data\n• Any loss of data or device damage resulting from APK installation`,
  },
  {
    icon: "document-text-outline",
    title: "GOVERNING LAW",
    body: `These Terms of Service shall be governed by and construed in accordance with applicable laws. Any disputes arising from these terms shall be resolved through good-faith negotiation.\n\nIf you have questions about these terms, please contact us before taking legal action.\n\nLast updated: May 2025`,
  },
];

export default function TermsScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Terms of Service</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 32 }]}>
        <View style={[styles.introCard, { backgroundColor: "rgba(34,211,238,0.06)", borderColor: "rgba(34,211,238,0.2)" }]}>
          <Ionicons name="document-text-outline" size={28} color={colors.accent} />
          <Text style={[styles.introTitle, { color: colors.foreground }]}>Terms of Service</Text>
          <Text style={[styles.introBody, { color: colors.mutedForeground }]}>
            Please read these terms carefully before using AA Mods Store. These terms govern your use of our platform and services.
          </Text>
        </View>

        {SECTIONS.map(({ icon, title, body }) => (
          <View key={title} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name={icon as "apps"} size={16} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.accent }]}>{title}</Text>
            </View>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{body}</Text>
          </View>
        ))}

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Questions about these terms? Contact us at support@aa-mods.com
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
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, lineHeight: 18 },
});
