import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const INBOX_KEY = "@aa_mods_notif_inbox_v1";
const MAX_ITEMS = 50;

export type NotifType =
  | "onesignal"
  | "download_start"
  | "download_done"
  | "download_error"
  | "update_available"
  | "new_app"
  | "installed_update"
  | "general";

export interface NotificationInboxItem {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  type: NotifType;
  data?: Record<string, unknown>;
  timestamp: number;
  read: boolean;
}

interface NotificationInboxContextType {
  items: NotificationInboxItem[];
  unreadCount: number;
  loaded: boolean;
  addItem: (item: Omit<NotificationInboxItem, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeItem: (id: string) => void;
  clearAll: () => void;
}

const NotificationInboxContext = createContext<NotificationInboxContextType | null>(null);

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function persist(items: NotificationInboxItem[]): void {
  AsyncStorage.setItem(INBOX_KEY, JSON.stringify(items)).catch(() => {});
}

export function NotificationInboxProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationInboxItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const itemsRef = useRef<NotificationInboxItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(INBOX_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed)) {
              const valid = parsed as NotificationInboxItem[];
              itemsRef.current = valid;
              setItems(valid);
            }
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const addItem = useCallback(
    (item: Omit<NotificationInboxItem, "id" | "timestamp" | "read">) => {
      const newItem: NotificationInboxItem = {
        ...item,
        id: generateId(),
        timestamp: Date.now(),
        read: false,
      };
      setItems((prev) => {
        const next = [newItem, ...prev].slice(0, MAX_ITEMS);
        itemsRef.current = next;
        persist(next);
        return next;
      });
    },
    [],
  );

  const markRead = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
      itemsRef.current = next;
      persist(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, read: true }));
      itemsRef.current = next;
      persist(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      itemsRef.current = next;
      persist(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    itemsRef.current = [];
    AsyncStorage.removeItem(INBOX_KEY).catch(() => {});
  }, []);

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <NotificationInboxContext.Provider
      value={{ items, unreadCount, loaded, addItem, markRead, markAllRead, removeItem, clearAll }}
    >
      {children}
    </NotificationInboxContext.Provider>
  );
}

export function useNotificationInbox(): NotificationInboxContextType {
  const ctx = useContext(NotificationInboxContext);
  if (!ctx) throw new Error("useNotificationInbox must be used within NotificationInboxProvider");
  return ctx;
}
