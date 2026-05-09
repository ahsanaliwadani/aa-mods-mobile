const MF_PATTERNS: RegExp[] = [
  /id="downloadButton"[^>]*href="([^"]+)"/i,
  /class="[^"]*popsok[^"]*"[^>]*href="([^"]+)"/i,
  /href="(https:\/\/download\d*\.mediafire\.com\/[^"?\s]+\.apk[^"]*?)"/i,
  /"direct_download_url"\s*:\s*"([^"]+)"/i,
  /data-href="(https:\/\/[^"]*\.apk[^"]*?)"/i,
];

const UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.137 Mobile Safari/537.36";

export async function resolveMediaFireLink(
  url: string,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();

    for (const pattern of MF_PATTERNS) {
      const m = html.match(pattern);
      if (m?.[1]) {
        const href = m[1].replace(/&amp;/g, "&");
        return href;
      }
    }

    const broad = html.match(
      /href="(https?:\/\/download[^"]*?\.apk(?:\?[^"]*)?)/i,
    );
    if (broad?.[1]) return broad[1].replace(/&amp;/g, "&");

    return null;
  } catch {
    return null;
  }
}

export function isMediaFireUrl(url: string): boolean {
  return url.toLowerCase().includes("mediafire.com");
}

export function isExternalHost(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes("mediafire.com") ||
    lower.includes("mega.nz") ||
    lower.includes("drive.google.com") ||
    lower.includes("dropbox.com") ||
    lower.includes("1drv.ms") ||
    lower.includes("onedrive.live.com")
  );
}

export function isDirectApkUrl(url: string): boolean {
  if (isExternalHost(url)) return false;
  const lower = url.toLowerCase();
  if (lower.endsWith(".apk")) return true;
  if (lower.includes("/download/") && lower.includes(".apk")) return true;
  if (lower.startsWith("https://download.")) return true;
  return false;
}
