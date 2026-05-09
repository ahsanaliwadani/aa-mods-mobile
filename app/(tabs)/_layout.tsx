import { BlurView as _BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, Text } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useFirebaseCatalog } from "@/hooks/useFirebaseCatalog";
import { GlobalDownloadBar } from "@/components/GlobalDownloadBar";

const BlurView = _BlurView as unknown as React.ComponentType<{
  intensity?: number;
  tint?: string;
  style?: StyleProp<ViewStyle>;
}>;

function NewBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#00e673",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#04131b",
    fontSize: 9,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
  },
});

export default function TabLayout() {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isDark = true;
  const { newCount } = useFirebaseCatalog();
  const router = useRouter();

  const TAB_BAR_HEIGHT = Platform.OS === "web" ? 84 : 56;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            elevation: 0,
            height: Platform.OS === "web" ? 84 : undefined,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={80}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <View
                style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]}
              />
            ),
          tabBarLabelStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 11,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="updates"
          options={{
            title: "Updates",
            tabBarIcon: ({ color, focused }) => (
              <View>
                <Ionicons
                  name={focused ? "refresh-circle" : "refresh-circle-outline"}
                  size={24}
                  color={color}
                />
                <NewBadge count={newCount} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "For You",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "person-circle" : "person-circle-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      <GlobalDownloadBar
        tabBarHeight={TAB_BAR_HEIGHT}
        onEntryPress={(slug) => router.push(`/app/${slug}`)}
      />
    </View>
  );
}
