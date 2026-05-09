const appIconMap: Record<string, number> = {
  "aa-mods-store": require("../assets/images/icon.png") as number,
  "aa-whatsapp": require("../assets/icons/aa-whatsapp.webp") as number,
  "aa-insta": require("../assets/icons/aa-insta.webp") as number,
  "aa-business": require("../assets/icons/aa-business.webp") as number,
  "turbotel-mod": require("../assets/icons/turbotel.webp") as number,
  "chatgpt-pro": require("../assets/icons/chatgpt.webp") as number,
  "grok-mod": require("../assets/icons/grok.webp") as number,
  "moviebox-Mods": require("../assets/icons/moviebox.webp") as number,
  "netflix-Mods": require("../assets/icons/netflix.webp") as number,
  "picsart-mod": require("../assets/icons/picsart.webp") as number,
  "capcut-pro": require("../assets/icons/capcut-pro.webp") as number,
  "tiktok-mod": require("../assets/icons/tiktok.webp") as number,
  "youtube-music-mod": require("../assets/icons/youtube-music.webp") as number,
  "youtube-premium-mod": require("../assets/icons/youtube-premium.webp") as number,
  "vidmate-Mods": require("../assets/icons/vidmate.webp") as number,
  "remini-mod": require("../assets/icons/remini.webp") as number,
};

export function getLocalIcon(slug: string): number | undefined {
  return appIconMap[slug];
}
