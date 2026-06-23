import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIngestChat, useGetInboundEmailAddress } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import * as Clipboard from "expo-clipboard";

type Channel = "whatsapp" | "wechat" | "imessage" | "sms";

function getChannelIcon(id: Channel, color: string) {
  const size = 16;
  switch (id) {
    case "whatsapp":
      return <MaterialCommunityIcons name="whatsapp" size={size} color={color} />;
    case "wechat":
      return <MaterialCommunityIcons name="wechat" size={size} color={color} />;
    case "imessage":
      return <Feather name="message-circle" size={size} color={color} />;
    case "sms":
      return <Feather name="message-square" size={size} color={color} />;
  }
}

const CHANNEL_COLORS: Record<Channel, string> = {
  whatsapp: "#25D366",
  wechat: "#09B83E",
  imessage: "#007AFF",
  sms: "#5856D6",
};

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "wechat", label: "WeChat" },
  { id: "imessage", label: "iMessage" },
  { id: "sms", label: "SMS" },
];

function ConfidenceBar({ confidence, colors: c, label }: { confidence: number; colors: ReturnType<typeof useColors>; label: string }) {
  const pct = Math.round(confidence * 100);
  const barColor = pct >= 75 ? c.success : pct >= 50 ? c.warning : c.destructive;
  return (
    <View>
      <View style={styles.confidenceRow}>
        <Text style={[styles.label, { color: c.mutedForeground }]}>{label}</Text>
        <Text style={[styles.confidenceValue, { color: barColor }]}>{pct}%</Text>
      </View>
      <View style={[styles.confidenceTrack, { backgroundColor: c.muted }]}>
        <View style={[styles.confidenceFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

function FieldRow({ label, value, colors: c }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: c.foreground }]}>{value}</Text>
    </View>
  );
}

