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
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import React, { useEffect, useRef } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView as _GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { setupPushNotifications } from "@/lib/notifications";
import { logAppOpen } from "@/lib/analytics";
import { useRemoteConfig } from "@/hooks/useRemoteConfig";
import { initializeOneSignal } from "@/lib/oneSignal";

const GestureHandlerRootView = _GestureHandlerRootView as unknown as React.ComponentType<{
  style?: object;
  children?: React.ReactNode;
}>;

const isExpoGo = Constants.appOwnership === "expo";

SplashScreen.preventAutoHideAsync();

initializeOneSignal();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
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

function RootLayoutNav() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const { config, loaded } = useRemoteConfig();

  useEffect(() => {
    logAppOpen();

    if (!isExpoGo) {
      setupPushNotifications().catch(() => {});

      notificationListener.current = Notifications.addNotificationReceivedListener((n) => {
        console.log("[Notification received]", n.request.content.title);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((r) => {
        const data = r.notification.request.content.data as Record<string, unknown>;
        if (data?.url && typeof data.url === "string") {
          Linking.openURL(data.url).catch(() => {});
        } else if (data?.slug && typeof data.slug === "string") {
          Linking.openURL(`aa-mods:///app/${data.slug}`).catch(() => {});
        }
      });
    }

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (loaded && config.maintenanceMode) {
    return <MaintenanceScreen message={config.maintenanceMessage} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="app/[slug]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
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
          <UserDataProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardWrapper>
                <RootLayoutNav />
              </KeyboardWrapper>
            </GestureHandlerRootView>
          </UserDataProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
