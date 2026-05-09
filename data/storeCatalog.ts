const BASE_ICON_URL = "https://aa-mods.vercel.app";

type DownloadButton = {
  label: string;
  link: string;
  style: string;
};

export type StoreCatalogApp = {
  version: string;
  baseVersion: string;
  updateDate: {
    display: string;
    iso: string;
  };
  directDownloadLink?: string;
  downloadLink?: string;
  downloadButtons?: readonly DownloadButton[];
  slug: string;
  name: string;
  developer: string;
  category: string;
  rating: string;
  downloads: string;
  iconType: string;
  iconImage?: string;
  gradient: string;
  subtitle: string;
  shortDescription: string;
  seoKeywords: string;
};

export const STORE_LINKS = {
  aaModsServices: "https://ahsanali.short.gy/services-ahsan",
  telegramChannel: "https://t.me/AA_ModsOfficial",
};

export const storeApps: StoreCatalogApp[] = [
  {
    version: "v1.0",
    baseVersion: "1.0",
    updateDate: { display: "01 April 2026", iso: "2026-04-01" },
    directDownloadLink: "https://www.mediafire.com/file/ns5vxwxp903saix/AA_Mods_Store.apk/file",
    slug: "aa-mods-store",
    name: "AA Mods Store",
    developer: "AA Mods",
    category: "Utility Tools",
    rating: "4.9",
    downloads: "1M+",
    iconType: "whatsapp",
    iconImage: `${BASE_ICON_URL}/logo.png`,
    gradient: "from-slate-900 to-emerald-700",
    subtitle: "Safe & stable Android MOD APK platform",
    shortDescription:
      "AA Mods is a structured Android MOD APK store focused on secure downloads, stable builds, and transparent version tracking.",
    seoKeywords:
      "AA Mods, best mod apk store 2026, safe mod apk download, stable android mod apps, premium unlocked apps",
  },
  {
    version: "5.1",
    baseVersion: "2.26.7.74",
    updateDate: { display: "20 April 2026", iso: "2026-04-20" },
    directDownloadLink:
      "https://www.mediafire.com/file/0v2dkbswcreqybh/AAWhatsApp_V5.0%2528com.aawhatsapp%2529.apk/file",
    downloadButtons: [
      {
        label: "(com.aawhatsapp)",
        link: "https://www.mediafire.com/file/keidub2so0f9539/AAWhatsApp_V5.1%2528com.aawhatsapp%2529.apk/file",
        style: "primary",
      },
      {
        label: "(com.gbwhatsapp)",
        link: "https://www.mediafire.com/file/o7cg3sf6dotlm4q/AAWhatsApp_V5.1%2528com.gbwhatsapp%2529.apk/file",
        style: "primary",
      },
      {
        label: "(com.universe.messenger)",
        link: "https://www.mediafire.com/file/400439y1ar3pj7u/AAWhatsApp_V5.1%2528com.universe.messenger%2529.apk/file",
        style: "primary",
      },
    ],
    slug: "aa-whatsapp",
    name: "AA WhatsApp",
    developer: "AA Mods",
    category: "Communication",
    rating: "4.9",
    downloads: "10M+",
    iconType: "whatsapp",
    iconImage: `${BASE_ICON_URL}/app-icons/aa-whatsapp.webp`,
    gradient: "from-emerald-500 to-teal-500",
    subtitle: "Secure messaging with anti-ban architecture",
    shortDescription:
      "Privacy-focused WhatsApp experience with anti-ban, better media controls, and stable day-to-day performance.",
    seoKeywords:
      "AA WhatsApp, AA WhatsApp APK, Anti-Ban WhatsApp, WhatsApp mod 2026, privacy WhatsApp mod, AA Mods, AAWhatsApp, AAWhatsApp APK, privacy WhatsApp mod, secure WhatsApp mod, hide online status WhatsApp, anti-revoke WhatsApp, WhatsApp mod no permissions, GBWhatsApp alternative, FMWhatsApp alternative",
  },
  {
    version: "1.0",
    baseVersion: "480.0.0.51.78",
    updateDate: { display: "11 April 2026", iso: "2026-04-11" },
    directDownloadLink:
      "https://www.mediafire.com/file/7ssn9zaipssopcy/AAInsta_V1.0_by_AA_Mods.apk/file",
    slug: "aa-insta",
    name: "AA Insta",
    developer: "AA Mods",
    category: "Social Media",
    rating: "4.9",
    downloads: "50M+",
    iconType: "social",
    iconImage: `${BASE_ICON_URL}/app-icons/aa-insta.webp`,
    gradient: "from-fuchsia-600 via-pink-500 to-orange-500",
    subtitle:
      "Best Instagram Mod APK with No Ads, Ghost Mode, HD Downloads & Full Customization",
    shortDescription:
      "AAInsta APK lets you use Instagram without ads, hide your online status, download reels, stories, and videos in HD quality, and customize the entire app with themes, fonts, and advanced privacy features.",
    seoKeywords:
      "AAInsta Mod APK download latest version, Instagram mod APK no ads, download Instagram reels APK, hide seen status Instagram mod, Instagram ghost mode APK, AAInsta latest version 2026, Instagram downloader APK, Instagram customization app",
  },
  {
    version: "7.15.0.2",
    baseVersion: "7.15.0.2",
    updateDate: { display: "04 April 2026", iso: "2026-04-04" },
    directDownloadLink:
      "https://www.mediafire.com/file/7fpty5b9f934ppp/CamScanner_Premium_v7.15.0.2_by_AA_Mods.apk/file",
    slug: "camscanner-mod",
    name: "CamScanner Mod",
    developer: "AA Mods",
    category: "Productivity",
    rating: "4.9",
    downloads: "10M+",
    iconType: "camscanner",
    iconImage: `${BASE_ICON_URL}/app-icons/cam-scanner.webp`,
    gradient: "",
    subtitle:
      "The Ultimate Mobile Document Scanner for Professionals with all premium features unlocked.",
    shortDescription:
      "Scan documents into high-quality PDFs, use OCR text recognition, edit and sign files, sync across devices, and enjoy unlimited scans. No watermarks, no ads.",
    seoKeywords:
      "CamScanner Mod, Productivity, AA Mods, APK download, Android mod, mod apk, CamScanner Mod APK, document scanner app, PDF scanner Android, OCR text recognition, CamScanner premium unlocked, scan documents to PDF, mobile scanner app, digital document management, CamScanner no watermark, HD document scanning",
  },
  {
    version: "1.9.7",
    baseVersion: "1.9.7",
    updateDate: { display: "03 April 2026", iso: "2026-04-03" },
    directDownloadLink:
      "https://www.mediafire.com/file/nl7ersyjy1me5lx/SuperVPN_Pro_v1.9.7_by_AA_Mods.apk/file",
    slug: "super-vpn-pro",
    name: "Super VPN Pro",
    developer: "AA Mods",
    category: "Utility Tools",
    rating: "4.9",
    downloads: "7M+",
    iconType: "supervpn",
    iconImage: `${BASE_ICON_URL}/app-icons/supervpn.webp`,
    gradient: "",
    subtitle: "Unlimited, Fast & Hassle-Free VPN Protection with all premium features unlocked.",
    shortDescription:
      "Enjoy unlimited bandwidth, lightning-fast speeds, one-tap connection, and unrestricted access to global content without any sign-up or subscription.",
    seoKeywords:
      "Super VPN Pro, AA Mods, APK download, Android mod, mod apk, Super VPN Pro Mod APK, unlimited VPN free, fast VPN no subscription, one-tap VPN connection, bypass geo-restrictions, hide IP address, encrypted browsing, no sign-up VPN, VPN for streaming, privacy protection app",
  },
  {
    version: "12.6.3",
    baseVersion: "12.6.3",
    updateDate: { display: "02 April 2026", iso: "2026-04-02" },
    directDownloadLink:
      "https://www.mediafire.com/file/ua8gvpslltugecd/Telegram_v.12.6.3_by_AA_Mods.apk/file",
    downloadButtons: [
      {
        label: "Download APK Now (Clone)",
        link: "https://www.mediafire.com/file/k9azhgiiqe93pst/Telegram_V.12.6.3_Clone_by_AA_Mods.apk/file",
        style: "primary",
      },
    ],
    slug: "telegram-mod",
    name: "Telegram Mod",
    developer: "AA Mods",
    category: "Communication",
    rating: "4.8",
    downloads: "10M+",
    iconType: "Telegram",
    iconImage: `${BASE_ICON_URL}/app-icons/telegram.webp`,
    gradient: "",
    subtitle: "The Ultimate Messaging Experience with Premium Features Unlocked.",
    shortDescription:
      "Enjoy end-to-end encryption, massive group chats up to 200,000 members, fast file sharing, anonymous story viewing, and anti-delete messages.",
    seoKeywords:
      "Telegram Mod, Communication, AA Mods, APK download, Android mod, mod apk, Telegram Mod APK, Telegram premium unlocked, encrypted messaging app, anonymous story viewing, anti-delete messages, fast file sharing, Telegram download speed boost",
  },
  {
    version: "12.4.2",
    baseVersion: "12.4.2 Premium",
    updateDate: { display: "01 April 2026", iso: "2026-04-01" },
    directDownloadLink:
      "https://www.mediafire.com/file/u1nmw4t48c0fz0o/TurboTel_V12.4.2_by_AA_Mods.apk/file",
    slug: "turbotel-mod",
    name: "TurboTel Pro Mod",
    developer: "AA Mods",
    category: "Communication",
    rating: "4.9",
    downloads: "20M+",
    iconType: "message",
    iconImage: `${BASE_ICON_URL}/app-icons/turbotel.webp`,
    gradient: "from-blue-950 via-sky-700 to-cyan-500",
    subtitle: "TurboTel Mod APK with premium Telegram features fully unlocked.",
    shortDescription:
      "Enjoy encrypted chats, unlimited file sharing, massive groups up to 200,000 members, multi-device support, and a completely ad-free messaging experience.",
    seoKeywords:
      "TurboTel Mod APK, TurboTel Pro, Telegram mod, enhanced Telegram client, unlimited file sharing Telegram, encrypted messaging app, parallel accounts Telegram, Telegram groups 200k members, Telegram bots API, multi-device sync",
  },
  {
    version: "1.2026.069",
    baseVersion: "1.2026.069",
    updateDate: { display: "March 27, 2026", iso: "2026-03-27" },
    directDownloadLink:
      "https://www.mediafire.com/file/y5a9mnaxde8y467/ChatGPT_1.2026.069_pro_by_AA_Mods.apk/file",
    slug: "chatgpt-pro",
    name: "ChatGPT Pro",
    developer: "AA Mods",
    category: "AI Tools",
    rating: "4.9",
    downloads: "10M+",
    iconType: "chatgpt",
    iconImage: `${BASE_ICON_URL}/app-icons/chatgpt.webp`,
    gradient: "from-slate-900 to-cyan-500",
    subtitle: "The Ultimate AI Assistant for Your Pocket with all premium features unlocked.",
    shortDescription:
      "Generate images from text, enjoy advanced voice conversations, transform existing photos, and get creative inspiration. Complete guide to the smartest AI assistant.",
    seoKeywords:
      "ChatGPT Pro, ChatGPT Pro APK, ChatGPT Pro download, AI Tools, AA Mods,ChatGPT Pro Mod APK, ChatGPT premium unlocked, AI image generator, advanced voice mode AI, GPT-4 mod, AI assistant app, ChatGPT with image generation, real-time AI conversations, creative AI tools",
  },
  {
    version: "V1.25",
    baseVersion: "2.25.29.77",
    updateDate: { display: "March 17, 2026", iso: "2026-03-17" },
    directDownloadLink:
      "https://www.mediafire.com/file/n6fycjn64tns95w/AA_Business_WA_V1.25.apk/file",
    slug: "aa-business",
    name: "AA Business",
    developer: "AA Mods",
    category: "Business",
    rating: "4.8",
    downloads: "5M+",
    iconType: "business",
    iconImage: `${BASE_ICON_URL}/app-icons/aa-business.webp`,
    gradient: "from-blue-500 to-cyan-500",
    subtitle: "Business messaging automation and operations toolkit",
    shortDescription:
      "Professional communication app with scheduling, automation, and customer support workflows.",
    seoKeywords:
      "AA Business APK, WhatsApp business mod, business broadcast app, customer support messaging, AA Mods",
  },
  {
    version: "1.1.05-release.03",
    baseVersion: "v1.1.05-release.03",
    updateDate: { display: "March 10, 2026", iso: "2026-03-10" },
    directDownloadLink: "https://ahsanali.short.gy/grok-ahsan",
    slug: "grok-mod",
    name: "Grok - AI Assistant",
    developer: "AA Mods",
    category: "AI Tools",
    rating: "4.9",
    downloads: "5M+",
    iconType: "music",
    iconImage: `${BASE_ICON_URL}/app-icons/grok.webp`,
    gradient: "from-slate-900 via-blue-700 to-cyan-500",
    subtitle: "Multi-agent AI assistant with premium features fully unlocked",
    shortDescription:
      "Grok Mod APK v1.1.09 unlocks premium tools, multi-agent reasoning, real-time X integration, and long-context AI workflows.",
    seoKeywords:
      "Grok Mod APK, xAI Grok, Grok 4.20 features, multi-agent AI, Grok premium unlocked, Grok reasoning model, Elon Musk AI, AI chatbot mod",
  },
  {
    version: "3.0.12.0205.03",
    baseVersion: "3.0.12.0205.03 VIP",
    updateDate: { display: "March 10, 2026", iso: "2026-03-10" },
    directDownloadLink: "https://ahsanali.short.gy/moviebox-ahsan",
    slug: "moviebox-Mods",
    name: "MovieBox Pro Mod",
    developer: "AA Mods",
    category: "Streaming",
    rating: "4.8",
    downloads: "50M+",
    iconType: "video",
    iconImage: `${BASE_ICON_URL}/app-icons/moviebox.webp`,
    gradient: "from-neutral-950 via-purple-700 to-indigo-500",
    subtitle: "MovieBox Mod APK with VIP features unlocked for Asian dramas.",
    shortDescription:
      "Stream unlimited Asian dramas, K-Dramas, Bollywood movies, and Thai series in HD. VIP unlocked, no ads, offline viewing, and Android TV support.",
    seoKeywords:
      "MovieBox Mod APK, MovieBox Pro MOD APK, Asian drama streaming app, K-Drama app free, MovieBox VIP unlocked, MovieBox Android TV, download Asian movies free, MovieBox offline viewing, MovieBox no ads, MovieBox premium unlocked",
  },
  {
    version: "9.55.0",
    baseVersion: "9.55.0 Stable",
    updateDate: { display: "March 9, 2026", iso: "2026-03-09" },
    directDownloadLink: "https://ahsanali.short.gy/netflix-ahsan",
    slug: "netflix-Mods",
    name: "Netflix Premium Mod",
    developer: "AA Mods",
    category: "Streaming",
    rating: "4.8",
    downloads: "1B+",
    iconType: "music",
    iconImage: `${BASE_ICON_URL}/app-icons/netflix.webp`,
    gradient: "from-neutral-950 via-red-700 to-red-500",
    subtitle: "Netflix Mod APK with all premium features unlocked.",
    shortDescription:
      "Netflix Mod APK with all premium features unlocked. Watch 4K Ultra HD movies and TV shows free. No login required. No ads. Unlimited downloads. Multi-language subtitles. Works on all Android devices 6.0+.",
    seoKeywords:
      "Netflix Mod APK, Netflix Premium Mod APK, Netflix Mod APK download, Netflix 4K Mod APK, Netflix no subscription mod, Netflix ad-free APK, Netflix region unlock APK, Netflix offline download mod, Netflix no login required, Netflix premium features unlocked",
  },
  {
    version: "5.1904",
    baseVersion: "5.1904 Stable",
    updateDate: { display: "March 9, 2026", iso: "2026-03-09" },
    directDownloadLink: "https://ahsanali.short.gy/vidmate-ahsan",
    slug: "vidmate-Mods",
    name: "VidMate Premium Mod",
    developer: "AA Mods",
    category: "Video Players & Editors",
    rating: "4.9",
    downloads: "500M+",
    iconType: "download",
    iconImage: `${BASE_ICON_URL}/app-icons/vidmate.webp`,
    gradient: "from-neutral-950 via-red-600 to-orange-500",
    subtitle: "VidMate Mod APK with all premium features unlocked and no ads.",
    shortDescription:
      "VidMate Mod APK premium unlocked. Download 4K videos from 1000+ sites, convert to MP3, and save WhatsApp/Instagram statuses with no watermarks and zero ads.",
    seoKeywords:
      "VidMate Mod APK, VidMate premium unlocked, video downloader app, 4K video downloader, MP3 converter, status saver, TikTok video download no watermark, YouTube downloader, music downloader app",
  },
  {
    version: "30.5.0",
    baseVersion: "v30.5.0 Stable",
    updateDate: { display: "March 1, 2026", iso: "2026-03-01" },
    directDownloadLink: "https://ahsanali.short.gy/picsart-ahsan",
    slug: "picsart-mod",
    name: "Picsart Mod APK",
    developer: "AA Mods",
    category: "Photography",
    rating: "4.9",
    downloads: "50M+",
    iconType: "music",
    iconImage: `${BASE_ICON_URL}/app-icons/picsart.webp`,
    gradient: "from-fuchsia-500 via-purple-500 to-indigo-600",
    subtitle: "Premium AI photo editing unlocked with no ads and full privacy controls",
    shortDescription:
      "Unlock Picsart premium tools, AI generation, bulk editing, and pro exports with no ads, no watermarks, and optimized performance.",
    seoKeywords:
      "Picsart Mod APK, Picsart premium unlocked, AI photo editor, background removal tool, bulk image editing, AI image generator, Picsart features, photo editing mod, graphic design app",
  },
  {
    version: "17.4.0",
    baseVersion: "v17.4.0 Stable",
    updateDate: { display: "February 25, 2026", iso: "2026-02-25" },
    directDownloadLink: "https://ahsanali.short.gy/capcut-ahsan",
    slug: "capcut-pro",
    name: "CapCut Pro",
    developer: "AA Mods",
    category: "Video Players & Editors",
    rating: "4.0",
    downloads: "50M+",
    iconType: "capcut",
    iconImage: `${BASE_ICON_URL}/app-icons/capcut-pro.webp`,
    gradient: "from-violet-500 to-purple-500",
    subtitle: "Premium mobile editing for creators",
    shortDescription:
      "CapCut Pro APK unlocks every premium template, AI effect, sticker pack, filter, and auto-caption tool — plus clean 4K watermark-free export for every project, with no subscription required.",
    seoKeywords:
      "CapCut Pro APK, CapCut premium unlocked, no watermark export, AI video editing, AA Mods",
  },
  {
    version: "43.9.1",
    baseVersion: "43.9.1 stable",
    updateDate: { display: "February 23, 2026", iso: "2026-02-23" },
    directDownloadLink: "https://ahsanali.short.gy/tiktok-ahsan",
    slug: "tiktok-mod",
    name: "TikTok Mod APK",
    developer: "AA Mods",
    category: "Social Media",
    rating: "4.8",
    downloads: "25M+",
    iconType: "music",
    iconImage: `${BASE_ICON_URL}/app-icons/tiktok.webp`,
    gradient: "from-pink-500 via-rose-500 to-slate-900",
    subtitle: "Ad-free TikTok with no-watermark downloads and regional freedom",
    shortDescription:
      "Unlock watermark-free downloads, ad-free browsing, privacy hardening, and advanced content controls.",
    seoKeywords:
      "TikTok Mod APK, TikTok mod features, no watermark TikTok download, ad-free TikTok, TikTok region unlock, TikTok privacy, TikTok plugin, download TikTok videos, TikTok troubleshooting",
  },
  {
    version: "8.45.32",
    baseVersion: "8.45.32 stable",
    updateDate: { display: "February 20, 2026", iso: "2026-02-20" },
    directDownloadLink: "https://ahsanali.short.gy/aa-music-premium",
    slug: "youtube-music-mod",
    name: "YouTube Music Mod",
    developer: "AA Mods",
    category: "Music & Audio",
    rating: "4.5",
    downloads: "15M+",
    iconType: "youtubeMusic",
    iconImage: `${BASE_ICON_URL}/app-icons/youtube-music.webp`,
    gradient: "from-fuchsia-500 to-pink-500",
    subtitle: "Premium listening with playback freedom",
    shortDescription:
      "YouTube Music Mod APK unlocks ad-free listening, background playback, offline downloads, and lossless audio quality — all Premium features without paying a subscription.",
    seoKeywords:
      "YouTube Music Mod APK, background music playback, high quality audio unlock, music mod app, AA Mods",
  },
  {
    version: "20.45.39",
    baseVersion: "20.45.39 stable",
    updateDate: { display: "February 17, 2026", iso: "2026-02-17" },
    directDownloadLink: "https://ahsanali.short.gy/youtube-ahsan",
    slug: "youtube-premium-mod",
    name: "YouTube Premium Mod",
    developer: "AA Mods",
    category: "Video",
    rating: "4.5",
    downloads: "30M+",
    iconType: "youtube",
    iconImage: `${BASE_ICON_URL}/app-icons/youtube-premium.webp`,
    gradient: "from-red-500 to-rose-500",
    subtitle: "Enhanced playback controls for video streaming",
    shortDescription:
      "YouTube Premium Mod APK delivers ad-free videos, background playback, offline downloads, SponsorBlock sponsor-skipping, and 4K quality — everything YouTube Premium offers at zero cost.",
    seoKeywords:
      "YouTube Premium Mod APK, background playback mod, SponsorBlock APK, ad-free video app, AA Mods",
  },
  {
    version: "v3.7.1260",
    baseVersion: "3.7.1260.202519018",
    updateDate: { display: "February 15, 2026", iso: "2026-02-15" },
    directDownloadLink: "https://ahsanali.short.gy/remini-ahsan",
    slug: "remini-mod",
    name: "Remini Mod",
    developer: "AA Mods",
    category: "Photography",
    rating: "4.6",
    downloads: "20M+",
    iconType: "remini",
    iconImage: `${BASE_ICON_URL}/app-icons/remini.webp`,
    gradient: "from-orange-500 to-rose-500",
    subtitle: "AI photo enhancement and restoration",
    shortDescription:
      "Remini Mod APK gives you unlimited AI photo enhancement, portrait restoration, HD upscaling, and old photo revival — all premium tools with no credit limits, no watermarks, and no subscription.",
    seoKeywords:
      "Remini Mod APK, AI photo enhancement, portrait restore app, premium photo tools, AA Mods",
  },
];

export function getStoreApp(slug: string): StoreCatalogApp | undefined {
  const normalized = slug.toLowerCase();
  return storeApps.find((app) => app.slug.toLowerCase() === normalized);
}

export const storeCategories: string[] = [
  "AI Tools",
  "All",
  "Business",
  "Communication",
  "Music & Audio",
  "Photography",
  "Productivity",
  "Social Media",
  "Streaming",
  "Utility Tools",
  "Video",
  "Video Players & Editors",
];
