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
    icon: "information-circle-outline",
    title: "INFORMATION WE COLLECT",
    body: `AA Mods Store collects minimal data necessary to provide a great experience:\n\n• Device information (model, OS version, app version) for compatibility\n• Anonymous usage analytics (screens viewed, features used) via Firebase Analytics\n• Download activity (which apps are downloaded) to improve our catalog\n• Crash reports to fix bugs and improve stability\n\nWe do NOT collect your name, email, phone number, or any personally identifiable information unless you voluntarily contact us for support.`,
  },
  {
    icon: "shield-checkmark-outline",
    title: "HOW WE USE YOUR DATA",
    body: `Data collected is used solely to:\n\n• Improve app stability and performance\n• Understand which mods are most popular\n• Detect and fix crashes or errors\n• Provide relevant app update notifications\n\nWe do not sell, rent, or share your data with third parties for marketing purposes.`,
  },
  {
    icon: "cloud-outline",
    title: "DATA STORAGE & SECURITY",
    body: `All data is stored securely using Firebase (Google Cloud infrastructure). We use industry-standard encryption for data in transit and at rest.\n\nApp catalog data is stored in Firebase Realtime Database. Analytics data is processed by Google Firebase Analytics. No sensitive personal data is stored on our servers.`,
  },
  {
    icon: "phone-portrait-outline",
    title: "DEVICE PERMISSIONS",
    body: `AA Mods Store may request the following permissions:\n\n• Internet access — required to fetch the app catalog and download APKs\n• Storage — needed to save downloaded APK files to your device\n• Notifications — optional, for update alerts (can be disabled at any time)\n\nNo other permissions are requested. All permission usage is disclosed within the app.`,
  },
  {
    icon: "people-outline",
    title: "THIRD-PARTY SERVICES",
    body: `We use the following third-party services:\n\n• Firebase (Google) — analytics, crash reporting, and database\n• OneSignal — push notifications (only on mobile)\n\nThese services have their own privacy policies. We encourage you to review them:\n• Firebase: policies.google.com/privacy\n• OneSignal: onesignal.com/privacy_policy`,
  },
  {
    icon: "hand-left-outline",
    title: "YOUR RIGHTS",
    body: `You have the right to:\n\n• Opt out of analytics by disabling tracking in your device settings\n• Disable push notifications at any time in your device settings\n• Request deletion of any data associated with your device by contacting us\n\nSince we do not create user accounts, all data is anonymous and tied to device identifiers only.`,
  },
  {
    icon: "refresh-outline",
    title: "POLICY UPDATES",
    body: `This Privacy Policy may be updated periodically. We will notify users of significant changes via in-app announcements. Continued use of the app after changes constitutes acceptance of the updated policy.\n\nLast updated: May 2025`,
  },
];

export default function PrivacyScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Privacy Policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 32 }]}>
        <View style={[styles.introCard, { backgroundColor: "rgba(0,230,115,0.06)", borderColor: "rgba(0,230,115,0.2)" }]}>
          <Ionicons name="lock-closed-outline" size={28} color="#00e673" />
          <Text style={[styles.introTitle, { color: colors.foreground }]}>Your Privacy Matters</Text>
          <Text style={[styles.introBody, { color: colors.mutedForeground }]}>
            AA Mods Store is committed to protecting your privacy. This policy explains what data we collect, why we collect it, and how we use it.
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
          Questions? Contact us at support@aa-mods.com
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
