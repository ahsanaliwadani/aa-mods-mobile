import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useNotificationInbox, type NotificationInboxItem, type NotifType } from "@/contexts/NotificationInboxContext";
import { haptics } from "@/lib/haptics";

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function typeIcon(type: NotifType): { name: string; color: string; bg: string } {
  switch (type) {
    case "download_done":
      return { name: "checkmark-circle", color: "#00e673", bg: "rgba(0,230,115,0.12)" };
    case "download_start":
      return { name: "arrow-down-circle", color: "#22d3ee", bg: "rgba(34,211,238,0.12)" };
    case "download_error":
      return { name: "close-circle", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    case "update_available":
    case "installed_update":
      return { name: "refresh-circle", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" };
    case "new_app":
      return { name: "sparkles", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" };
    case "onesignal":
    default:
      return { name: "notifications", color: "#22d3ee", bg: "rgba(34,211,238,0.12)" };
  }
}

function NotifCard({
  item,
  onRead,
  onRemove,
}: {
  item: NotificationInboxItem;
  onRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const colors = useColors();
  const { name, color, bg } = typeIcon(item.type);

  return (
    <Pressable
      onPress={() => { haptics.light(); onRead(item.id); }}
      style={({ pressed }) => [
        iStyles.card,
        {
          backgroundColor: item.read ? colors.card : `${colors.card}`,
          borderColor: item.read ? colors.border : color + "44",
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {!item.read && <View style={[iStyles.unreadDot, { backgroundColor: color }]} />}
      <View style={[iStyles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={name as "apps"} size={20} color={color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={iStyles.cardTopRow}>
          <Text
            style={[
              iStyles.cardTitle,
              { color: item.read ? colors.mutedForeground : colors.foreground },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[iStyles.cardTime, { color: colors.mutedForeground }]}>
            {timeAgo(item.timestamp)}
          </Text>
        </View>
        <Text style={[iStyles.cardBody, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      <Pressable
        onPress={() => { haptics.selection(); onRemove(item.id); }}
        hitSlop={12}
        style={iStyles.deleteBtn}
      >
        <Ionicons name="close" size={14} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

export default function InboxScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const { items, unreadCount, markRead, markAllRead, removeItem, clearAll } = useNotificationInbox();

  const handleRemove = useCallback(
    (id: string) => { removeItem(id); },
    [removeItem],
  );

  const handleRead = useCallback(
    (id: string) => { markRead(id); },
    [markRead],
  );

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Notifications",
      "Remove all notifications from the inbox?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => { haptics.medium(); clearAll(); },
        },
      ],
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: NotificationInboxItem }) => (
      <NotifCard item={item} onRead={handleRead} onRemove={handleRemove} />
    ),
    [handleRead, handleRemove],
  );

  const keyExtractor = useCallback((item: NotificationInboxItem) => item.id, []);

  return (
    <View style={[iStyles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          iStyles.header,
          { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [iStyles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={iStyles.headerCenter}>
          <Text style={[iStyles.headerTitle, { color: colors.foreground }]}>Notification Inbox</Text>
          {unreadCount > 0 && (
            <View style={[iStyles.headerBadge, { backgroundColor: colors.primary }]}>
              <Text style={iStyles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={iStyles.headerActions}>
          {unreadCount > 0 && (
            <Pressable
              onPress={() => { haptics.light(); markAllRead(); }}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="checkmark-done-outline" size={22} color={colors.accent} />
            </Pressable>
          )}
          {items.length > 0 && (
            <Pressable
              onPress={handleClearAll}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          iStyles.listContent,
          { paddingBottom: bottomInset + 32 },
          items.length === 0 && iStyles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListEmptyComponent={
          <View style={iStyles.emptyWrap}>
            <View style={[iStyles.emptyIconWrap, { backgroundColor: "rgba(34,211,238,0.08)", borderColor: "rgba(34,211,238,0.18)" }]}>
              <Ionicons name="notifications-off-outline" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[iStyles.emptyTitle, { color: colors.foreground }]}>No notifications yet</Text>
            <Text style={[iStyles.emptyBody, { color: colors.mutedForeground }]}>
              Push notifications from AA Mods and download alerts will appear here.
            </Text>
          </View>
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <Text style={[iStyles.listHeader, { color: colors.mutedForeground }]}>
              {items.length} notification{items.length !== 1 ? "s" : ""}
              {unreadCount > 0 ? ` · ${unreadCount} unread` : " · all read"}
            </Text>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const iStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerBadge: {
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  headerBadgeText: { color: "#04131b", fontSize: 10, fontWeight: "800", fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  listContent: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: "center" },
  listHeader: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  emptyWrap: { alignItems: "center", gap: 14, paddingVertical: 48, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    left: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cardTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  cardBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  deleteBtn: { alignSelf: "flex-start", paddingTop: 2 },
});
