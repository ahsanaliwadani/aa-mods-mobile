import { useState, useEffect, useRef } from "react";
import { ref, onValue, type DataSnapshot } from "firebase/database";
import { database } from "@/lib/firebase";
import { storeApps, storeCategories as defaultCategories, type StoreCatalogApp } from "@/data/storeCatalog";

const BASE_ICON_URL = "https://aa-mods.replit.app";

export type LiveStoreCatalogApp = StoreCatalogApp & {
  isNew: boolean;
  changelog?: string[];
  whatsNew?: string[];
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

function parseFirebaseApp(
  slug: string,
  raw: Record<string, unknown>,
  fallback?: StoreCatalogApp,
): LiveStoreCatalogApp {
  try {
    const isoDate = (raw.lastUpdated as string) || (raw.updateDate as string) || fallback?.updateDate?.iso || "";
    const displayDate = (raw.displayDate as string) || fallback?.updateDate?.display || isoDate;
    const version = (raw.version as string) || fallback?.version || "1.0";

    const downloadButtons = Array.isArray(raw.downloadButtons)
      ? (raw.downloadButtons as StoreCatalogApp["downloadButtons"])
      : fallback?.downloadButtons;

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
      shortDescription: (raw.shortDescription as string) || fallback?.shortDescription || "",
      seoKeywords: (raw.seoKeywords as string) || fallback?.seoKeywords || "",
      gradient: fallback?.gradient || "from-slate-900 to-slate-700",
      iconType: fallback?.iconType || "default",
      iconImage: resolveIcon(raw, fallback?.iconImage),
      directDownloadLink: (raw.directDownloadLink as string) || fallback?.directDownloadLink,
      downloadLink: (raw.downloadLink as string) || fallback?.downloadLink,
      downloadButtons,
      isNew: isNewApp(isoDate),
      changelog: Array.isArray(raw.changelog) ? (raw.changelog as string[]) : undefined,
      whatsNew: Array.isArray(raw.whatsNew) ? (raw.whatsNew as string[]) : undefined,
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

  useEffect(() => {
    isMounted.current = true;

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
          } catch (parseError) {
            console.warn("[Firebase] Catalog parse error:", parseError);
            if (isMounted.current) {
              setLoading(false);
            }
          }
        },
        (error) => {
          console.warn("[Firebase] Catalog listener error:", error.message);
          if (isMounted.current) {
            setLoading(false);
            setConnected(false);
          }
        },
      );
    } catch (setupError) {
      console.warn("[Firebase] Catalog setup error:", setupError);
      if (isMounted.current) {
        setLoading(false);
        setConnected(false);
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
