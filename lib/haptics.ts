import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export const haptics = {
  light: (): void => {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium: (): void => {
    if (Platform.OS === "web") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  selection: (): void => {
    if (Platform.OS === "web") return;
    Haptics.selectionAsync().catch(() => {});
  },
};
