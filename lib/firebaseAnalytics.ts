import AsyncStorage from "@react-native-async-storage/async-storage";

const MEASUREMENT_ID = "G-SEFN4WE4PT";
const API_SECRET = process.env.EXPO_PUBLIC_GA4_API_SECRET ?? "";
const GA4_URL = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
const CLIENT_ID_KEY = "@aa_mods_ga4_client_id_v1";

type QueuedEvent = {
  name: string;
  params?: Record<string, string | number | boolean | null>;
};

let _clientId: string | null = null;
let _ready = false;
const _queue: QueuedEvent[] = [];

function genUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function initClientId(): Promise<void> {
  try {
    let id = await AsyncStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = genUuid();
      await AsyncStorage.setItem(CLIENT_ID_KEY, id).catch(() => {});
    }
    _clientId = id;
  } catch {
    _clientId = genUuid();
  }
  _ready = true;
  if (_queue.length > 0) {
    const pending = _queue.splice(0);
    for (const ev of pending) {
      sendNow(ev.name, ev.params).catch(() => {});
    }
  }
}

async function sendNow(
  name: string,
  params?: Record<string, string | number | boolean | null>,
): Promise<void> {
  if (!_clientId) return;
  // If no API secret, log to console in dev mode only — events won't reach GA4
  if (!API_SECRET) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log(`[Analytics:native] ${name}`, params ?? {});
    }
    return;
  }
  try {
    await fetch(GA4_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: _clientId,
        events: [
          {
            name,
            params: {
              engagement_time_msec: "1",
              ...(params ?? {}),
            },
          },
        ],
      }),
    });
  } catch {
    // Network error — silently ignore, analytics must never crash the app
  }
}

// Bootstrap async — fires immediately so queue drains fast
initClientId().catch(() => {
  _clientId = genUuid();
  _ready = true;
});

export function logAnalyticsEvent(
  event: string,
  params?: Record<string, string | number | boolean | null>,
): void {
  // This file is only loaded on native (Android/iOS).
  // Web uses firebaseAnalytics.web.ts via Metro/webpack platform resolution.
  try {
    if (!_ready || !_clientId) {
      _queue.push({ name: event, params });
      return;
    }
    sendNow(event, params).catch(() => {});
  } catch {
    // silently ignore
  }
}
