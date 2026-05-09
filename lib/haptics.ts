import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "@aa_mods_prefs_v1";
let _enabled = true;

function _load() {
  AsyncStorage.getItem(PREFS_KEY)
    .then((raw) => {
      if (raw) {
        const p = JSON.parse(raw) as { hapticsEnabled?: boolean };
        _enabled = p.hapticsEnabled !== false;
      }
    })
    .catch(() => {});
}

_load();

export function refreshHapticsPreference(): void {
  _load();
}

export const haptics = {
  light: (): void => {
    if (Platform.OS === "web" || !_enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: (): void => {
    if (Platform.OS === "web" || !_enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  selection: (): void => {
    if (Platform.OS === "web" || !_enabled) return;
    Haptics.selectionAsync().catch(() => {});
  },
};
