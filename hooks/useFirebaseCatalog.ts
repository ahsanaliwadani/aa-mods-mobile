import { useState, useEffect, useRef } from "react";
import { ref, onValue, type DataSnapshot } from "firebase/database";
import { database } from "@/lib/firebase";
import { storeApps, storeCategories as defaultCategories, type StoreCatalogApp } from "@/data/storeCatalog";
import { logCatalogSynced, logCatalogError } from "@/lib/analytics";
import { startTrace } from "@/lib/firebasePerformance";

const BASE_ICON_URL = "https://aa-mods.vercel.app";

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

export type LiveStoreCatalogApp = StoreCatalogApp & {
  isNew: boolean;
  iconOverrideUri?: string;
  changelog?: string[];
  whatsNew?: string[];
  packageName?: string;
};

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
  fallback?: StoreCatalogApp,
): LiveStoreCatalogApp {
  try {
    const rawUpdateDate = raw.updateDate;
    const updateDateIsObj = rawUpdateDate != null && typeof rawUpdateDate === "object" && !Array.isArray(rawUpdateDate);
    const updateDateObj = updateDateIsObj ? (rawUpdateDate as Record<string, unknown>) : null;

    const isoDate =
      (raw.lastUpdated as string) ||
      (raw.updatedAt as string) ||
      (updateDateObj ? (updateDateObj.iso as string) : (rawUpdateDate as string)) ||
      fallback?.updateDate?.iso ||
      "";
    const displayDate =
      (raw.displayDate as string) ||
      (updateDateObj ? (updateDateObj.display as string) : undefined) ||
      fallback?.updateDate?.display ||
      isoDate;
    const version = (raw.version as string) || fallback?.version || "1.0";

    type DownloadButton = { label: string; link: string; style: string };
    const firebaseDownloadButtons = toArray<DownloadButton>(raw.downloadButtons);
    const downloadButtons = firebaseDownloadButtons ?? fallback?.downloadButtons;

    // When Firebase explicitly provides downloadButtons, those ARE the source of truth.
    // Don't fall back to the local directDownloadLink (it may be outdated).
    const directDownloadLink = (raw.directDownloadLink as string) ||
      (firebaseDownloadButtons ? undefined : fallback?.directDownloadLink);
    const downloadLink = (raw.downloadLink as string) ||
      (firebaseDownloadButtons ? undefined : fallback?.downloadLink);

    return {
      slug,
      name: (raw.name as string) || fallback?.name || slug,
      developer: (raw.developer as string) || fallback?.developer || "AA Mods",
      category: (raw.category as string) || fallback?.category || "Utility Tools",
      version,
      baseVersion: (raw.baseVersion as string) || fallback?.baseVersion || version,
      updateDate: { display: displayDate, iso: isoDate },
      rating: (raw.rating as string) || fallback?.rating || "4.8",
      downloads: (raw.downloads as string) || fallback?.downloads || "1K+",
      subtitle: (raw.subtitle as string) || fallback?.subtitle || "",
      shortDescription:
        (raw.shortDescription as string) ||
        (raw.description as string) ||
        fallback?.shortDescription ||
        "",
      seoKeywords: (raw.seoKeywords as string) || fallback?.seoKeywords || "",
      gradient: fallback?.gradient || "from-slate-900 to-slate-700",
      iconType: fallback?.iconType || "default",
      iconImage: resolveIcon(raw, fallback?.iconImage),
      iconOverrideUri: resolveIconOverride(raw),
      directDownloadLink,
      downloadLink,
      downloadButtons,
      isNew: isNewApp(isoDate),
      changelog: toArray<string>(raw.changelog),
      whatsNew: toArray<string>(raw.whatsNew),
      packageName: (raw.packageName as string) || undefined,
    };
  } catch {
    return {
      ...(fallback ?? {
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
        iconType: "default" as const,
      }),
      isNew: false,
    };
  }
}

function buildCatalog(firebaseApps: Record<string, unknown> | null): LiveStoreCatalogApp[] {
  try {
    const fallbackMap = new Map(storeApps.map((a) => [a.slug, a]));
    const resultMap = new Map<string, LiveStoreCatalogApp>(
      storeApps.map((a) => [a.slug, { ...a, isNew: isNewApp(a.updateDate.iso) }]),
    );

    if (firebaseApps) {
      for (const [slug, value] of Object.entries(firebaseApps)) {
        try {
          if (!value || typeof value !== "object" || Array.isArray(value)) continue;
          const parsed = parseFirebaseApp(slug, value as Record<string, unknown>, fallbackMap.get(slug));
          resultMap.set(slug, parsed);
        } catch {
          // skip malformed entry
        }
      }
    }

    return Array.from(resultMap.values()).sort((a, b) => {
      const aIso = typeof a.updateDate?.iso === "string" ? a.updateDate.iso : "";
      const bIso = typeof b.updateDate?.iso === "string" ? b.updateDate.iso : "";
      return bIso.localeCompare(aIso);
    });
  } catch {
    return storeApps.map((a) => ({ ...a, isNew: isNewApp(a.updateDate.iso) }));
  }
}

function deriveCategories(apps: LiveStoreCatalogApp[]): string[] {
  try {
    const cats = Array.from(new Set(apps.map((a) => a.category))).sort();
    return ["All", ...cats];
  } catch {
    return defaultCategories;
  }
}

export function useFirebaseCatalog() {
  const [apps, setApps] = useState<LiveStoreCatalogApp[]>(() =>
    storeApps.map((a) => ({ ...a, isNew: isNewApp(a.updateDate.iso) })),
  );
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMounted = useRef(true);
  const catalogTrace = useRef(startTrace("catalog_load"));
  const hasFirstLoad = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    catalogTrace.current = startTrace("catalog_load");

    let unsubscribe: (() => void) | undefined;

    try {
      const appsRef = ref(database, "app_content/apps");

      unsubscribe = onValue(
        appsRef,
        (snapshot: DataSnapshot) => {
          if (!isMounted.current) return;
          try {
            const data = snapshot.val() as Record<string, unknown> | null;
            const merged = buildCatalog(data);
            setApps(merged);
            setCategories(deriveCategories(merged));
            setLoading(false);
            setConnected(true);
            setLastUpdated(new Date());

            if (!hasFirstLoad.current) {
              hasFirstLoad.current = true;
              catalogTrace.current.stop({ app_count: String(merged.length), source: "firebase" });
              logCatalogSynced(merged.length, 0, "firebase");
            }
          } catch (parseError) {
            console.warn("[Firebase] Catalog parse error:", parseError);
            if (isMounted.current) {
              setLoading(false);
              logCatalogError(parseError instanceof Error ? parseError.message : "parse_error");
            }
          }
        },
        (error) => {
          console.warn("[Firebase] Catalog listener error:", error.message);
          if (isMounted.current) {
            setLoading(false);
            setConnected(false);
            if (!hasFirstLoad.current) {
              hasFirstLoad.current = true;
              catalogTrace.current.stop({ source: "error" });
              logCatalogSynced(storeApps.length, 0, "cache");
            }
            logCatalogError(error.message);
          }
        },
      );
    } catch (setupError) {
      console.warn("[Firebase] Catalog setup error:", setupError);
      if (isMounted.current) {
        setLoading(false);
        setConnected(false);
        logCatalogError(setupError instanceof Error ? setupError.message : "setup_error");
      }
    }

    return () => {
      isMounted.current = false;
      try {
        unsubscribe?.();
      } catch {}
    };
  }, []);

  const newCount = apps.filter((a) => a.isNew).length;

  return { apps, categories, loading, connected, lastUpdated, newCount };
}
