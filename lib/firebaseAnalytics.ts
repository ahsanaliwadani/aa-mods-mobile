import AsyncStorage from "@react-native-async-storage/async-storage";

const MEASUREMENT_ID = "G-SEFN4WE4PT";
const API_SECRET = process.env.EXPO_PUBLIC_GA4_API_SECRET ?? "";
const GA4_URL = `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;
const CLIENT_ID_KEY = "@aa_mods_ga4_client_id_v1";
const SESSION_ID_KEY = "@aa_mods_ga4_session_id_v1";

type QueuedEvent = {
  name: string;
  params?: Record<string, string | number | boolean | null>;
};

let _clientId: string | null = null;
let _sessionId: number = Date.now();
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

    // Session ID: regenerate each app launch (not persisted across sessions)
    const storedSession = await AsyncStorage.getItem(SESSION_ID_KEY).catch(() => null);
    _sessionId = storedSession ? parseInt(storedSession, 10) : Date.now();
    await AsyncStorage.setItem(SESSION_ID_KEY, String(_sessionId)).catch(() => {});
  } catch {
    _clientId = genUuid();
    _sessionId = Date.now();
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

  if (!API_SECRET) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.log(`[Analytics:native] ${name}`, params ?? {});
    }
    return;
  }

  try {
    const response = await fetch(GA4_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: _clientId,
        events: [
          {
            name,
            params: {
              engagement_time_msec: 100,
              session_id: _sessionId,
              ...(params ?? {}),
            },
          },
        ],
      }),
    });

    if (typeof __DEV__ !== "undefined" && __DEV__ && !response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`[Analytics:native] GA4 error for "${name}" (${response.status}):`, text);
    }
  } catch {
    // Network error — silently ignore, analytics must never crash the app
  }
}

// Bootstrap async — fires immediately so queue drains fast
initClientId().catch(() => {
  _clientId = genUuid();
  _sessionId = Date.now();
  _ready = true;
});

export function logAnalyticsEvent(
  event: string,
  params?: Record<string, string | number | boolean | null>,
): void {
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
