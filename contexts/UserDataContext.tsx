import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "@aa_mods_favorites_v2";
const RECENT_KEY = "@aa_mods_recently_viewed_v2";
const MAX_RECENT = 12;

type UserDataContextType = {
  favorites: string[];
  toggleFavorite: (slug: string) => void;
  isFavorite: (slug: string) => boolean;
  clearFavorites: () => void;
  recentSlugs: string[];
  addRecentlyViewed: (slug: string) => void;
  clearRecentlyViewed: () => void;
  loaded: boolean;
};

const UserDataContext = createContext<UserDataContextType | null>(null);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(FAVORITES_KEY),
      AsyncStorage.getItem(RECENT_KEY),
    ])
      .then(([favVal, recentVal]) => {
        if (favVal) {
          const p = JSON.parse(favVal) as unknown;
          if (Array.isArray(p)) setFavorites(p as string[]);
        }
        if (recentVal) {
          const p = JSON.parse(recentVal) as unknown;
          if (Array.isArray(p)) setRecentSlugs(p as string[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites((prev) => {
      const next = prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [slug, ...prev];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (slug: string) => favorites.includes(slug),
    [favorites],
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    AsyncStorage.removeItem(FAVORITES_KEY).catch(() => {});
  }, []);

  const addRecentlyViewed = useCallback((slug: string) => {
    setRecentSlugs((prev) => {
      const filtered = prev.filter((s) => s !== slug);
      const next = [slug, ...filtered].slice(0, MAX_RECENT);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentSlugs([]);
    AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  }, []);

  const value = useMemo(() => ({
    favorites,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    recentSlugs,
    addRecentlyViewed,
    clearRecentlyViewed,
    loaded,
  }), [favorites, toggleFavorite, isFavorite, clearFavorites, recentSlugs, addRecentlyViewed, clearRecentlyViewed, loaded]);

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserData(): UserDataContextType {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used within UserDataProvider");
  return ctx;
}
