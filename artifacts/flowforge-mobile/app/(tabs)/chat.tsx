import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { useIngestChat, useListShipments } from "@workspace/api-client-react";
import type { Shipment } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

type Channel = "whatsapp" | "wechat" | "imessage" | "sms" | "email";

function getChannelIcon(id: Channel, color: string) {
  const size = 16;
  switch (id) {
    case "whatsapp": return <MaterialCommunityIcons name="whatsapp" size={size} color={color} />;
    case "wechat": return <MaterialCommunityIcons name="wechat" size={size} color={color} />;
    case "imessage": return <Feather name="message-circle" size={size} color={color} />;
    case "sms": return <Feather name="message-square" size={size} color={color} />;
    case "email": return <Feather name="mail" size={size} color={color} />;
  }
}

const CHANNEL_COLORS: Record<Channel, string> = {
  whatsapp: "#25D366",
  wechat: "#09B83E",
  imessage: "#007AFF",
  sms: "#5856D6",
  email: "#FF6B35",
};

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "wechat", label: "WeChat" },
  { id: "imessage", label: "iMessage" },
  { id: "sms", label: "SMS" },
  { id: "email", label: "Email" },
];

interface AttachedFile {
  uri: string;
  name: string;
  type: "image" | "file";
  mimeType?: string;
  size?: number;
}

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const textRef = useRef<TextInput>(null);

  const params = useLocalSearchParams<{
    sharedText?: string;
    sharedImageUri?: string;
    preSelectedShipmentId?: string;
    preSelectedShipmentName?: string;
  }>();

  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [rawText, setRawText] = useState(params.sharedText ?? "");
  const [senderHint, setSenderHint] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(
    params.sharedImageUri
      ? { uri: params.sharedImageUri, name: "Shared Image", type: "image" }
      : null,
  );
  const [selectedShipment, setSelectedShipment] = useState<{ id: number; name: string } | null>(
    params.preSelectedShipmentId
      ? { id: Number(params.preSelectedShipmentId), name: params.preSelectedShipmentName ?? `Shipment #${params.preSelectedShipmentId}` }
      : null,
  );
  const [showShipmentPicker, setShowShipmentPicker] = useState(false);
  const [shipmentSearch, setShipmentSearch] = useState("");

  const { data: shipments } = useListShipments();
  const { mutate: ingestChat, isPending } = useIngestChat();

  useEffect(() => {
    if (params.sharedText && params.sharedText !== rawText) {
      setRawText(params.sharedText);
    }
  }, [params.sharedText]);

  useEffect(() => {
    if (params.preSelectedShipmentId) {
      setSelectedShipment({
        id: Number(params.preSelectedShipmentId),
        name: params.preSelectedShipmentName ?? `Shipment #${params.preSelectedShipmentId}`,
      });
    }
  }, [params.preSelectedShipmentId, params.preSelectedShipmentName]);

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
    .slice(0, 20);

  const canSubmit = (rawText.trim().length > 5 || attachedFile != null) && !isPending;

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      Haptics.selectionAsync();
      setAttachedFile({
        uri: asset.uri,
        name: asset.fileName ?? "image.jpg",
        type: "image",
        mimeType: asset.mimeType ?? "image/jpeg",
        size: asset.fileSize,
      });
    }
  }

  async function handlePickFile() {
    if (Platform.OS === "web") {
      Alert.alert("File picker", "File picking is available on iOS and Android.");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        Haptics.selectionAsync();
        setAttachedFile({
          uri: asset.uri,
          name: asset.name,
          type: "file",
          mimeType: asset.mimeType ?? "application/octet-stream",
          size: asset.size,
        });
      }
    } catch {
      Alert.alert("Error", "Could not open file picker.");
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const textToAnalyze = rawText.trim() || (attachedFile ? `[Attached file: ${attachedFile.name}]` : "");

    ingestChat(
      {
        data: {
          rawText: textToAnalyze,
          channel: channel as any,
          senderHint: senderHint.trim() || undefined,
        },
      },
      {
        onSuccess: (result) => {
          router.push({
            pathname: "/routing-result" as any,
            params: {
              result: JSON.stringify(result),
              rawText: textToAnalyze,
              channel,
              senderHint: senderHint.trim(),
              preSelectedShipmentId: selectedShipment ? String(selectedShipment.id) : "",
              attachedFileName: attachedFile?.name ?? "",
              attachedFileMimeType: attachedFile?.mimeType ?? "",
            },
          });
        },
        onError: () => {
          Alert.alert("Analysis failed", "Could not analyze your message. Please try again.");
        },
      },
    );
  }

  function handleClear() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRawText("");
    setSenderHint("");
    setAttachedFile(null);
    setSelectedShipment(null);
  }

  const c = colors;
  const hasContent = rawText.length > 0 || attachedFile != null;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 12),
            backgroundColor: c.primary,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>FlowForge</Text>
            <Text style={styles.headerSubtitle}>Capture</Text>
          </View>
          {hasContent && (
            <Pressable
              onPress={handleClear}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              testID="clear-button"
            >
              <Feather name="x" size={22} color="rgba(255,255,255,0.85)" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Channel selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>SOURCE CHANNEL</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.channelRow}>
            {CHANNELS.map(({ id, label }) => {
              const active = channel === id;
              const ch = CHANNEL_COLORS[id];
              return (
                <Pressable
                  key={id}
                  onPress={() => { setChannel(id); Haptics.selectionAsync(); }}
                  style={[
                    styles.channelPill,
                    {
                      borderColor: active ? ch : c.border,
                      backgroundColor: active ? `${ch}18` : c.card,
                    },
                  ]}
                  testID={`channel-${id}`}
                >
                  {getChannelIcon(id, active ? ch : c.mutedForeground)}
                  <Text
                    style={[
                      styles.channelLabel,
                      { color: active ? ch : c.mutedForeground, fontWeight: active ? "600" : "400" },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Text input */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>PASTE OR TYPE MESSAGE</Text>
          <Pressable onPress={() => textRef.current?.focus()}>
            <View style={[styles.textAreaWrapper, { backgroundColor: c.card, borderColor: c.border }]}>
              <TextInput
                ref={textRef}
                style={[styles.textArea, { color: c.foreground }]}
                value={rawText}
                onChangeText={setRawText}
                multiline
                placeholder={`Paste your ${CHANNELS.find((ch) => ch.id === channel)?.label ?? "chat"} export or type a message…\n\nE.g.:\n[06/10/26, 10:22] Supplier: Production is 85% done, ETA ex-factory 25 June.`}
                placeholderTextColor={c.mutedForeground}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                testID="capture-input"
              />
              {rawText.length > 0 && (
                <Text style={[styles.charCount, { color: c.mutedForeground }]}>
                  {rawText.length} chars
                </Text>
              )}
            </View>
          </Pressable>
        </View>

        {/* File/photo attachment */}
        <View style={styles.attachRow}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>ATTACH</Text>
          <View style={styles.attachBtns}>
            <Pressable
              onPress={handlePickImage}
              style={({ pressed }) => [
                styles.attachBtn,
                { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
              testID="pick-image-button"
            >
              <Feather name="image" size={16} color={c.primary} />
              <Text style={[styles.attachBtnText, { color: c.foreground }]}>Photo</Text>
            </Pressable>
            <Pressable
              onPress={handlePickFile}
              style={({ pressed }) => [
                styles.attachBtn,
                { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
              testID="pick-file-button"
            >
              <Feather name="paperclip" size={16} color={c.primary} />
              <Text style={[styles.attachBtnText, { color: c.foreground }]}>File</Text>
            </Pressable>
          </View>
        </View>

        {attachedFile && (
          <Animated.View
            entering={FadeInDown.duration(250)}
            style={[styles.attachedCard, { backgroundColor: c.card, borderColor: c.primary + "40" }]}
          >
            <Feather name={attachedFile.type === "image" ? "image" : "file"} size={16} color={c.primary} />
            <Text style={[styles.attachedName, { color: c.foreground }]} numberOfLines={1}>
              {attachedFile.name}
            </Text>
            {attachedFile.size != null && (
              <Text style={[styles.attachedSize, { color: c.mutedForeground }]}>
                {(attachedFile.size / 1024).toFixed(0)} KB
              </Text>
            )}
            <Pressable onPress={() => setAttachedFile(null)} hitSlop={8}>
              <Feather name="x" size={14} color={c.mutedForeground} />
            </Pressable>
          </Animated.View>
        )}

        {/* Sender hint */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
            SENDER HINT <Text style={{ fontWeight: "400" }}>(optional)</Text>
          </Text>
          <View style={[styles.hintInput, { backgroundColor: c.card, borderColor: c.border }]}>
            <Feather name="user" size={16} color={c.mutedForeground} />
            <TextInput
              style={[styles.hintText, { color: c.foreground }]}
              value={senderHint}
              onChangeText={setSenderHint}
              placeholder="Supplier or contact name…"
              placeholderTextColor={c.mutedForeground}
              autoCapitalize="words"
              returnKeyType="done"
              testID="sender-hint"
            />
          </View>
        </View>

        {/* Shipment selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
            SHIPMENT <Text style={{ fontWeight: "400" }}>(optional — helps routing)</Text>
          </Text>

          {selectedShipment ? (
            <Pressable
              onPress={() => setShowShipmentPicker((v) => !v)}
              style={[styles.selectedShipment, { backgroundColor: c.accent, borderColor: c.primary + "60" }]}
              testID="selected-shipment"
            >
              <Feather name="package" size={15} color={c.primary} />
              <Text style={[styles.selectedShipmentText, { color: c.accentForeground }]} numberOfLines={1}>
                {selectedShipment.name}
              </Text>
              <Pressable
                onPress={(e) => { e.stopPropagation(); setSelectedShipment(null); }}
                hitSlop={8}
              >
                <Feather name="x" size={14} color={c.accentForeground} />
              </Pressable>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => { setShowShipmentPicker((v) => !v); Haptics.selectionAsync(); }}
              style={({ pressed }) => [
                styles.shipmentPickerToggle,
                { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.8 : 1 },
              ]}
              testID="shipment-picker-toggle"
            >
              <Feather name="search" size={15} color={c.mutedForeground} />
              <Text style={[styles.shipmentPickerPlaceholder, { color: c.mutedForeground }]}>
                Search shipments…
              </Text>
              <Feather name={showShipmentPicker ? "chevron-up" : "chevron-down"} size={15} color={c.mutedForeground} />
            </Pressable>
          )}

          {showShipmentPicker && (
            <Animated.View entering={FadeInDown.duration(200)}>
              <View style={[styles.shipmentSearchWrap, { backgroundColor: c.card, borderColor: c.border }]}>
                <Feather name="search" size={14} color={c.mutedForeground} />
                <TextInput
                  style={[styles.shipmentSearchInput, { color: c.foreground }]}
                  value={shipmentSearch}
                  onChangeText={setShipmentSearch}
                  placeholder="PO number, product, supplier…"
                  placeholderTextColor={c.mutedForeground}
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
              <View style={[styles.shipmentDropdown, { backgroundColor: c.card, borderColor: c.border }]}>
                {filteredShipments.length === 0 ? (
                  <Text style={[styles.noShipmentsText, { color: c.mutedForeground }]}>No shipments found</Text>
                ) : (
                  filteredShipments.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedShipment({ id: s.id, name: `PO ${s.poNumber} — ${s.product}` });
                        setShowShipmentPicker(false);
                        setShipmentSearch("");
                      }}
                      style={({ pressed }) => [
                        styles.shipmentOption,
                        { borderTopColor: c.border, opacity: pressed ? 0.7 : 1 },
                      ]}
                      testID={`shipment-option-${s.id}`}
                    >
                      <View style={styles.shipmentOptionLeft}>
                        <Text style={[styles.shipmentOptionPo, { color: c.foreground }]}>PO {s.poNumber}</Text>
                        <Text style={[styles.shipmentOptionProduct, { color: c.mutedForeground }]} numberOfLines={1}>
                          {s.product}
                        </Text>
                      </View>
                      {s.supplierName && (
                        <Text style={[styles.shipmentOptionSupplier, { color: c.mutedForeground }]} numberOfLines={1}>
                          {s.supplierName}
                        </Text>
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Submit button */}
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: canSubmit ? c.primary : c.muted,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          testID="submit-button"
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color={canSubmit ? "#fff" : c.mutedForeground} />
              <Text style={[styles.submitBtnText, { color: canSubmit ? "#fff" : c.mutedForeground }]}>
                Submit for Routing
              </Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.footerNote, { color: c.mutedForeground }]}>
          AI will extract details and route to the best-matching shipment
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 1, letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  channelRow: { flexDirection: "row", gap: 8, paddingRight: 4 },
  channelPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  channelLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  textAreaWrapper: { borderRadius: 12, borderWidth: 1, padding: 14, minHeight: 140 },
  textArea: { fontSize: 14, lineHeight: 21, minHeight: 110, fontFamily: "Inter_400Regular" },
  charCount: { fontSize: 11, marginTop: 8, textAlign: "right", fontFamily: "Inter_400Regular" },
  attachRow: { gap: 8 },
  attachBtns: { flexDirection: "row", gap: 10 },
  attachBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12 },
  attachBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  attachedCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1.5 },
  attachedName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  attachedSize: { fontSize: 12, fontFamily: "Inter_400Regular" },
  hintInput: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  hintText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  selectedShipment: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  selectedShipmentText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  shipmentPickerToggle: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  shipmentPickerPlaceholder: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  shipmentSearchWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderRadius: 10, marginBottom: 6 },
  shipmentSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  shipmentDropdown: { borderRadius: 12, borderWidth: 1, overflow: "hidden", maxHeight: 220 },
  shipmentOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, gap: 8 },
  shipmentOptionLeft: { flex: 1 },
  shipmentOptionPo: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  shipmentOptionProduct: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  shipmentOptionSupplier: { fontSize: 12, fontFamily: "Inter_400Regular", maxWidth: 100 },
  noShipmentsText: { padding: 16, fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 4 },
  submitBtnText: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  footerNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 17, marginTop: -4 },
});
