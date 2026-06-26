import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

const STATUS_COLOR: Record<string, string> = {
  "on-track": "#22c55e",
  "at-risk": "#f59e0b",
  delayed: "#e63946",
  completed: "#596a7c",
};

const STATUS_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  "on-track": "check-circle",
  "at-risk": "alert-triangle",
  delayed: "alert-circle",
  completed: "archive",
};

function formatStage(shipment: Shipment): string {
  const s = shipment.status ?? "in-progress";
  if (s === "on-track") return "On Track";
  if (s === "at-risk") return "At Risk";
  if (s === "delayed") return "Delayed";
  if (s === "completed") return "Completed";
  return s;
}

interface ShipmentCardProps {
  shipment: Shipment;
  onPress: () => void;
}

function ShipmentCard({ shipment, onPress }: ShipmentCardProps) {
  const colors = useColors();
  const statusColor = STATUS_COLOR[shipment.status ?? ""] ?? "#596a7c";
  const statusIcon = STATUS_ICON[shipment.status ?? ""] ?? "package";

  return (
    <Animated.View entering={FadeInDown.duration(250).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        testID={`shipment-card-${shipment.id}`}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconWrap, { backgroundColor: `${statusColor}18` }]}>
            <Feather name={statusIcon} size={18} color={statusColor} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={[styles.poNumber, { color: colors.foreground }]} numberOfLines={1}>
              PO {shipment.poNumber}
            </Text>
            <Text style={[styles.product, { color: colors.mutedForeground }]} numberOfLines={1}>
              {shipment.product}
            </Text>
          </View>
          <View style={styles.captureHint}>
            <Feather name="zap" size={14} color={colors.primary} />
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{formatStage(shipment)}</Text>
          </View>
          {shipment.supplierName != null && (
            <View style={[styles.supplierPill, { backgroundColor: colors.accent }]}>
              <Feather name="users" size={11} color={colors.accentForeground} />
              <Text style={[styles.supplierLabel, { color: colors.accentForeground }]} numberOfLines={1}>
                {shipment.supplierName}
              </Text>
            </View>
          )}
          {shipment.buyerPoNumber && (
            <Text style={[styles.buyerPo, { color: colors.mutedForeground }]} numberOfLines={1}>
              Buyer: {shipment.buyerPoNumber}
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth() as any;

  const { data: shipments, isLoading, isRefetching, refetch, isError } = useListShipments();

  const activeShipments = (shipments ?? []).filter(
    (s) => s.status !== "completed",
  ).slice(0, 20);

  function handleShipmentPress(shipment: Shipment) {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(tabs)/chat" as any,
      params: {
        preSelectedShipmentId: String(shipment.id),
        preSelectedShipmentName: `PO ${shipment.poNumber} — ${shipment.product}`,
      },
    });
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            backgroundColor: colors.primary,
          },
        ]}
      >
        <Text style={styles.headerTitle}>FlowForge</Text>
        <Text style={styles.headerSubtitle}>Active Shipments</Text>
      </View>

      {isLoading && !isRefetching && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading shipments…</Text>
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Could not load shipments</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && activeShipments.length === 0 && (
        <View style={styles.center}>
          <Feather name="package" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No active shipments</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Active shipments will appear here. Use the Capture tab to submit messages.
          </Text>
        </View>
      )}

      {!isError && (
        <FlatList
          data={activeShipments}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 16) },
          ]}
          renderItem={({ item }) => (
            <ShipmentCard
              shipment={item}
              onPress={() => handleShipmentPress(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            !isLoading && activeShipments.length > 0 ? (
              <View style={[styles.hintBanner, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                <Feather name="zap" size={13} color={colors.primary} />
                <Text style={[styles.hintText, { color: colors.accentForeground }]}>
                  Tap a shipment to pre-select it when capturing a message
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 1, letterSpacing: 0.3 },
  list: { paddingHorizontal: 16, paddingTop: 14 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardMeta: { flex: 1 },
  poNumber: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  product: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  captureHint: { padding: 4 },
  cardBottom: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  statusLabel: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  supplierPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, maxWidth: 140 },
  supplierLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  buyerPo: { fontSize: 11, fontFamily: "Inter_400Regular" },
  hintBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  hintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
