import { Platform } from "react-native";
import { logAnalyticsEvent } from "./firebaseAnalytics";

export function logAppOpen(): void {
  logAnalyticsEvent("app_open", { platform: Platform.OS });
}

export function logScreenView(screenName: string): void {
  logAnalyticsEvent("screen_view", { screen_name: screenName, platform: Platform.OS });
}

export function logAppCardPress(appSlug: string, appName: string): void {
  logAnalyticsEvent("app_card_press", { app_slug: appSlug, app_name: appName });
}

export function logAppDetailView(appSlug: string, appName: string): void {
  logAnalyticsEvent("app_detail_view", { app_slug: appSlug, app_name: appName });
}

export function logDownloadClick(appSlug: string, appName: string, source: string): void {
  logAnalyticsEvent("download_click", { app_slug: appSlug, app_name: appName, source });
}

export function logSearchQuery(query: string, resultCount: number): void {
  logAnalyticsEvent("search", { query: query.slice(0, 100), result_count: resultCount });
}

export function logUpdateBannerShown(version: string, mandatory: boolean): void {
  logAnalyticsEvent("update_banner_shown", { version, mandatory });
}

export function logUpdateBannerDismissed(version: string): void {
  logAnalyticsEvent("update_banner_dismissed", { version });
}

export function logUpdateBannerClicked(version: string): void {
  logAnalyticsEvent("update_banner_clicked", { version });
}

export function logNotificationPermission(status: string): void {
  logAnalyticsEvent("notification_permission", { status });
}

export function logCategoryFilter(category: string): void {
  logAnalyticsEvent("category_filter", { category });
}

export function logFavoriteToggle(
  appSlug: string,
  appName: string,
  action: "add" | "remove",
): void {
  logAnalyticsEvent("favorite_toggle", { app_slug: appSlug, app_name: appName, action });
}

export function logShareApp(appSlug: string, appName: string): void {
  logAnalyticsEvent("share_app", { app_slug: appSlug, app_name: appName });
}

export function logFeaturedCardPress(appSlug: string, appName: string): void {
  logAnalyticsEvent("featured_card_press", { app_slug: appSlug, app_name: appName });
}
