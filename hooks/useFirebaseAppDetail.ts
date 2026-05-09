import { useState, useEffect, useRef } from "react";
import { ref, onValue, type DataSnapshot } from "firebase/database";
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
};

function safeStringArray(val: unknown): string[] | undefined {
  try {
    if (!Array.isArray(val)) return undefined;
    const filtered = val.filter((v) => typeof v === "string");
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

            const mirrorLinks = Array.isArray(raw.mirrorLinks)
              ? (raw.mirrorLinks as DownloadLink[]).filter(
                  (l) => l && typeof l.link === "string",
                )
              : undefined;

            const seeMoreMods = Array.isArray(raw.seeMoreMods)
              ? (raw.seeMoreMods as SeeMoreMod[]).filter(
                  (m) => m && typeof m.slug === "string",
                )
              : undefined;

            setDetail({
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
              mirrorLinks: mirrorLinks?.length ? mirrorLinks : undefined,
              seeMoreMods: seeMoreMods?.length ? seeMoreMods : undefined,
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
            });

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

    return () => {
      isMounted.current = false;
      try {
        unsubscribe?.();
      } catch {}
    };
  }, [slug]);

  return { detail, loading, connected };
}
