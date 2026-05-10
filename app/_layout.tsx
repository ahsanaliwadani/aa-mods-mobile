import "@/lib/webWarnings";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView as _GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { DownloadManagerProvider } from "@/contexts/DownloadManagerContext";
import { NotificationInboxProvider, useNotificationInbox } from "@/contexts/NotificationInboxContext";
import type { NotifType } from "@/contexts/NotificationInboxContext";
import { setupPushNotifications } from "@/lib/notifications";
import { logAppOpen } from "@/lib/analytics";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { initializeOneSignal, setInboxCallback } from "@/lib/oneSignal";

const GestureHandlerRootView = _GestureHandlerRootView as unknown as React.ComponentType<{
  style?: object;
  children?: React.ReactNode;
}>;

const isExpoGo = Constants.appOwnership === "expo";

SplashScreen.preventAutoHideAsync();

initializeOneSignal();

if (Platform.OS !== "web") {
  try {
    const { Insights } = require("expo-insights");
    Insights.record().catch(() => {});
  } catch {}
}

if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg: string = event?.reason?.message ?? "";
    if (msg.includes("timeout exceeded") || msg.includes("FontFace")) {
      event.preventDefault();
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

type WrapperProps = { children: React.ReactNode };

const KeyboardWrapper: React.FC<WrapperProps> =
  Platform.OS === "web"
    ? ({ children }) => <View style={{ flex: 1 }}>{children}</View>
    : (() => {
        const { KeyboardProvider } = require("react-native-keyboard-controller");
        return ({ children }: WrapperProps) => (
          <KeyboardProvider>{children}</KeyboardProvider>
        );
      })();

type NotifSubscription = { remove: () => void } | null;

function getLocalNotifType(data: Record<string, unknown>): NotifType {
  const t = data?.type as string | undefined;
  if (t === "download_start") return "download_start";
  if (t === "download_done") return "download_done";
  if (t === "download_error") return "download_error";
  if (t === "update_available") return "update_available";
  if (t === "new_app") return "new_app";
  if (t === "installed_update") return "installed_update";
  return "general";
}

function RootLayoutNav() {
  const notifListener = useRef<NotifSubscription>(null);
  const responseListener = useRef<NotifSubscription>(null);
  const { config, loaded } = useRemoteConfig();
  const { addItem } = useNotificationInbox();

  useEffect(() => {
    logAppOpen();

    if (typeof setInboxCallback === "function") {
      setInboxCallback(addItem);
    }

    if (!isExpoGo && Platform.OS !== "web") {
      const Notifications = require("expo-notifications");

      setupPushNotifications().catch(() => {});

      notifListener.current = Notifications.addNotificationReceivedListener(
        (n: { request: { content: { title?: string; body?: string; data: Record<string, unknown> } } }) => {
          const { title, body, data } = n.request.content;
          if (title) {
            addItem({
              title: title ?? "",
              body: body ?? "",
              type: getLocalNotifType(data ?? {}),
              data: data as Record<string, unknown>,
            });
          }
        },
      );

      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (r: { notification: { request: { content: { data: Record<string, unknown> } } } }) => {
          const data = r.notification.request.content.data;
          if (typeof data?.url === "string" && data.url) {
            Linking.openURL(data.url).catch(() => {});
          } else if (typeof data?.slug === "string" && data.slug) {
            Linking.openURL(`aa-mods:///app/${data.slug}`).catch(() => {});
          }
        },
      );
    }

    return () => {
      setInboxCallback(null);
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [addItem]);

  if (loaded && config.maintenanceMode) {
    return <MaintenanceScreen message={config.maintenanceMessage} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="app/[slug]" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="inbox" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="about" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="privacy" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="terms" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="disclaimer" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <DownloadManagerProvider>
            <UserDataProvider>
              <NotificationInboxProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardWrapper>
                    <RootLayoutNav />
                  </KeyboardWrapper>
                </GestureHandlerRootView>
              </NotificationInboxProvider>
            </UserDataProvider>
          </DownloadManagerProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
