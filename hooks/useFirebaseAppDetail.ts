import { useState, useEffect, useRef } from "react";
import { ref, onValue, get, type DataSnapshot } from "firebase/database";
import { database } from "@/lib/firebase";

export type DownloadLink = {
  label: string;
  link: string;
};

export type SeeMoreMod = {
  label: string;
  slug: string;
};

export type AppDetailExtra = {
  changelog?: string[];
  whatsNew?: string[];
  note?: string;
  longDescription?: string;
  blogMarkdown?: string;
  mirrorLinks?: DownloadLink[];
  seeMoreMods?: SeeMoreMod[];
  supportEmail?: string;
  telegramGroup?: string;
  androidRequirement?: string;
  fileSize?: string;
  latestVersion?: string;
  screenshots?: string[];
  permissions?: string[];
  features?: string[];
  appFacts?: string[];
};

function safeStringArray(val: unknown): string[] | undefined {
  try {
    if (Array.isArray(val)) {
      const filtered = val.filter((v) => typeof v === "string");
      return filtered.length > 0 ? filtered : undefined;
    }
    // Firebase RTDB stores arrays as objects with numeric keys: {"0": "...", "1": "..."}
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
      const filtered = keys.map((k) => obj[k]).filter((v) => typeof v === "string") as string[];
      return filtered.length > 0 ? filtered : undefined;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function safeSeeMoreMods(val: unknown): SeeMoreMod[] | undefined {
  try {
    let items: unknown[] = [];
    if (Array.isArray(val)) {
      items = val;
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
      items = keys.map((k) => obj[k]);
    }
    const filtered = items.filter(
      (m): m is SeeMoreMod => !!m && typeof (m as SeeMoreMod).slug === "string"
    );
    return filtered.length > 0 ? filtered : undefined;
  } catch {
    return undefined;
  }
}

function safeMirrorLinks(val: unknown): DownloadLink[] | undefined {
  try {
    let items: unknown[] = [];
    if (Array.isArray(val)) {
      items = val;
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
      items = keys.map((k) => obj[k]);
    }
    const filtered = items.filter(
      (l): l is DownloadLink => !!l && typeof (l as DownloadLink).link === "string"
    );
    return filtered.length > 0 ? filtered : undefined;
  } catch {
    return undefined;
  }
}

export function useFirebaseAppDetail(slug: string) {
  const [detail, setDetail] = useState<AppDetailExtra | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    if (!slug) {
      setLoading(false);
      return () => { isMounted.current = false; };
    }

    let unsubscribe: (() => void) | undefined;

    try {
      const appRef = ref(database, `app_content/apps/${slug}`);

      unsubscribe = onValue(
        appRef,
        (snapshot: DataSnapshot) => {
          if (!isMounted.current) return;
          try {
            const raw = snapshot.val() as Record<string, unknown> | null;

            if (!raw) {
              setDetail(null);
              setLoading(false);
              setConnected(true);
              return;
            }

            setDetail((prev) => ({
              ...prev,
              changelog: safeStringArray(raw.changelog),
              whatsNew: safeStringArray(raw.whatsNew),
              note: typeof raw.note === "string" ? raw.note : undefined,
              longDescription:
                typeof raw.longDescription === "string"
                  ? raw.longDescription
                  : typeof raw.description === "string"
                    ? raw.description
                    : undefined,
              blogMarkdown:
                typeof raw.blogMarkdown === "string" ? raw.blogMarkdown : undefined,
              mirrorLinks: safeMirrorLinks(raw.mirrorLinks),
              seeMoreMods: safeSeeMoreMods(raw.seeMoreMods),
              supportEmail:
                typeof raw.supportEmail === "string" ? raw.supportEmail : undefined,
              telegramGroup:
                typeof raw.telegramGroup === "string"
                  ? raw.telegramGroup
                  : undefined,
              androidRequirement:
                typeof raw.androidRequirement === "string"
                  ? raw.androidRequirement
                  : undefined,
              fileSize:
                typeof raw.fileSize === "string" ? raw.fileSize : undefined,
              latestVersion:
                typeof raw.latestVersion === "string"
                  ? raw.latestVersion
                  : typeof raw.version === "string"
                    ? raw.version
                    : undefined,
              screenshots: safeStringArray(raw.screenshots),
              permissions: safeStringArray(raw.permissions),
              features: safeStringArray(raw.features),
            }));

            setLoading(false);
            setConnected(true);
          } catch (parseError) {
            console.warn("[Firebase] AppDetail parse error:", parseError);
            if (isMounted.current) {
              setLoading(false);
            }
          }
        },
        (error) => {
          console.warn("[Firebase] AppDetail error:", error.message);
          if (isMounted.current) {
            setLoading(false);
            setConnected(false);
          }
        },
      );
    } catch (setupError) {
      console.warn("[Firebase] AppDetail setup error:", setupError);
      if (isMounted.current) {
        setLoading(false);
        setConnected(false);
      }
    }

    // Fetch appFacts separately from appFactsBySlug
    const fetchAppFacts = async () => {
      if (!isMounted.current) return;
      try {
        const factsRef = ref(database, `app_content/appFactsBySlug/${slug}`);
        const snapshot = await get(factsRef);
        if (!isMounted.current) return;
        const raw = snapshot.val();
        if (raw) {
          const facts = safeStringArray(raw);
          if (facts) {
            setDetail((prev) => prev ? { ...prev, appFacts: facts } : { appFacts: facts });
          }
        }
      } catch {}
    };

    fetchAppFacts();

    return () => {
      isMounted.current = false;
      try {
        unsubscribe?.();
      } catch {}
    };
  }, [slug]);

  return { detail, loading, connected };
}
