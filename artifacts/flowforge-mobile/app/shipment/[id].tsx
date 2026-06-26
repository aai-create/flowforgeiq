import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListShipments, useListMessages } from "@workspace/api-client-react";
import type { Message } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

const STATUS_COLOR: Record<string, string> = {
  "on-track": "#22c55e",
  "at-risk": "#f59e0b",
  delayed: "#e63946",
  completed: "#596a7c",
};

const STATUS_LABEL: Record<string, string> = {
  "on-track": "On Track",
  "at-risk": "At Risk",
  delayed: "Delayed",
  completed: "Completed",
};

const CHANNEL_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  whatsapp: "message-circle",
  wechat: "message-circle",
  imessage: "message-circle",
  sms: "message-square",
  email: "mail",
  default: "message-square",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function formatCurrency(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

interface InfoRowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  icon?: keyof typeof Feather.glyphMap;
}

function InfoRow({ label, value, colors, icon }: InfoRowProps) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.labelWrap}>
        {icon && <Feather name={icon} size={13} color={colors.mutedForeground} />}
        <Text style={[rowStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[rowStyles.value, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, gap: 12 },
  labelWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold", maxWidth: "60%", textAlign: "right" },
});

interface MessageRowProps {
  message: Message;
  colors: ReturnType<typeof useColors>;
  isLast: boolean;
}

