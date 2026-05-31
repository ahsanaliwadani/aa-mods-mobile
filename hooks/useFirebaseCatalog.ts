import { useState, useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { ref, onValue, type DataSnapshot } from "firebase/database";
import { database, FIREBASE_CONFIG } from "@/lib/firebase";
import { logCatalogSynced, logCatalogError } from "@/lib/analytics";
import { startTrace } from "@/lib/firebasePerformance";
import { getNetworkStatus } from "@/lib/networkUtils";

const BASE_ICON_URL = "https://aa-mods.vercel.app";
const LOAD_TIMEOUT_MS = 12000;

type DownloadButton = {
  label: string;
  link: string;
  style: string;
};

export type StoreCatalogApp = {
  version: string;
  baseVersion: string;
  updateDate: { display: string; iso: string };
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

export type LiveStoreCatalogApp = StoreCatalogApp & {
  isNew: boolean;
  iconOverrideUri?: string;
  changelog?: string[];
  whatsNew?: string[];
  packageName?: string;
};

export type OfflineReason = "airplane" | "no-data" | "no-internet" | null;

function toArray<T>(val: unknown): T[] | undefined {
  if (val == null) return undefined;
  if (Array.isArray(val)) {
    const filtered = val.filter((v) => v != null);
    return filtered.length > 0 ? (filtered as T[]) : undefined;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return undefined;
    if (keys.every((k) => /^\d+$/.test(k))) {
      const arr = keys
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((k) => obj[k])
        .filter((v) => v != null);
      return arr.length > 0 ? (arr as T[]) : undefined;
    }
  }
  return undefined;
}

function isNewApp(isoDate: string): boolean {
  if (!isoDate) return false;
  try {
    const d = new Date(isoDate);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff;
  } catch {
    return false;
  }
}

function resolveIcon(data: Record<string, unknown>, fallback?: string): string | undefined {
  try {
    const iconPath = data.iconPath as string | undefined;
    if (iconPath) {
      return iconPath.startsWith("http") ? iconPath : `${BASE_ICON_URL}${iconPath}`;
    }
    return (data.iconImage as string) || fallback;
  } catch {
    return fallback;
  }
}

function resolveIconOverride(raw: Record<string, unknown>): string | undefined {
  try {
    const iconPath = raw.iconPath as string | undefined;
    if (iconPath) {
      return iconPath.startsWith("http") ? iconPath : `${BASE_ICON_URL}${iconPath}`;
    }
    const iconImage = raw.iconImage as string | undefined;
    if (iconImage && iconImage.startsWith("http")) return iconImage;
    return undefined;
  } catch {
    return undefined;
  }
}

function parseFirebaseApp(
  slug: string,
  raw: Record<string, unknown>,
): LiveStoreCatalogApp {
  try {
    const rawUpdateDate = raw.updateDate;
    const updateDateIsObj =
      rawUpdateDate != null &&
      typeof rawUpdateDate === "object" &&
      !Array.isArray(rawUpdateDate);
    const updateDateObj = updateDateIsObj
      ? (rawUpdateDate as Record<string, unknown>)
      : null;

    const isoDate =
      (raw.lastUpdated as string) ||
      (raw.updatedAt as string) ||
      (updateDateObj
        ? (updateDateObj.iso as string)
        : (rawUpdateDate as string)) ||
      "";
    const displayDate =
      (raw.displayDate as string) ||
      (updateDateObj ? (updateDateObj.display as string) : undefined) ||
      isoDate;

    const version = (raw.version as string) || "1.0";

    type DB = { label: string; link: string; style: string };
    const firebaseDownloadButtons = toArray<DB>(raw.downloadButtons);

    const directDownloadLink =
      (raw.directDownloadLink as string) ||
      (firebaseDownloadButtons ? undefined : undefined);
    const downloadLink = (raw.downloadLink as string) || undefined;

    return {
      slug,
      name: (raw.name as string) || slug,
      developer: (raw.developer as string) || "AA Mods",
      category: (raw.category as string) || "Utility Tools",
      version,
      baseVersion: (raw.baseVersion as string) || version,
      updateDate: { display: displayDate, iso: isoDate },
      rating: (raw.rating as string) || "4.8",
      downloads: (raw.downloads as string) || "1K+",
      subtitle: (raw.subtitle as string) || "",
      shortDescription:
        (raw.shortDescription as string) ||
        (raw.description as string) ||
        "",
      seoKeywords: (raw.seoKeywords as string) || "",
      gradient: (raw.gradient as string) || "from-slate-900 to-slate-700",
      iconType: (raw.iconType as string) || "default",
      iconImage: resolveIcon(raw),
      iconOverrideUri: resolveIconOverride(raw),
      directDownloadLink,
      downloadLink,
      downloadButtons: firebaseDownloadButtons ?? undefined,
      isNew: isNewApp(isoDate),
      changelog: toArray<string>(raw.changelog),
      whatsNew: toArray<string>(raw.whatsNew),
      packageName: (raw.packageName as string) || undefined,
    };
  } catch {
    return {
      slug,
      name: slug,
      developer: "AA Mods",
      category: "Utility Tools",
      version: "1.0",
      baseVersion: "1.0",
      updateDate: { display: "", iso: "" },
      rating: "4.8",
      downloads: "1K+",
      subtitle: "",
      shortDescription: "",
      seoKeywords: "",
      gradient: "from-slate-900 to-slate-700",
      iconType: "default",
      isNew: false,
    };
  }
}

function buildCatalog(
  firebaseApps: Record<string, unknown>,
): LiveStoreCatalogApp[] {
  const resultMap = new Map<string, LiveStoreCatalogApp>();

  for (const [slug, value] of Object.entries(firebaseApps)) {
    try {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const parsed = parseFirebaseApp(slug, value as Record<string, unknown>);
      resultMap.set(slug, parsed);
    } catch {
      // skip malformed entry
    }
  }

  return Array.from(resultMap.values()).sort((a, b) => {
    const aIso = typeof a.updateDate?.iso === "string" ? a.updateDate.iso : "";
    const bIso = typeof b.updateDate?.iso === "string" ? b.updateDate.iso : "";
    return bIso.localeCompare(aIso);
  });
}

function deriveCategories(apps: LiveStoreCatalogApp[]): string[] {
  try {
    const cats = Array.from(new Set(apps.map((a) => a.category))).sort();
    return ["All", ...cats];
  } catch {
    return ["All"];
  }
}

async function detectOfflineReason(): Promise<OfflineReason> {
  if (Platform.OS === "web") return null;
  try {
    const status = await getNetworkStatus();
    if (status.isAirplaneMode) return "airplane";
    if (!status.isConnected) return "no-data";
    return null;
  } catch {
    return "no-internet";
  }
}

export function useFirebaseCatalog() {
  const [apps, setApps] = useState<LiveStoreCatalogApp[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [offlineReason, setOfflineReason] = useState<OfflineReason>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fetchTick, setFetchTick] = useState(0);
  const isMounted = useRef(true);
  const catalogTrace = useRef(startTrace("catalog_load"));

  const refetch = useCallback(() => {
    setLoading(true);
    setConnected(false);
    setOfflineReason(null);
    setFetchTick((t) => t + 1);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    catalogTrace.current = startTrace("catalog_load");

    const controller = new AbortController();

    // Check real network first (fast — expo-network is synchronous-ish)
    // If truly offline, show the right message immediately without waiting
    let networkCheckDone = false;

    const doLoad = async () => {
      // Quick network check before even attempting the fetch
      if (Platform.OS !== "web") {
        try {
          const status = await getNetworkStatus();
          if (!status.isConnected) {
            if (!isMounted.current) return;
            const reason: OfflineReason = status.isAirplaneMode
              ? "airplane"
              : "no-data";
            setOfflineReason(reason);
            setConnected(false);
            setLoading(false);
            catalogTrace.current.stop({ source: "offline_" + reason });
            logCatalogError("offline_" + reason);
            return;
          }
        } catch {
          // ignore — fall through to fetch attempt
        }
      }
      networkCheckDone = true;

      const timeoutId = setTimeout(() => {
        controller.abort();
        if (isMounted.current) {
          // Double-check network on timeout before giving up
          detectOfflineReason().then((reason) => {
            if (!isMounted.current) return;
            setOfflineReason(reason ?? "no-internet");
            setLoading(false);
            catalogTrace.current.stop({ source: "timeout" });
            logCatalogError("load_timeout");
          }).catch(() => {
            if (!isMounted.current) return;
            setOfflineReason("no-internet");
            setLoading(false);
          });
        }
      }, LOAD_TIMEOUT_MS);

      const REST_URL = `${FIREBASE_CONFIG.databaseURL}/app_content/apps.json`;

      fetch(REST_URL, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: Record<string, unknown> | null) => {
          clearTimeout(timeoutId);
          if (!isMounted.current) return;
          try {
            const merged = data ? buildCatalog(data) : [];
            setApps(merged);
            setCategories(deriveCategories(merged));
            setConnected(true);
            setOfflineReason(null);
            setLastUpdated(new Date());
            catalogTrace.current.stop({
              app_count: String(merged.length),
              source: "firebase_rest",
            });
            logCatalogSynced(merged.length, 0, "firebase");
          } catch (parseError) {
            console.warn("[Firebase] Catalog parse error:", parseError);
            logCatalogError(
              parseError instanceof Error ? parseError.message : "parse_error",
            );
          } finally {
            if (isMounted.current) setLoading(false);
          }
        })
        .catch((error: Error) => {
          if (error.name === "AbortError") return; // handled by timeout
          clearTimeout(timeoutId);
          if (!isMounted.current) return;
          console.warn("[Firebase] Catalog load error:", error.message);
          // Check actual network state to give correct offline reason
          detectOfflineReason().then((reason) => {
            if (!isMounted.current) return;
            setOfflineReason(reason ?? "no-internet");
            setConnected(false);
            setLoading(false);
          }).catch(() => {
            if (!isMounted.current) return;
            setOfflineReason("no-internet");
            setConnected(false);
            setLoading(false);
          });
          catalogTrace.current.stop({ source: "error" });
          logCatalogError(error.message);
        });
    };

    doLoad();

    // Real-time listener for live updates after initial REST load settles
    let unsubscribe: (() => void) | undefined;
    const appsRef = ref(database, "app_content/apps");
    const liveTimer = setTimeout(() => {
      try {
        unsubscribe = onValue(
          appsRef,
          (snapshot: DataSnapshot) => {
            if (!isMounted.current) return;
            try {
              const data = snapshot.val() as Record<string, unknown> | null;
              const merged = data ? buildCatalog(data) : [];
              setApps(merged);
              setCategories(deriveCategories(merged));
              setConnected(true);
              setOfflineReason(null);
              setLastUpdated(new Date());
            } catch {}
          },
          () => {},
        );
      } catch {}
    }, 1000);

    return () => {
      isMounted.current = false;
      controller.abort();
      clearTimeout(liveTimer);
      try { unsubscribe?.(); } catch {}
    };
  }, [fetchTick]);

  const newCount = apps.filter((a) => a.isNew).length;

  return { apps, categories, loading, connected, offlineReason, lastUpdated, newCount, refetch };
}
