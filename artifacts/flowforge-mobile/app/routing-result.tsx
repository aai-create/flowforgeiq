import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreateMessage, useAssignMessage, useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

interface IngestResult {
  routingStatus: "routed" | "needs-review";
  shipmentId?: number | null;
  confidence: number;
  matchMethod?: string | null;
  sender?: string | null;
  snippet?: string;
  fullBody?: string;
  aiDraft?: string | null;
  aiAction?: string | null;
  aiTags?: string[];
}

function ConfidenceBar({ confidence, colors: c }: { confidence: number; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const pct = Math.round(confidence * 100);
  const barColor = pct >= 75 ? c.success : pct >= 50 ? c.warning : c.destructive;
  return (
    <View style={styles.confRow}>
      <Text style={[styles.confLabel, { color: c.mutedForeground }]}>Confidence</Text>
      <View style={styles.confRight}>
        <View style={[styles.confTrack, { backgroundColor: c.muted }]}>
          <View style={[styles.confFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.confValue, { color: barColor }]}>{pct}%</Text>
      </View>
    </View>
  );
}

export default function RoutingResultScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();

  const params = useLocalSearchParams<{
    result: string;
    rawText: string;
    channel: string;
    senderHint: string;
    preSelectedShipmentId?: string;
    attachedFileName?: string;
    attachedFileMimeType?: string;
  }>();

  let parsedResult: IngestResult | null = null;
  try {
    parsedResult = JSON.parse(params.result ?? "{}") as IngestResult;
  } catch {
    parsedResult = null;
  }

  const result = parsedResult;
  const c = colors;

  const { data: shipments } = useListShipments();
  const { mutate: createMessage, isPending: isSaving } = useCreateMessage();
  const { mutate: assignMessage, isPending: isAssigning } = useAssignMessage();

  const isBusy = isSaving || isAssigning;

  const confidence = result?.confidence ?? 0;
  const isHighConf = confidence >= 0.75 && result?.routingStatus === "routed" && result?.shipmentId != null;
  const isMediumConf = confidence >= 0.4 && confidence < 0.75 && result?.shipmentId != null;
  const isLowConf = !isHighConf && !isMediumConf;

  const [showShipmentChange, setShowShipmentChange] = useState(false);
  const [shipmentSearch, setShipmentSearch] = useState("");
  const [overrideShipmentId, setOverrideShipmentId] = useState<number | null>(null);

  const suggestedShipmentId = overrideShipmentId ?? result?.shipmentId ?? null;

  const filteredShipments = (shipments ?? [])
    .filter((s) => s.status !== "completed")
    .filter((s) => {
      if (!shipmentSearch.trim()) return true;
      const q = shipmentSearch.toLowerCase();
      return (
        s.poNumber?.toLowerCase().includes(q) ||
        s.product?.toLowerCase().includes(q) ||
        s.supplierName?.toLowerCase().includes(q)
      );
    })
    .slice(0, 15);

  const suggestedShipment = suggestedShipmentId
    ? (shipments ?? []).find((s) => s.id === suggestedShipmentId)
    : null;

  function buildMessagePayload(shipmentId: number | null, status: "routed" | "needs-review") {
    const rawText = params.rawText ?? "";
    return {
      data: {
        sender: result?.sender ?? params.senderHint ?? "Unknown",
        channel: params.channel as any,
        snippet: rawText.replace(/\s+/g, " ").trim().slice(0, 200),
        fullBody: rawText,
        rawChatText: rawText,
        shipmentId: shipmentId ?? undefined,
        routingStatus: status,
        routingConfidence: result?.confidence,
        matchMethod: result?.matchMethod ?? undefined,
        aiDraft: result?.aiDraft ?? undefined,
        aiAction: result?.aiAction ?? undefined,
        aiTags: result?.aiTags ?? undefined,
      },
    };
  }

  function navigateBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/chat" as any);
    }
  }

  function handleConfirm(useShipmentId: number | null) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createMessage(buildMessagePayload(useShipmentId, useShipmentId ? "routed" : "needs-review"), {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          useShipmentId ? "Message routed ✓" : "Sent to review queue",
          useShipmentId
            ? "Your message has been saved and linked to the shipment."
            : "Your message has been sent to the web triage queue for review.",
          [{ text: "OK", onPress: navigateBack }],
        );
      },
      onError: () => {
        Alert.alert("Save failed", "Could not save the message. Please try again.");
      },
    });
  }

  function handleNoneOfThese() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    createMessage(buildMessagePayload(null, "needs-review"), {
      onSuccess: () => {
        Alert.alert(
          "Sent to review queue",
          "Your message has been saved and will appear in the web triage queue for manual assignment.",
          [{ text: "OK", onPress: navigateBack }],
        );
      },
      onError: () => {
        Alert.alert("Save failed", "Could not save the message. Please try again.");
      },
    });
  }

  if (!result) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12), backgroundColor: c.primary }]}>
          <Pressable onPress={navigateBack} hitSlop={12} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Routing Result</Text>
        </View>
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: c.mutedForeground }]}>Something went wrong. Please try again.</Text>
          <Pressable onPress={navigateBack} style={[styles.primaryBtn, { backgroundColor: c.primary, marginTop: 16 }]}>
            <Text style={styles.primaryBtnText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            backgroundColor: isHighConf ? c.primary : isMediumConf ? "#d97706" : c.destructive,
          },
        ]}
      >
        <Pressable onPress={navigateBack} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Routing Result</Text>
          <Text style={styles.headerSubtitle}>
            {isHighConf ? "Auto-routed" : isMediumConf ? "Needs confirmation" : "Needs review"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Confidence card */}
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <ConfidenceBar confidence={confidence} colors={c} />
          {result.matchMethod && (
            <Text style={[styles.matchMethod, { color: c.mutedForeground }]}>
              Match: {result.matchMethod}
            </Text>
          )}
          {result.sender && (
            <Text style={[styles.senderLine, { color: c.mutedForeground }]}>
              From: {result.sender}
            </Text>
          )}
        </Animated.View>

        {/* High confidence: auto-routed */}
        {isHighConf && (
          <Animated.View entering={FadeInDown.duration(350).delay(50)}>
            <View style={[styles.card, { backgroundColor: `${c.success}12`, borderColor: `${c.success}40` }]}>
              <View style={styles.resultIconRow}>
                <Ionicons name="checkmark-circle" size={28} color={c.success} />
                <View style={styles.resultTextWrap}>
                  <Text style={[styles.resultTitle, { color: c.foreground }]}>Auto-routed</Text>
                  <Text style={[styles.resultSubtitle, { color: c.mutedForeground }]}>
                    High confidence match — ready to save
                  </Text>
                </View>
              </View>
              {suggestedShipment && (
                <View style={[styles.shipmentTag, { backgroundColor: c.accent }]}>
                  <Feather name="package" size={14} color={c.primary} />
                  <View>
                    <Text style={[styles.shipmentTagPo, { color: c.foreground }]}>
                      PO {suggestedShipment.poNumber}
                    </Text>
                    <Text style={[styles.shipmentTagProduct, { color: c.mutedForeground }]} numberOfLines={1}>
                      {suggestedShipment.product}
                      {suggestedShipment.supplierName ? ` · ${suggestedShipment.supplierName}` : ""}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {!showShipmentChange ? (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => handleConfirm(suggestedShipmentId)}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: c.primary, flex: 1, opacity: pressed ? 0.85 : 1 },
                  ]}
                  testID="confirm-button"
                >
                  {isBusy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>Confirm & Save</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShowShipmentChange(true)}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID="change-shipment-button"
                >
                  <Feather name="edit-2" size={14} color={c.primary} />
                  <Text style={[styles.secondaryBtnText, { color: c.primary }]}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <ShipmentPicker
                shipments={filteredShipments}
                search={shipmentSearch}
                onSearch={setShipmentSearch}
                onSelect={(id) => {
                  setOverrideShipmentId(id);
                  setShowShipmentChange(false);
                  setShipmentSearch("");
                }}
                colors={c}
              />
            )}
          </Animated.View>
        )}

        {/* Medium confidence: confirm or dismiss */}
        {isMediumConf && (
          <Animated.View entering={FadeInDown.duration(350).delay(50)}>
            <View style={[styles.card, { backgroundColor: `${"#d97706"}12`, borderColor: `${"#d97706"}40` }]}>
              <View style={styles.resultIconRow}>
                <Ionicons name="alert-circle" size={28} color="#d97706" />
                <View style={styles.resultTextWrap}>
                  <Text style={[styles.resultTitle, { color: c.foreground }]}>Possible match found</Text>
                  <Text style={[styles.resultSubtitle, { color: c.mutedForeground }]}>
                    Is this the right shipment?
                  </Text>
                </View>
              </View>
              {suggestedShipment && (
                <View style={[styles.shipmentTag, { backgroundColor: c.accent }]}>
                  <Feather name="package" size={14} color={c.primary} />
                  <View>
                    <Text style={[styles.shipmentTagPo, { color: c.foreground }]}>
                      PO {suggestedShipment.poNumber}
                    </Text>
                    <Text style={[styles.shipmentTagProduct, { color: c.mutedForeground }]} numberOfLines={1}>
                      {suggestedShipment.product}
                      {suggestedShipment.supplierName ? ` · ${suggestedShipment.supplierName}` : ""}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {!showShipmentChange ? (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => handleConfirm(suggestedShipmentId)}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: c.primary, flex: 1, opacity: pressed ? 0.85 : 1 },
                  ]}
                  testID="confirm-button"
                >
                  {isBusy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>Yes, confirm</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShowShipmentChange(true)}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  testID="not-this-one-button"
                >
                  <Feather name="search" size={14} color={c.primary} />
                  <Text style={[styles.secondaryBtnText, { color: c.primary }]}>Pick another</Text>
                </Pressable>
              </View>
            ) : (
              <ShipmentPicker
                shipments={filteredShipments}
                search={shipmentSearch}
                onSearch={setShipmentSearch}
                onSelect={(id) => {
                  setOverrideShipmentId(id);
                  setShowShipmentChange(false);
                  setShipmentSearch("");
                }}
                colors={c}
              />
            )}

            <Pressable
              onPress={handleNoneOfThese}
              disabled={isBusy}
              style={({ pressed }) => [styles.noneBtn, { opacity: pressed ? 0.7 : 1 }]}
              testID="none-button"
            >
              <Text style={[styles.noneBtnText, { color: c.mutedForeground }]}>
                None of these — send to web queue
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Low confidence: needs review */}
        {isLowConf && (
          <Animated.View entering={FadeInDown.duration(350).delay(50)}>
            <View style={[styles.card, { backgroundColor: `${c.destructive}10`, borderColor: `${c.destructive}40` }]}>
              <View style={styles.resultIconRow}>
                <Feather name="help-circle" size={28} color={c.destructive} />
                <View style={styles.resultTextWrap}>
                  <Text style={[styles.resultTitle, { color: c.foreground }]}>Low confidence</Text>
                  <Text style={[styles.resultSubtitle, { color: c.mutedForeground }]}>
                    This message couldn't be matched automatically. It will appear in your web triage queue.
                  </Text>
                </View>
              </View>
            </View>

            {!showShipmentChange ? (
              <View style={styles.actionCol}>
                <Pressable
                  onPress={() => setShowShipmentChange(true)}
                  style={({ pressed }) => [
                    styles.outlineBtn,
                    { borderColor: c.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                  testID="pick-shipment-button"
                >
                  <Feather name="search" size={15} color={c.primary} />
                  <Text style={[styles.outlineBtnText, { color: c.primary }]}>Pick a shipment manually</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleConfirm(null)}
                  disabled={isBusy}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    { backgroundColor: c.muted, opacity: pressed ? 0.85 : 1 },
                  ]}
                  testID="send-to-queue-button"
                >
                  {isBusy ? (
                    <ActivityIndicator color={c.foreground} size="small" />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: c.foreground }]}>
                      Send to web triage queue
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <>
                <ShipmentPicker
                  shipments={filteredShipments}
                  search={shipmentSearch}
                  onSearch={setShipmentSearch}
                  onSelect={(id) => {
                    Haptics.selectionAsync();
                    handleConfirm(id);
                  }}
                  colors={c}
                />
                <Pressable
                  onPress={() => setShowShipmentChange(false)}
                  style={[styles.noneBtn]}
                >
                  <Text style={[styles.noneBtnText, { color: c.mutedForeground }]}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        )}

        {/* AI draft preview */}
        {result.aiDraft && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(100)}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <View style={styles.draftHeader}>
              <Feather name="edit-3" size={14} color={c.primary} />
              <Text style={[styles.draftTitle, { color: c.foreground }]}>AI Draft Reply</Text>
            </View>
            <Text style={[styles.draftText, { color: c.mutedForeground }]} numberOfLines={4}>
              {result.aiDraft}
            </Text>
          </Animated.View>
        )}

        {/* Tags */}
        {result.aiTags && result.aiTags.length > 0 && (
          <View style={styles.tagsRow}>
            {result.aiTags.map((tag, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: c.accent }]}>
                <Text style={[styles.tagText, { color: c.accentForeground }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface ShipmentPickerProps {
  shipments: Shipment[];
  search: string;
  onSearch: (v: string) => void;
  onSelect: (id: number) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}

function ShipmentPicker({ shipments, search, onSearch, onSelect, colors: c }: ShipmentPickerProps) {
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.pickerWrap}>
      <View style={[styles.pickerSearch, { backgroundColor: c.card, borderColor: c.border }]}>
        <Feather name="search" size={14} color={c.mutedForeground} />
        <TextInput
          style={[styles.pickerSearchInput, { color: c.foreground }]}
          value={search}
          onChangeText={onSearch}
          placeholder="PO number, product, supplier…"
          placeholderTextColor={c.mutedForeground}
          autoCapitalize="none"
          autoFocus
        />
      </View>
      <View style={[styles.pickerList, { backgroundColor: c.card, borderColor: c.border }]}>
        {shipments.length === 0 ? (
          <Text style={[styles.noShipmentsText, { color: c.mutedForeground }]}>No shipments found</Text>
        ) : (
          shipments.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onSelect(s.id)}
              style={({ pressed }) => [
                styles.pickerOption,
                { borderTopColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerOptionPo, { color: c.foreground }]}>PO {s.poNumber}</Text>
                <Text style={[styles.pickerOptionProduct, { color: c.mutedForeground }]} numberOfLines={1}>
                  {s.product}{s.supplierName ? ` · ${s.supplierName}` : ""}
                </Text>
              </View>
              <Feather name="arrow-right" size={14} color={c.mutedForeground} />
            </Pressable>
          ))
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  confRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  confLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 80 },
  confRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  confTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  confFill: { height: "100%", borderRadius: 3 },
  confValue: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold", width: 36, textAlign: "right" },
  matchMethod: { fontSize: 12, fontFamily: "Inter_400Regular" },
  senderLine: { fontSize: 12, fontFamily: "Inter_400Regular" },
  resultIconRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  resultTextWrap: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resultSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  shipmentTag: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10 },
  shipmentTagPo: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  shipmentTagProduct: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionCol: { gap: 10, marginTop: 12 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  primaryBtnText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold", color: "#fff" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  outlineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14 },
  outlineBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  noneBtn: { alignItems: "center", paddingVertical: 14 },
  noneBtnText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  pickerWrap: { gap: 8, marginTop: 12 },
  pickerSearch: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  pickerSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  pickerList: { borderRadius: 12, borderWidth: 1, overflow: "hidden", maxHeight: 240 },
  pickerOption: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, gap: 8 },
  pickerOptionPo: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  pickerOptionProduct: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  noShipmentsText: { padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  draftHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  draftTitle: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  draftText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
