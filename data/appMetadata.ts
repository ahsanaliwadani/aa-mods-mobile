export const AA_HELPLINE_BOT_URL = "https://t.me/AA_Helpline_bot";

export type AppFacts = {
  requirement: string;
  architecture: string;
  contentRating: string;
  supportSummary: string;
  safetySummary: string;
};

const DEFAULT_APP_FACTS: AppFacts = {
  requirement: "Android 6.0+",
  architecture: "ARM64-v8a / armeabi-v7a",
  contentRating: "Rated for 3+",
  supportSummary: "Built for current Android phones with AA Mods release support.",
  safetySummary: "Published through AA Mods with verified direct-link release flow.",
};

export const APP_FACTS_BY_SLUG: Record<string, AppFacts> = {
  "aa-mods-store": {
    requirement: "Android 7.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 3+",
    supportSummary: "Best on modern Android phones for direct AA Mods browsing and update notifications.",
    safetySummary: "Official AA Mods platform build with secure release management and verified download flow.",
  },
  "aa-whatsapp": {
    requirement: "Android 5.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Optimized for everyday messaging, anti-ban stability, and multi-package installs.",
    safetySummary: "AA Mods privacy-focused messaging build with anti-ban protections and verified package releases.",
  },
  "aa-business": {
    requirement: "Android 5.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Designed for support teams, stores, and high-volume customer chat workflows.",
    safetySummary: "AA Mods business messaging release with stable automation tools and verified update packaging.",
  },
  "capcut-pro": {
    requirement: "Android 7.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Best on mid-range and flagship devices for timeline editing, exports, and creator workflows.",
    safetySummary: "AA Mods curated premium creator build with stable export-focused releases and verified links.",
  },
  "picsart-mod": {
    requirement: "Android 6.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Suitable for daily design, AI image edits, and batch editing on modern Android devices.",
    safetySummary: "AA Mods release with premium creative tools unlocked through the verified AA Mods distribution flow.",
  },
  "remini-mod": {
    requirement: "Android 6.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 3+",
    supportSummary: "Works best on devices with stable internet and enough RAM for AI image enhancement sessions.",
    safetySummary: "AA Mods AI enhancement build shared through verified links and current release tracking.",
  },
  "vidmate-mods": {
    requirement: "Android 5.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Built for broad Android compatibility with large-download and media-library usage.",
    safetySummary: "AA Mods media utility release with verified download routing and stable premium packaging.",
  },
  "moviebox-mods": {
    requirement: "Android 5.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Supports phones, tablets, and Android TV devices with remote-friendly playback workflows.",
    safetySummary: "AA Mods entertainment build with verified release tracking, direct links, and stable playback focus.",
  },
  "netflix-mods": {
    requirement: "Android 6.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Works across phones, tablets, and Android TV boxes for big-screen streaming sessions.",
    safetySummary: "AA Mods streaming release published with direct AA Mods link management and compatibility guidance.",
  },
  "youtube-premium-mod": {
    requirement: "Android 8.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Best on current Android devices with AA Mods Services support for smooth playback features.",
    safetySummary: "AA Mods curated playback build with verified service requirements and stable release packaging.",
  },
  "youtube-music-mod": {
    requirement: "Android 8.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Tuned for long listening sessions and daily playback on modern Android phones.",
    safetySummary: "AA Mods music build delivered through verified links and release-managed updates.",
  },
  "tiktok-mod": {
    requirement: "Android 6.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Works well on daily-driver Android devices for browsing, downloads, and creator tools.",
    safetySummary: "AA Mods social release with verified direct downloads and privacy-focused tuning.",
  },
  "grok-mod": {
    requirement: "Android 9.0+",
    architecture: "ARM64-v8a",
    contentRating: "Rated for 12+",
    supportSummary: "Built for newer Android devices that can handle long-context AI sessions and multi-agent tasks.",
    safetySummary: "AA Mods AI build with verified package routing and stable release notes for each update.",
  },
  "turbotel-mod": {
    requirement: "Android 5.0+",
    architecture: "ARM64-v8a / armeabi-v7a",
    contentRating: "Rated for 12+",
    supportSummary: "Works best on phones and tablets with broad Android compatibility for messaging power users.",
    safetySummary: "AA Mods communication release with verified links, current builds, and stable package management.",
  },
};

export function getAppFacts(slug: string): AppFacts {
  const normalized = slug.toLowerCase();
  const directMatch = APP_FACTS_BY_SLUG[normalized];
  if (directMatch) return directMatch;
  const fuzzyKey = Object.keys(APP_FACTS_BY_SLUG).find(
    (key) => key.toLowerCase() === normalized,
  );
  return fuzzyKey ? APP_FACTS_BY_SLUG[fuzzyKey] : DEFAULT_APP_FACTS;
}
