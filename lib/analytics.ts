import { Platform } from "react-native";
import { logAnalyticsEvent } from "./firebaseAnalytics";

// ─── App Lifecycle ──────────────────────────────────────────────────────────

export function logAppOpen(): void {
  logAnalyticsEvent("app_open", { platform: Platform.OS });
}

export function logSessionStart(appCount: number): void {
  logAnalyticsEvent("session_start", { platform: Platform.OS, app_count: appCount });
}

// ─── Screen Views ──────────────────────────────────────────────────────────

export function logScreenView(screenName: string): void {
  logAnalyticsEvent("screen_view", { screen_name: screenName, platform: Platform.OS });
}

// ─── Catalog & Firebase ────────────────────────────────────────────────────

export function logCatalogSynced(appCount: number, durationMs: number, source: "firebase" | "cache"): void {
  logAnalyticsEvent("catalog_synced", { app_count: appCount, duration_ms: durationMs, source });
}

export function logCatalogError(reason: string): void {
  logAnalyticsEvent("catalog_error", { reason: reason.slice(0, 100) });
}

// ─── App Card Interactions ─────────────────────────────────────────────────

export function logAppCardPress(appSlug: string, appName: string): void {
  logAnalyticsEvent("app_card_press", { app_slug: appSlug, app_name: appName });
}

export function logAppDetailView(appSlug: string, appName: string, category: string): void {
  logAnalyticsEvent("app_detail_view", { app_slug: appSlug, app_name: appName, category });
}

export function logAppNotFound(slug: string): void {
  logAnalyticsEvent("app_not_found", { slug });
}

export function logFeaturedCardPress(appSlug: string, appName: string): void {
  logAnalyticsEvent("featured_card_press", { app_slug: appSlug, app_name: appName });
}

export function logChangelogExpanded(appSlug: string, appName: string): void {
  logAnalyticsEvent("changelog_expanded", { app_slug: appSlug, app_name: appName });
}

export function logMirrorLinkUsed(appSlug: string, appName: string, label: string): void {
  logAnalyticsEvent("mirror_link_used", { app_slug: appSlug, app_name: appName, label: label.slice(0, 50) });
}

export function logSeeMoreModsPress(fromSlug: string, toSlug: string): void {
  logAnalyticsEvent("see_more_mods_press", { from_slug: fromSlug, to_slug: toSlug });
}

// ─── Downloads ─────────────────────────────────────────────────────────────

export function logDownloadClick(appSlug: string, appName: string, source: string): void {
  logAnalyticsEvent("download_click", { app_slug: appSlug, app_name: appName, source });
}

export function logDownloadStarted(appSlug: string, appName: string, version: string, linkType: "direct" | "mediafire" | "mirror"): void {
  logAnalyticsEvent("download_started", { app_slug: appSlug, app_name: appName, version, link_type: linkType });
}

export function logDownloadCompleted(appSlug: string, appName: string, version: string, durationMs: number, fileSizeMb: number): void {
  logAnalyticsEvent("download_completed", {
    app_slug: appSlug,
    app_name: appName,
    version,
    duration_ms: Math.round(durationMs),
    file_size_mb: Math.round(fileSizeMb * 10) / 10,
  });
}

export function logDownloadFailed(appSlug: string, appName: string, errorType: string): void {
  logAnalyticsEvent("download_failed", {
    app_slug: appSlug,
    app_name: appName,
    error_type: errorType.slice(0, 100),
  });
}

export function logDownloadCancelled(appSlug: string, appName: string, progressPct: number): void {
  logAnalyticsEvent("download_cancelled", { app_slug: appSlug, app_name: appName, progress_pct: progressPct });
}

export function logDownloadRetried(appSlug: string, appName: string): void {
  logAnalyticsEvent("download_retried", { app_slug: appSlug, app_name: appName });
}

export function logMediafireResolved(appSlug: string, durationMs: number, success: boolean): void {
  logAnalyticsEvent("mediafire_resolved", { app_slug: appSlug, duration_ms: Math.round(durationMs), success });
}

export function logApkInstalled(appSlug: string, appName: string, version: string): void {
  logAnalyticsEvent("apk_installed", { app_slug: appSlug, app_name: appName, version });
}

// ─── Search ────────────────────────────────────────────────────────────────

export function logSearchQuery(query: string, resultCount: number): void {
  logAnalyticsEvent("search", { query: query.slice(0, 100), result_count: resultCount });
}

export function logSearchNoResults(query: string): void {
  logAnalyticsEvent("search_no_results", { query: query.slice(0, 100) });
}

export function logSearchResultSelected(appSlug: string, appName: string, query: string, position: number): void {
  logAnalyticsEvent("search_result_selected", {
    app_slug: appSlug,
    app_name: appName,
    query: query.slice(0, 100),
    position,
  });
}

// ─── Filters & Sorting ─────────────────────────────────────────────────────

export function logCategoryFilter(category: string): void {
  logAnalyticsEvent("category_filter", { category });
}

export function logSortChanged(sortKey: string): void {
  logAnalyticsEvent("sort_changed", { sort_key: sortKey });
}

export function logUpdatesFilterChanged(filter: string, count: number): void {
  logAnalyticsEvent("updates_filter_changed", { filter, count });
}

// ─── Favorites & Social ────────────────────────────────────────────────────

export function logFavoriteToggle(appSlug: string, appName: string, action: "add" | "remove"): void {
  logAnalyticsEvent("favorite_toggle", { app_slug: appSlug, app_name: appName, action });
}

export function logShareApp(appSlug: string, appName: string): void {
  logAnalyticsEvent("share_app", { app_slug: appSlug, app_name: appName });
}

// ─── Update Banner ─────────────────────────────────────────────────────────

export function logUpdateBannerShown(version: string, mandatory: boolean): void {
  logAnalyticsEvent("update_banner_shown", { version, mandatory });
}

export function logUpdateBannerDismissed(version: string): void {
  logAnalyticsEvent("update_banner_dismissed", { version });
}

export function logUpdateBannerClicked(version: string): void {
  logAnalyticsEvent("update_banner_clicked", { version });
}

// ─── Notifications ─────────────────────────────────────────────────────────

export function logNotificationPermission(status: string): void {
  logAnalyticsEvent("notification_permission", { status });
}

export function logNotificationTapped(type: string, appSlug?: string): void {
  logAnalyticsEvent("notification_tapped", { type, ...(appSlug ? { app_slug: appSlug } : {}) });
}

// ─── Settings & Storage ────────────────────────────────────────────────────

export function logSettingChanged(settingKey: string, value: string | boolean): void {
  logAnalyticsEvent("setting_changed", { setting_key: settingKey, value: String(value) });
}

export function logCacheCleared(bytesFreed: number): void {
  logAnalyticsEvent("cache_cleared", { bytes_freed: bytesFreed, mb_freed: Math.round(bytesFreed / 1024 / 1024 * 10) / 10 });
}

export function logAllDataReset(): void {
  logAnalyticsEvent("all_data_reset", {});
}

// ─── External Links ────────────────────────────────────────────────────────

export function logExternalLinkOpened(linkType: "telegram" | "discord" | "instagram" | "website" | "support" | "other"): void {
  logAnalyticsEvent("external_link_opened", { link_type: linkType });
}
