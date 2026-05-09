import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { getLocalIcon } from "@/lib/appIconMap";

type AppIconProps = {
  uri?: string;
  overrideUri?: string;
  slug?: string;
  size?: number;
  borderRadius?: number;
  iconSize?: number;
};

export const AppIcon = React.memo(function AppIcon({
  uri,
  overrideUri,
  slug,
  size = 56,
  borderRadius = 14,
  iconSize,
}: AppIconProps) {
  const colors = useColors();
  const fallbackIconSize = iconSize ?? Math.round(size * 0.5);

  const localSource = slug ? getLocalIcon(slug) : undefined;

  const imageSource: { uri: string } | number | undefined = overrideUri
    ? { uri: overrideUri }
    : localSource !== undefined
      ? localSource
      : uri && uri.startsWith("http")
        ? { uri }
        : undefined;

  if (imageSource !== undefined) {
    return (
      <Image
        source={imageSource}
        style={{
          width: size,
          height: size,
          borderRadius,
          borderWidth: 1.5,
          borderColor: colors.border,
        }}
        contentFit="cover"
        transition={150}
        recyclingKey={overrideUri ?? (slug ?? uri)}
        cachePolicy="memory-disk"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.muted,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="cube-outline" size={fallbackIconSize} color={colors.primary} />
    </View>
  );
});
