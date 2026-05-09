const UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.5615.137 Mobile Safari/537.36";

function extractMediaFireKey(url: string): string | null {
  const patterns = [
    /mediafire\.com\/file\/([a-zA-Z0-9]+)/i,
    /mediafire\.com\/download\/([a-zA-Z0-9]+)/i,
    /mediafire\.com\/view\/([a-zA-Z0-9]+)/i,
    /mediafire\.com\/\?([a-zA-Z0-9]+)/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function resolveViaApi(
  quickKey: string,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const apiUrl = `https://www.mediafire.com/api/1.5/file/get_links.php?quick_key=${quickKey}&link_type=download_browser&response_format=json`;
    const res = await fetch(apiUrl, {
      signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      response?: { result?: string; links?: Array<{ download_browser?: string }> };
    };
    const link = json?.response?.links?.[0]?.download_browser ?? null;
    if (link && link.includes("mediafire.com")) return link;
    return null;
  } catch {
    return null;
  }
}

const MF_HTML_PATTERNS: RegExp[] = [
  /id="downloadButton"[^>]*href="([^"]+)"/i,
  /class="[^"]*popsok[^"]*"[^>]*href="([^"]+)"/i,
  /href="(https:\/\/download\d*\.mediafire\.com\/[^"?\s]+\.apk[^"]*?)"/i,
  /"direct_download_url"\s*:\s*"([^"]+)"/i,
  /data-href="(https:\/\/[^"]*\.apk[^"]*?)"/i,
  /"download_url"\s*:\s*"([^"]+)"/i,
  /window\.location\s*=\s*['"]([^'"]+mediafire\.com[^'"]+)['"]/i,
];

async function resolveViaHtml(
  url: string,
  signal: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.mediafire.com/",
        "Cache-Control": "no-cache",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    for (const pattern of MF_HTML_PATTERNS) {
      const m = html.match(pattern);
      if (m?.[1]) {
        const href = m[1].replace(/&amp;/g, "&");
        if (href.startsWith("http")) return href;
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

export async function resolveMediaFireLink(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const { signal } = controller;

  try {
    const key = extractMediaFireKey(url);

    if (key) {
      const apiResult = await resolveViaApi(key, signal);
      if (apiResult) {
        clearTimeout(timeout);
        return apiResult;
      }
    }

    const htmlResult = await resolveViaHtml(url, signal);
    if (htmlResult) {
      clearTimeout(timeout);
      return htmlResult;
    }

    if (key) {
      const directUrl = `https://www.mediafire.com/download/${key}`;
      const headRes = await fetch(directUrl, {
        method: "HEAD",
        signal,
        headers: { "User-Agent": UA },
        redirect: "follow",
      }).catch(() => null);
      if (headRes && headRes.ok) {
        const finalUrl = headRes.url;
        if (finalUrl && finalUrl !== directUrl) {
          clearTimeout(timeout);
          return finalUrl;
        }
      }
    }

    clearTimeout(timeout);
    return null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export function isMediaFireUrl(url: string): boolean {
  return url.toLowerCase().includes("mediafire.com");
}

export function isMediaFireCdnUrl(url: string): boolean {
  return /^https?:\/\/download\d*\.mediafire\.com\//i.test(url);
}

export function isExternalHost(url: string): boolean {
  const lower = url.toLowerCase();
  if (isMediaFireCdnUrl(url)) return false;
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
  if (isMediaFireCdnUrl(url)) return true;
  if (isExternalHost(url)) return false;
  const lower = url.toLowerCase();
  if (lower.endsWith(".apk")) return true;
  if (lower.includes("/download/") && lower.includes(".apk")) return true;
  if (lower.startsWith("https://download.")) return true;
  return false;
}
