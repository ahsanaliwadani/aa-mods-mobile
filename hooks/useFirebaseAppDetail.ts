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

export type AppFacts = {
  architecture?: string;
  contentRating?: string;
  requirement?: string;
  safetySummary?: string;
  supportSummary?: string;
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
  appFacts?: AppFacts;
};

/**
 * Parses a changelog value from Firebase.
 * Firebase stores it as a single \n-separated string.
 * Falls back to handling arrays or Firebase numeric-key objects.
 */
function parseChangelog(val: unknown): string[] | undefined {
  if (!val) return undefined;

  // Primary format: single \n-delimited string
  if (typeof val === "string") {
    const lines = val.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
    return lines.length > 0 ? lines : undefined;
  }

  // Fallback: actual JS array of strings
  if (Array.isArray(val)) {
    const filtered = val.filter((v) => typeof v === "string" && v.trim().length > 0) as string[];
    return filtered.length > 0 ? filtered : undefined;
  }

  // Fallback: Firebase object with numeric keys {"0": "...", "1": "..."}
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
    const lines = keys
      .map((k) => obj[k])
      .filter((v): v is string => typeof v === "string" && (v as string).trim().length > 0);
    return lines.length > 0 ? lines : undefined;
  }

  return undefined;
}

/**
 * Parses a string[] value from Firebase.
 * Handles: actual array, or Firebase numeric-key objects.
 */
function safeStringArray(val: unknown): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) {
    const filtered = val.filter((v) => typeof v === "string") as string[];
    return filtered.length > 0 ? filtered : undefined;
  }
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
    const filtered = keys.map((k) => obj[k]).filter((v) => typeof v === "string") as string[];
    return filtered.length > 0 ? filtered : undefined;
  }
  return undefined;
}

/**
 * Parses seeMoreMods from Firebase.
 * Firebase returns a proper JSON array: [{label, slug}, ...]
 */
function parseSeeMoreMods(val: unknown): SeeMoreMod[] | undefined {
  if (!val) return undefined;
  let items: unknown[] = [];
  if (Array.isArray(val)) {
    items = val;
  } else if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
    items = keys.map((k) => obj[k]);
  }
  const filtered = items.filter(
    (m): m is SeeMoreMod =>
      !!m && typeof (m as SeeMoreMod).slug === "string" && typeof (m as SeeMoreMod).label === "string"
  );
  return filtered.length > 0 ? filtered : undefined;
}

/**
 * Parses mirrorLinks from Firebase.
 */
function parseMirrorLinks(val: unknown): DownloadLink[] | undefined {
  if (!val) return undefined;
  let items: unknown[] = [];
  if (Array.isArray(val)) {
    items = val;
  } else if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => Number(a) - Number(b));
    items = keys.map((k) => obj[k]);
  }
  const filtered = items.filter(
    (l): l is DownloadLink => !!l && typeof (l as DownloadLink).link === "string"
  );
  return filtered.length > 0 ? filtered : undefined;
}

/**
 * Parses AppFacts from Firebase appFactsBySlug/{slug}.
 * Structure: { architecture, contentRating, requirement, safetySummary, supportSummary }
 */
function parseAppFacts(val: unknown): AppFacts | undefined {
  if (!val || typeof val !== "object" || Array.isArray(val)) return undefined;
  const raw = val as Record<string, unknown>;
  const facts: AppFacts = {};
  if (typeof raw.architecture === "string" && raw.architecture.trim()) facts.architecture = raw.architecture.trim();
  if (typeof raw.contentRating === "string" && raw.contentRating.trim()) facts.contentRating = raw.contentRating.trim();
  if (typeof raw.requirement === "string" && raw.requirement.trim()) facts.requirement = raw.requirement.trim();
  if (typeof raw.safetySummary === "string" && raw.safetySummary.trim()) facts.safetySummary = raw.safetySummary.trim();
  if (typeof raw.supportSummary === "string" && raw.supportSummary.trim()) facts.supportSummary = raw.supportSummary.trim();
  return Object.keys(facts).length > 0 ? facts : undefined;
}

export function useFirebaseAppDetail(slug: string) {
  const [detail, setDetail] = useState<AppDetailExtra | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    setDetail(null);
    setLoading(true);

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
              changelog: parseChangelog(raw.changelog),
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
              mirrorLinks: parseMirrorLinks(raw.mirrorLinks),
              seeMoreMods: parseSeeMoreMods(raw.seeMoreMods),
              supportEmail:
                typeof raw.supportEmail === "string" ? raw.supportEmail : undefined,
              telegramGroup:
                typeof raw.telegramGroup === "string" ? raw.telegramGroup : undefined,
              androidRequirement:
                typeof raw.androidRequirement === "string" ? raw.androidRequirement : undefined,
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
            if (isMounted.current) setLoading(false);
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

    // Fetch appFacts from appFactsBySlug/{slug}
    const fetchAppFacts = async () => {
      if (!isMounted.current || !slug) return;
      try {
        const factsRef = ref(database, `app_content/appFactsBySlug/${slug}`);
        const snapshot = await get(factsRef);
        if (!isMounted.current) return;
        const appFacts = parseAppFacts(snapshot.val());
        if (appFacts) {
          setDetail((prev) =>
            prev ? { ...prev, appFacts } : { appFacts }
          );
        }
      } catch {}
    };

    fetchAppFacts();

    return () => {
      isMounted.current = false;
      try { unsubscribe?.(); } catch {}
    };
  }, [slug]);

  return { detail, loading, connected };
}
