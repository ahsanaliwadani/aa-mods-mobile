import { ref, push } from "firebase/database";
import { Platform } from "react-native";
import { database } from "./firebase";

type EventParams = Record<string, string | number | boolean>;

function logEvent(event: string, params?: EventParams): void {
  try {
    const eventRef = ref(database, "analytics/events");
    push(eventRef, {
      event,
      params: params ?? {},
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
    }).catch(() => {});
  } catch {
    // Analytics write silently ignored if Firebase rules deny access
  }
}

export function logAppOpen(): void {
  logEvent("app_open");
}

export function logScreenView(screenName: string): void {
  logEvent("screen_view", { screen_name: screenName });
}

export function logAppCardPress(appSlug: string, appName: string): void {
  logEvent("app_card_press", { app_slug: appSlug, app_name: appName });
}

export function logAppDetailView(appSlug: string, appName: string): void {
  logEvent("app_detail_view", { app_slug: appSlug, app_name: appName });
}

export function logDownloadClick(appSlug: string, appName: string, source: string): void {
  logEvent("download_click", { app_slug: appSlug, app_name: appName, source });
}

export function logSearchQuery(query: string, resultCount: number): void {
  logEvent("search", { query: query.slice(0, 100), result_count: resultCount });
}

export function logUpdateBannerShown(version: string, mandatory: boolean): void {
  logEvent("update_banner_shown", { version, mandatory });
}

export function logUpdateBannerDismissed(version: string): void {
  logEvent("update_banner_dismissed", { version });
}

export function logUpdateBannerClicked(version: string): void {
  logEvent("update_banner_clicked", { version });
}

export function logNotificationPermission(status: string): void {
  logEvent("notification_permission", { status });
}

export function logCategoryFilter(category: string): void {
  logEvent("category_filter", { category });
}

export function logFavoriteToggle(appSlug: string, appName: string, action: "add" | "remove"): void {
  logEvent("favorite_toggle", { app_slug: appSlug, app_name: appName, action });
}

export function logShareApp(appSlug: string, appName: string): void {
  logEvent("share_app", { app_slug: appSlug, app_name: appName });
}

export function logFeaturedCardPress(appSlug: string, appName: string): void {
  logEvent("featured_card_press", { app_slug: appSlug, app_name: appName });
}