function MessageRow({ message, colors, isLast }: MessageRowProps) {
  const channelIcon = CHANNEL_ICON[message.channel] ?? CHANNEL_ICON.default;
  const isInbound = message.direction === "inbound";

  return (
    <View style={[msgStyles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[msgStyles.iconWrap, { backgroundColor: colors.accent }]}>
        <Feather name={channelIcon} size={14} color={colors.primary} />
      </View>
      <View style={msgStyles.body}>
        <View style={msgStyles.topRow}>
          <Text style={[msgStyles.sender, { color: colors.foreground }]} numberOfLines={1}>
            {isInbound ? message.sender : (message.recipient ?? "You")}
          </Text>
          <Text style={[msgStyles.time, { color: colors.mutedForeground }]}>
            {formatRelative(message.receivedAt)}
          </Text>
        </View>
        <Text style={[msgStyles.snippet, { color: colors.mutedForeground }]} numberOfLines={2}>
          {message.snippet || message.fullBody?.slice(0, 120) || "—"}
        </Text>
      </View>
      {message.unread && (
        <View style={[msgStyles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </View>
  );
}

const msgStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 1 },
  body: { flex: 1 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  sender: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  snippet: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shipmentId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const { data: shipments, isLoading: shipmentsLoading, isError: shipmentsError } = useListShipments();
  const { data: allMessages, isLoading: messagesLoading } = useListMessages();

  const shipment = (shipments ?? []).find((s) => s.id === shipmentId) ?? null;

  const recentMessages = (allMessages ?? [])
    .filter((m) => m.shipmentId === shipmentId)
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 5);

  const statusColor = STATUS_COLOR[shipment?.status ?? ""] ?? "#596a7c";
  const statusLabel = STATUS_LABEL[shipment?.status ?? ""] ?? (shipment?.status ?? "—");

  function handleCapturePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(tabs)/chat" as any,
      params: {
        preSelectedShipmentId: String(shipmentId),
        preSelectedShipmentName: shipment
          ? `PO ${shipment.poNumber} — ${shipment.product}`
          : `Shipment #${shipmentId}`,
      },
    });
  }

  if (shipmentsLoading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading shipment…</Text>
      </View>
    );
  }

  if (shipmentsError || !shipment) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={32} color={colors.destructive} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Shipment not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const hasSpread = shipment.spreadUsd != null && shipment.spreadPct != null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12), backgroundColor: colors.primary },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            testID="back-button"
          >
            <Feather name="arrow-left" size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              PO {shipment.poNumber}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {shipment.product}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}30` }]}>
            <Text style={[styles.statusText, { color: "#fff" }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(250)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.cardHeader}>
            <Feather name="package" size={15} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Shipment Info</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Supplier" value={shipment.supplierName} colors={colors} icon="users" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Supplier PO" value={shipment.poNumber} colors={colors} icon="tag" />
          {shipment.buyerPoNumber && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <InfoRow label="Buyer PO" value={shipment.buyerPoNumber} colors={colors} icon="shopping-bag" />
            </>
          )}
          {shipment.category && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <InfoRow label="Category" value={shipment.category} colors={colors} icon="grid" />
            </>
          )}
          {shipment.quantity != null && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <InfoRow label="Quantity" value={shipment.quantity.toLocaleString()} colors={colors} icon="hash" />
            </>
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(260).delay(40)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.cardHeader}>
            <Feather name="calendar" size={15} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Timeline</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Due Date" value={formatDate(shipment.dueDate)} colors={colors} icon="clock" />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="Ex-Factory" value={formatDate(shipment.exFactoryDate)} colors={colors} icon="truck" />
          {shipment.destination && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <InfoRow label="Destination" value={shipment.destination} colors={colors} icon="map-pin" />
            </>
          )}
          {shipment.via && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <InfoRow label="Via" value={shipment.via} colors={colors} icon="navigation" />
            </>
          )}
        </Animated.View>

        {hasSpread && (
          <Animated.View
            entering={FadeInDown.duration(260).delay(80)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.cardHeader}>
              <Feather name="trending-up" size={15} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Spread / Margin</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.spreadRow}>
              <View style={styles.spreadItem}>
                <Text style={[styles.spreadLabel, { color: colors.mutedForeground }]}>Spread</Text>
                <Text style={[styles.spreadValue, { color: shipment.spreadUsd! >= 0 ? colors.success ?? "#22c55e" : colors.destructive }]}>
                  {formatCurrency(shipment.spreadUsd!)}
                </Text>
              </View>
              <View style={[styles.spreadDivider, { backgroundColor: colors.border }]} />
              <View style={styles.spreadItem}>
                <Text style={[styles.spreadLabel, { color: colors.mutedForeground }]}>Margin</Text>
                <Text style={[styles.spreadValue, { color: shipment.spreadPct! >= 0 ? colors.success ?? "#22c55e" : colors.destructive }]}>
                  {shipment.spreadPct!.toFixed(1)}%
                </Text>
              </View>
              {shipment.buyerUnitPrice != null && (
                <>
                  <View style={[styles.spreadDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.spreadItem}>
                    <Text style={[styles.spreadLabel, { color: colors.mutedForeground }]}>Buyer Price</Text>
                    <Text style={[styles.spreadValue, { color: colors.foreground }]}>
                      ${shipment.buyerUnitPrice.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.duration(260).delay(hasSpread ? 120 : 80)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.cardHeader}>
            <Feather name="message-square" size={15} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Recent Messages</Text>
            {messagesLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} />}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {!messagesLoading && recentMessages.length === 0 && (
            <View style={styles.emptyMessages}>
              <Feather name="inbox" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No messages yet for this shipment
              </Text>
            </View>
          )}

          {recentMessages.map((msg, i) => (
            <MessageRow
              key={msg.id}
              message={msg}
              colors={colors}
              isLast={i === recentMessages.length - 1}
            />
          ))}
        </Animated.View>

        {shipment.notes && (
          <Animated.View
            entering={FadeInDown.duration(260).delay(160)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.cardHeader}>
              <Feather name="file-text" size={15} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.notes, { color: colors.foreground }]}>{shipment.notes}</Text>
          </Animated.View>
        )}
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 16 : 8),
          },
        ]}
      >
        <Pressable
          onPress={handleCapturePress}
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="capture-cta"
        >
          <Feather name="zap" size={18} color="#fff" />
          <Text style={styles.ctaBtnText}>Capture for this Shipment</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  errorTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  backBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  header: { paddingBottom: 18, paddingHorizontal: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  divider: { height: 1 },
  spreadRow: { flexDirection: "row", marginTop: 4 },
  spreadItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
  spreadDivider: { width: 1, marginVertical: 4 },
  spreadLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4, letterSpacing: 0.3 },
  spreadValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyMessages: { alignItems: "center", gap: 8, paddingVertical: 20 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, paddingTop: 10 },
  ctaBar: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  ctaBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