export default function ChatPasteScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useTranslation();
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [rawText, setRawText] = useState("");
  const [senderHint, setSenderHint] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);
  const textRef = useRef<TextInput>(null);

  const { data: inboundEmailData } = useGetInboundEmailAddress();
  const inboundEmail = inboundEmailData?.inboundEmailAddress ?? "iq@flowforgeiq.com";

  async function handleCopyEmail() {
    await Clipboard.setStringAsync(inboundEmail);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  const { mutate: ingestChat, isPending, data: result, error, reset } = useIngestChat();

  const canAnalyze = rawText.trim().length > 10 && !isPending;

  function handleAnalyze() {
    if (!canAnalyze) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    ingestChat({
      data: {
        rawText: rawText.trim(),
        channel,
        senderHint: senderHint.trim() || undefined,
      },
    });
  }

  function handleClear() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRawText("");
    setSenderHint("");
    reset();
  }

  async function handleCopyDraft() {
    if (!result?.aiDraft) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await Share.share({ message: result.aiDraft });
    } catch {
      Alert.alert(t("chat.copyFailed"), t("chat.copyFailedDesc"));
    }
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
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>FlowForge</Text>
            <Text style={styles.headerSubtitle}>{t("chat.headerSubtitle")}</Text>
          </View>
          {(rawText.length > 0 || result) && (
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
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("chat.source")}</Text>
          <View style={styles.channelRow}>
            {CHANNELS.map(({ id, label }) => {
              const active = channel === id;
              const ch = CHANNEL_COLORS[id];
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    setChannel(id);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.channelPill,
                    {
                      borderColor: active ? ch : colors.border,
                      backgroundColor: active ? `${ch}18` : colors.card,
                    },
                  ]}
                  testID={`channel-${id}`}
                >
                  {getChannelIcon(id, active ? ch : colors.mutedForeground)}
                  <Text
                    style={[
                      styles.channelLabel,
                      { color: active ? ch : colors.mutedForeground, fontWeight: active ? "600" : "400" },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("chat.pasteChat")}</Text>
          <Pressable onPress={() => textRef.current?.focus()}>
            <View
              style={[
                styles.textAreaWrapper,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <TextInput
                ref={textRef}
                style={[styles.textArea, { color: colors.foreground }]}
                value={rawText}
                onChangeText={setRawText}
                multiline
                placeholder={t("chat.pastePlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
                testID="chat-input"
              />
              {rawText.length > 0 && (
                <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                  {t("chat.charCount", { count: rawText.length })}
                </Text>
              )}
            </View>
          </Pressable>
        </View>

        <View style={[styles.emailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.emailCardHeader}>
            <Feather name="mail" size={14} color={colors.primary} />
            <Text style={[styles.emailCardTitle, { color: colors.foreground }]}>{t("chat.forwardInbox")}</Text>
          </View>
          <Text style={[styles.emailCardBody, { color: colors.mutedForeground }]}>
            {t("chat.forwardDesc")}
          </Text>
          <View style={[styles.emailRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.emailText, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
              {inboundEmail}
            </Text>
            <Pressable
              onPress={() => void handleCopyEmail()}
              hitSlop={8}
              style={({ pressed }) => [styles.copyBtn, { backgroundColor: pressed ? colors.muted : colors.accent }]}
            >
              <Feather name={emailCopied ? "check" : "copy"} size={14} color={emailCopied ? "#22c55e" : colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            {t("chat.senderHint")} <Text style={{ fontWeight: "400" }}>{t("chat.senderHintOptional")}</Text>
          </Text>
          <View
            style={[
              styles.hintInput,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="user" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.hintText, { color: colors.foreground }]}
              value={senderHint}
              onChangeText={setSenderHint}
              placeholder={t("chat.senderPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
              returnKeyType="done"
              testID="sender-hint"
            />
          </View>
        </View>

        <Pressable
          onPress={handleAnalyze}
          disabled={!canAnalyze}
          style={({ pressed }) => [
            styles.analyzeBtn,
            {
              backgroundColor: canAnalyze ? colors.primary : colors.muted,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          testID="analyze-button"
        >
          {isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons
                name="flash"
                size={18}
                color={canAnalyze ? "#fff" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.analyzeBtnText,
                  { color: canAnalyze ? "#fff" : colors.mutedForeground },
                ]}
              >
                {t("chat.analyze")}
              </Text>
            </>
          )}
        </Pressable>

        {error && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.errorCard, { backgroundColor: `${colors.destructive}18`, borderColor: colors.destructive }]}
          >
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {(error as Error)?.message ?? t("chat.analysisError")}
            </Text>
          </Animated.View>
        )}

        {result && !isPending && (
          <Animated.View entering={FadeInDown.duration(350).springify()} style={styles.results}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      result.routingStatus === "routed"
                        ? `${colors.success}20`
                        : `${colors.warning}20`,
                  },
                ]}
              >
                <Ionicons
                  name={result.routingStatus === "routed" ? "checkmark-circle" : "alert-circle"}
                  size={14}
                  color={result.routingStatus === "routed" ? colors.success : colors.warning}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        result.routingStatus === "routed" ? colors.success : colors.warning,
                    },
                  ]}
                >
                  {result.routingStatus === "routed" ? t("chat.routed") : t("chat.needsReview")}
                </Text>
              </View>
              {result.sender && (
                <Text style={[styles.senderText, { color: colors.mutedForeground }]}>
                  {t("chat.from", { sender: result.sender })}
                </Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ConfidenceBar confidence={result.confidence} colors={colors} label={t("chat.confidence")} />
              {result.matchMethod && (
                <Text style={[styles.matchMethod, { color: colors.mutedForeground }]}>
                  {t("chat.match", { method: result.matchMethod })}
                </Text>
              )}
            </View>

            {result.shipmentId != null && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Feather name="package" size={15} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("chat.matchedShipment")}</Text>
                </View>
                <Text style={[styles.shipmentId, { color: colors.primary }]}>
                  ID #{result.shipmentId}
                </Text>
              </View>
            )}

            {result.extractedFields && Object.values(result.extractedFields).some(Boolean) && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Feather name="layers" size={15} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("chat.extractedFields")}</Text>
                </View>
                <View style={[styles.fieldsDivider, { backgroundColor: colors.border }]} />
                {result.extractedFields.eta && (
                  <FieldRow label={t("chat.field.eta")} value={result.extractedFields.eta} colors={colors} />
                )}
                {result.extractedFields.quotePrice != null && (
                  <FieldRow
                    label={t("chat.field.quotePrice")}
                    value={`$${result.extractedFields.quotePrice.toLocaleString()}`}
                    colors={colors}
                  />
                )}
                {result.extractedFields.productionPct != null && (
                  <FieldRow
                    label={t("chat.field.production")}
                    value={`${result.extractedFields.productionPct}%`}
                    colors={colors}
                  />
                )}
                {result.extractedFields.qcNote && (
                  <FieldRow label={t("chat.field.qcNote")} value={result.extractedFields.qcNote} colors={colors} />
                )}
                {result.extractedFields.statusUpdate && (
                  <FieldRow
                    label={t("chat.field.status")}
                    value={result.extractedFields.statusUpdate}
                    colors={colors}
                  />
                )}
              </View>
            )}

            {result.aiTags && result.aiTags.length > 0 && (
              <View style={styles.tagsRow}>
                {result.aiTags.map((tag, i) => (
                  <View key={i} style={[styles.tag, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.tagText, { color: colors.accentForeground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {result.aiAction && (
              <View style={[styles.actionCard, { backgroundColor: colors.accent, borderColor: colors.primary + "40" }]}>
                <Ionicons name="flash" size={14} color={colors.primary} />
                <Text style={[styles.actionText, { color: colors.accentForeground }]}>
                  {result.aiAction}
                </Text>
              </View>
            )}

            {result.aiDraft && (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeader}>
                    <Feather name="edit-3" size={15} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("chat.aiDraftReply")}</Text>
                  </View>
                  <Pressable
                    onPress={handleCopyDraft}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    testID="copy-draft"
                  >
                    <Feather name="share" size={16} color={colors.primary} />
                  </Pressable>
                </View>
                <View style={[styles.draftDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.draftText, { color: colors.foreground }]}>{result.aiDraft}</Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#ffffff", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", marginTop: 1, letterSpacing: 0.3 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.8, fontFamily: "Inter_600SemiBold" },
  channelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  channelPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  channelLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  textAreaWrapper: { borderRadius: 12, borderWidth: 1, padding: 14, minHeight: 160 },
  textArea: { fontSize: 14, lineHeight: 21, minHeight: 130, fontFamily: "Inter_400Regular" },
  charCount: { fontSize: 11, marginTop: 8, textAlign: "right", fontFamily: "Inter_400Regular" },
  hintInput: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  hintText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 4 },
  analyzeBtnText: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  results: { gap: 12, marginTop: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  senderText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  confidenceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  confidenceValue: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  confidenceTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  confidenceFill: { height: 6, borderRadius: 3 },
  matchMethod: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  shipmentId: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  fieldsDivider: { height: 1, marginVertical: 2 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 5 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  fieldValue: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium", flex: 2, textAlign: "right" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actionCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  actionText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  draftDivider: { height: 1, marginVertical: 2 },
  draftText: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  emailCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  emailCardHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  emailCardTitle: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emailCardBody: { fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  emailRow: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  emailText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  copyBtn: { borderRadius: 6, padding: 6 },
});
